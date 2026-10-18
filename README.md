# SynapCode

SynapCode is an agentic code-intelligence platform that turns TypeScript and JavaScript repositories into a verified dependency graph. The AST establishes the facts; AI only explains those facts.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tests](https://img.shields.io/badge/tests-Vitest-6e9f18)

## What works now

- Interactive React Flow architecture graph with Dagre layout, minimap, zoom, and module inspection
- `ts-morph` parsing of static and dynamic imports without executing repository code
- Transitive change-impact analysis, evidence paths, circular-dependency detection, and health scoring
- Bounded GitHub ingestion through the GitHub REST API (250 files, file-size limits, no `git clone`)
- Evidence-grounded repository investigator with structured OpenAI output and a deterministic no-key fallback
- Production database schema with immutable commit snapshots, analysis jobs, and tenant-isolating Supabase RLS
- Clerk organization switching, resource authorization, and verified webhook synchronization
- Public landing, protected `/dashboard`, automatic first-organization onboarding, invitation/member management, and explicit sign-in/up redirects
- Clerk organization billing with a Free tier, paid plan previews, and server-enforced entitlements
- Durable Inngest repository analysis with retries, idempotency, persisted status, and UI polling
- LangSmith tracing with source-redacted inputs plus deterministic evidence evaluation
- Responsive demo experience that runs with no accounts or secrets
- Dynamic repository workspace with saved repository switching, immutable snapshot history, resumed job polling, and browser persistence when account services are disabled
- Live organization members, recent investigator history, service-readiness status, and partial-analysis warnings
- Alias-aware dependency parsing for relative imports, `@/` and `~/` source aliases, re-exports, dynamic imports, and CommonJS `require()` calls

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The public landing page links to `/dashboard`. When Clerk is not configured, the dashboard runs an explicit local-development workspace and retains analyzed snapshots in that browser. Once Clerk is configured, `/dashboard` requires a signed-in user and active organization; repositories, snapshots, jobs, members, and investigator history hydrate from that tenant.

To enable external services:

```bash
cp .env.example .env.local
```

For the production account flow, Clerk and Supabase are required. `GITHUB_TOKEN` increases GitHub API limits; `OPENAI_API_KEY` enables model-generated investigations for organizations entitled to the `ai_investigator` feature. Without a paid entitlement or OpenAI key, the deterministic investigator remains available.

When the production services are configured, run the app and Inngest development server in separate terminals:

```bash
npm run dev
npm run dev:inngest
```

## Quality gates

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run eval:agent
```

## Architecture

```text
Browser / React Flow
        │
        ├── /sign-in → /start → active Clerk organization → /dashboard
        ├── /pricing ────────── Clerk organization Billing
        ├── POST /api/github ── GitHub REST ── immutable commit SHA
        ├── POST /api/analyze ─ bounded virtual source files
        └── POST /api/agent ─── deterministic graph tools / OpenAI
                                      │
                              ts-morph parser
                                      │
                        dependency graph + impact engine
                                      │
                         Supabase snapshots + RLS (opt-in)
```

The GitHub endpoint downloads only text blobs selected from the repository tree. It does not run package scripts, evaluate source, or pass repository-controlled URLs to the network layer. Analysis inputs are capped by count and byte size.

## Database and identity

Apply [`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql) to a Supabase project. Connect Clerk using Supabase Third-Party Auth; do not use the deprecated custom JWT-template integration. The RLS policies resolve tenant membership from Clerk's authenticated `sub` claim; service-role credentials must only be used in trusted server jobs.

The dashboard deliberately stays in local-development mode only when Clerk is absent. Once Clerk keys are present, protected pages and analysis APIs require a verified user and active organization. Supabase provisioning uses the verified Clerk organization, and the webhook remains the durable synchronization mechanism.

Follow [`docs/production-rollout.md`](docs/production-rollout.md) for the ordered Clerk, Supabase, durable-jobs, LangSmith, and Vercel rollout.

## API examples

Analyze supplied files:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H 'content-type: application/json' \
  -d '{"repository":"demo/app","files":[{"path":"src/a.ts","content":"import './b'"},{"path":"src/b.ts","content":"export const b = 1"}]}'
```

Analyze GitHub:

```bash
curl -X POST http://localhost:3000/api/github \
  -H 'content-type: application/json' \
  -d '{"repository":"vercel/swr","ref":"main"}'
```

## Production status

The application-side landing, login/onboarding, organization management, billing entitlements, dynamic workspace, tenant retrieval, durable job flow, snapshot persistence, and grounded investigation history are implemented. Production still depends on account-side configuration for Clerk, Clerk Billing (or a supported payment provider), Supabase, Inngest, OpenAI, LangSmith, and GitHub. Additional scale gates include GitHub App installation tokens for private repositories, distributed rate limiting, larger-repository ingestion, and deletion/export workflows.
