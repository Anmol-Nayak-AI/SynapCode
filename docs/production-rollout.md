# SynapCode production rollout

This guide turns the current no-secret vertical slice into a multi-tenant production service. Do the stages in order: identity establishes the tenant boundary, persistence stores immutable snapshots inside that boundary, durable jobs move repository analysis off the request path, and evaluation measures the resulting agent.

## Implementation status

The repository now contains the application-side implementation for every stage:

- Clerk provider, Next.js proxy, sign-in/up pages, organization switcher, resource authorization, and verified webhook handler
- Public landing, protected workspace routing, automatic active-organization onboarding, and Clerk organization management
- Clerk organization pricing plus server-side Free/paid entitlement enforcement
- Supabase organization/member synchronization, immutable graph snapshots, analysis job state, agent history, and RLS migrations
- Inngest event client, durable analysis function, idempotency, retries, status endpoint, and dashboard polling
- OpenAI structured output with evidence validation and source-redacted LangSmith tracing
- A starter evaluation dataset, deterministic evidence tests, CI, and production build checks
- Authenticated workspace hydration for repositories, immutable snapshot history, jobs, members, and recent agent runs
- Browser-persisted repository workspaces when production identity and persistence are intentionally disabled

The unchecked work is account-side: creating or connecting service projects, entering secrets, applying migrations, registering webhook/function URLs, and deploying.

## 1. Accounts and secrets

Create development projects in Clerk, Supabase, Inngest, LangSmith, OpenAI, GitHub, and Vercel. Copy `.env.example` to `.env.local`; never commit the populated file.

Required production variables:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/start
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/start
CLERK_BILLING_ENABLED=false

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

GITHUB_TOKEN=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini

INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

LANGSMITH_API_KEY=
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=synapcode
```

Use separate projects and secrets for local, preview, and production environments.

## 2. Clerk organizations

1. Enable Organizations in Clerk and require organization membership for the B2B app.
2. Enable automatic creation of the first organization to reduce onboarding friction.
3. Add Clerk's `proxy.ts` integration for Next.js 16, but perform authorization again in every Route Handler that accesses tenant data.
4. Add sign-in/sign-up routes and an `OrganizationSwitcher` to the application shell.
5. Require both `userId` and `orgId` in protected server operations. Never accept an organization ID from a request body as proof of access.
6. Add a Clerk webhook endpoint for `organization.created`, `organization.updated`, `organization.deleted`, `organizationMembership.created`, `organizationMembership.updated`, and `organizationMembership.deleted`.
7. Verify the webhook signature before synchronizing `organizations` and `organization_members`. Make handlers idempotent by upserting on `clerk_org_id` and the membership primary key.

Keep `/api/webhooks/clerk` publicly reachable at the routing layer; the verified webhook signature is its authentication.

The `/start` route handles the first-session race: it selects an existing membership or creates the user's first workspace, activates it in the Clerk session, and sends the user to `/dashboard`. The data layer can provision that same verified organization synchronously if its webhook has not arrived yet.

## 2.1 Clerk Billing

Use Clerk's development gateway to test organization subscriptions. SynapCode is configured as an international, USD-billed SaaS. For production checkout, the Clerk and connected Stripe business must be registered in a country currently supported by Clerk Billing; confirm the current country availability before launch.

1. In Clerk Dashboard, open **Billing → Subscription plans → Plans for Organizations** and enable Billing.
2. Keep the default public Free plan: one repository, three analyses per month, dependency graphs, and the deterministic investigator.
3. Create a public `pro` plan at `$19/month` with features `unlimited_analyses` and `ai_investigator`.
4. Create a public `business` plan at `$49/month` with the same access features plus your Business-facing team features.
5. Use Clerk's shared development gateway while testing. Enable annual prices or trials in Clerk if desired.
6. Set `CLERK_BILLING_ENABLED=true` only after those plans and features are published.
7. Visit `/pricing` with an active organization, complete a test checkout, and verify the paid entitlements on `/dashboard`.

`POST /api/repositories` checks `org:unlimited_analyses` before bypassing Free limits. The OpenAI path checks `org:ai_investigator`; other organizations use the deterministic investigator.

## 3. Clerk + Supabase and RLS

Use Supabase's current Third-Party Auth integration for Clerk. Do not create the deprecated Clerk JWT template or share the Supabase JWT secret.

1. In Clerk, use **Connect with Supabase**.
2. In Supabase Authentication settings, add Clerk under Third-Party Auth.
3. Configure the browser Supabase client with Clerk's session access token callback.
4. Install and link the Supabase CLI, then apply the tracked migration:

```bash
npx supabase login
npx supabase link
npx supabase db push
```

5. Generate database types and commit them:

```bash
npx supabase gen types typescript --linked > src/types/database.generated.ts
```

6. Add a repository service that always resolves the organization from the verified Clerk session before querying Supabase.
7. Persist each completed analysis as one immutable `graph_snapshots` row keyed by `(repository_id, commit_sha)`.
8. Store only repository metadata in `repositories`; never store GitHub installation access tokens in PostgreSQL plaintext.

Before release, test RLS with two users in different organizations. Each user must receive zero rows—not an application-filtered result—when querying the other tenant's repositories, snapshots, and agent runs.

## 4. Durable repository jobs

The current `/api/github` endpoint is intentionally synchronous. Replace its heavy work with an Inngest durable function:

```text
POST /api/repositories
  └─ authorize user + active organization
  └─ create repository / analysis record with status "queued"
  └─ send synapcode/repository.analysis.requested

Inngest function
  ├─ resolve immutable commit SHA
  ├─ fetch bounded repository tree
  ├─ download source batches with retry
  ├─ parse AST and build graph
  ├─ calculate cycles, impact metadata, and health
  ├─ upsert immutable graph snapshot
  └─ mark analysis "completed" or "failed"
```

Use separate durable steps for commit resolution, download, parsing, and persistence. Give each event a stable idempotency key such as `repositoryId:commitSha`. Add retry policies only to network and database steps; parser failures caused by invalid source should become terminal errors with a safe user-facing message.

The UI should poll a lightweight status endpoint or subscribe to Supabase Realtime. Never keep the browser request open for the full analysis.

## 5. Agent tracing and LangSmith evaluation

Trace every investigation with these fields:

- organization ID, repository ID, snapshot ID, and commit SHA
- prompt version and model name
- permitted graph-tool inputs and outputs
- returned evidence paths
- latency, token usage, estimated cost, and terminal error category

Do not trace repository source text, secrets, GitHub tokens, or personal data by default.

Create a versioned offline dataset with questions such as:

```json
{
  "question": "What breaks if src/lib/auth.ts changes?",
  "expectedEvidence": ["src/lib/auth.ts", "src/components/user-menu.tsx"],
  "expectedRisk": "medium"
}
```

Start with deterministic code evaluators:

- evidence paths exist in the selected snapshot
- cited dependency paths are connected in the graph
- no uncited file path appears in the answer
- requested tool arguments reference valid module IDs
- structured response passes its schema

Then add an LLM judge for explanation clarity and usefulness. Run offline regression evaluations in CI when the prompt, model, graph tools, or parser changes. Add sampled online evaluation in production and promote confirmed failures into the offline dataset.

## 6. Deployment

Push the repository to GitHub and import it into Vercel, or use the CLI:

```bash
npx vercel link
npx vercel env pull .env.local
npx vercel deploy
npx vercel logs --level error
npx vercel deploy --prod
```

Add all secrets through Vercel project settings, scoped independently to Development, Preview, and Production. After the production URL exists:

1. Add it to Clerk's allowed origins and redirect URLs.
2. Point the Clerk webhook at `https://your-domain/api/webhooks/clerk`.
3. Configure the Inngest production app endpoint.
4. Restrict GitHub App callback and webhook URLs to the production domain.
5. Run the smoke test below with a real organization and a small repository.
6. Verify the chosen production payment provider and complete an end-to-end checkout test.

Keep Vercel Authentication set to **Preview only**. Production must be public so customers can reach Clerk sign-in and Clerk webhooks, while preview deployments remain restricted to collaborators.

## 7. Release gate

- New user can sign in, create/select an organization, and invite a member.
- Signed-out requests to `/dashboard` and analysis APIs are rejected before tenant data is read.
- Free limits return an upgrade response; paid entitlements unlock unlimited analysis and the OpenAI investigator.
- Cross-organization read/write attempts fail at the database policy layer.
- Repository analysis survives a process restart and retries transient GitHub failures.
- Re-analyzing the same commit does not create a duplicate snapshot.
- Agent responses cite only graph-valid evidence.
- LangSmith regression scores meet the committed thresholds.
- GitHub, Clerk, OpenAI, Supabase, Inngest, and LangSmith secrets never reach the client bundle or logs.
- `npm run check` and `npm run build` pass in CI.
- Preview deployment and production deployment both pass smoke tests.
