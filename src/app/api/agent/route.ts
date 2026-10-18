import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { traceable } from "langsmith/traceable";
import { getCurrentRunTree } from "langsmith/traceable";
import { investigateLocally, validateEvidence } from "@/lib/agent/investigate";
import { getBillingAccess, getRequestContext, isAuthenticationRequired } from "@/lib/auth/context";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { findOrganizationId, persistAgentRun } from "@/lib/supabase/repositories";
import type { GraphSnapshot } from "@/types/graph";

const schema = z.object({
  question: z.string().trim().min(3).max(500),
  snapshot: z.object({
    snapshotId: z.string().uuid().optional(),
    repository: z.string(), branch: z.string(), commit: z.string(), analyzedAt: z.string(), healthScore: z.number(), truncated: z.boolean().optional(),
    modules: z.array(z.object({ id: z.string(), path: z.string(), label: z.string(), kind: z.enum(["page", "component", "service", "hook", "config", "utility", "test"]), imports: z.number(), importedBy: z.number(), loc: z.number().optional() })).max(400),
    edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string(), type: z.enum(["static", "dynamic"]) })).max(2000),
    cycles: z.array(z.array(z.string())),
  }),
});

const investigateWithOpenAI = traceable(async ({ question, snapshot }: { question: string; snapshot: GraphSnapshot }) => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const compactGraph = {
    modules: snapshot.modules.map(({ id, path, kind, imports, importedBy }) => ({ id, path, kind, imports, importedBy })),
    edges: snapshot.edges.map(({ source, target, type }) => ({ source, target, type })),
    cycles: snapshot.cycles,
    truncated: snapshot.truncated ?? false,
  };
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    instructions: "You are SynapCode's repository investigator. Answer only from the supplied dependency graph; you do not have file contents. Cite exact file paths as evidence. Never substitute another module when a requested path is absent. If evidence is insufficient, say so and return an empty evidence array. Return concise JSON with keys answer (string), evidence (string array), and status (verified or insufficient_evidence).",
    input: `Question: ${question}\nVerified graph: ${JSON.stringify(compactGraph)}`,
    text: { format: { type: "json_schema", name: "investigation", strict: true, schema: { type: "object", additionalProperties: false, properties: { answer: { type: "string" }, evidence: { type: "array", items: { type: "string" } }, status: { type: "string", enum: ["verified", "insufficient_evidence"] } }, required: ["answer", "evidence", "status"] } } },
  });
  const parsed = JSON.parse(response.output_text) as { answer: string; evidence: string[]; status: "verified" | "insufficient_evidence" };
  const validation = validateEvidence(snapshot, parsed.evidence);
  if (!validation.valid) throw new Error(`Investigation cited invalid evidence: ${validation.invalid.join(", ")}`);
  let traceId = response.id;
  try { traceId = getCurrentRunTree().id; } catch { /* LangSmith tracing is optional. */ }
  return { ...parsed, mode: "openai" as const, traceId };
}, {
  name: "synapcode-repository-investigation",
  run_type: "chain",
  tags: ["synapcode", "repository-investigator"],
  processInputs: (input) => ({
    question: input.question,
    repository: input.snapshot.repository,
    commit: input.snapshot.commit,
    moduleCount: input.snapshot.modules.length,
    edgeCount: input.snapshot.edges.length,
  }),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!checkRateLimit(`agent:${ip}`, 20).allowed) return NextResponse.json({ error: "Agent rate limit reached." }, { status: 429 });
  try {
    const { question, snapshot } = schema.parse(await request.json());
    const typedSnapshot = snapshot as GraphSnapshot;
    const context = await getRequestContext();
    if (isAuthenticationRequired() && (!context || context.mode !== "authenticated")) {
      return NextResponse.json({ error: "Sign in and select an organization first." }, { status: 401 });
    }
    const billing = await getBillingAccess();
    const result = process.env.OPENAI_API_KEY && billing.aiInvestigator
      ? await investigateWithOpenAI({ question, snapshot: typedSnapshot })
      : investigateLocally(question, typedSnapshot);
    if (context?.mode === "authenticated" && snapshot.snapshotId && isSupabaseConfigured()) {
      const organizationId = await findOrganizationId(context.organizationId, context.userId);
      await persistAgentRun({
        organizationId,
        snapshotId: snapshot.snapshotId,
        userId: context.userId,
        question,
        answer: { answer: result.answer, evidence: result.evidence, mode: result.mode, status: result.status },
        traceId: result.traceId,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid investigation request." }, { status: 400 });
    console.error("Agent investigation failed", error);
    return NextResponse.json({ error: "The investigator could not complete this request." }, { status: 502 });
  }
}
