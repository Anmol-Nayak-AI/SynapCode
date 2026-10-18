import { NextResponse } from "next/server";
import { z } from "zod";
import { getBillingAccess, getRequestContext } from "@/lib/auth/context";
import { evaluateAnalysisAccess } from "@/lib/auth/billing";
import { inngest, isInngestConfigured } from "@/inngest/client";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { createAnalysisJob, findOrganizationId, getOrganizationUsage, upsertRepository } from "@/lib/supabase/repositories";

const schema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  ref: z.string().trim().min(1).max(120).default("main"),
});

export async function POST(request: Request) {
  try {
    const context = await getRequestContext();
    if (!context || context.mode !== "authenticated") return NextResponse.json({ error: "Sign in and select an organization first." }, { status: 401 });
    if (!isSupabaseConfigured() || !isInngestConfigured()) {
      return NextResponse.json({ error: "Durable analysis requires Supabase and Inngest configuration." }, { status: 503 });
    }
    const input = schema.parse(await request.json());
    const organizationId = await findOrganizationId(context.organizationId, context.userId);
    const billing = await getBillingAccess();
    const usage = await getOrganizationUsage(organizationId, input.repository);
    const access = evaluateAnalysisAccess(billing.unlimitedAnalyses, usage);
    if (!access.allowed) return NextResponse.json({ error: access.reason, upgradeUrl: access.upgradeUrl }, { status: 402 });
    const repository = await upsertRepository(organizationId, input.repository, input.ref);
    const job = await createAnalysisJob({
      organizationId,
      repositoryId: repository.id,
      requestedBy: context.userId,
      requestedRef: input.ref,
    });
    await inngest.send({
      id: job.id,
      name: "synapcode/repository.analysis.requested",
      data: {
        jobId: job.id,
        organizationId,
        repositoryId: repository.id,
        repository: input.repository,
        ref: input.ref,
        requestedBy: context.userId,
      },
    });
    return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Use a valid owner/repository and ref." }, { status: 400 });
    console.error("Repository queueing failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Repository queueing failed." }, { status: 500 });
  }
}
