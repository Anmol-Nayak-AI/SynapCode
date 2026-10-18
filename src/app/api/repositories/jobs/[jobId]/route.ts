import { connection, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/auth/context";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { findOrganizationId, getAnalysisJobForOrganization } from "@/lib/supabase/repositories";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  await connection();
  const context = await getRequestContext();
  if (!context || context.mode !== "authenticated") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Persistence is not configured." }, { status: 503 });
  const organizationId = await findOrganizationId(context.organizationId, context.userId);
  const { jobId } = await params;
  const job = await getAnalysisJobForOrganization(jobId, organizationId);
  if (!job) return NextResponse.json({ error: "Analysis job not found." }, { status: 404 });

  let snapshot = null;
  if (job.status === "completed" && job.snapshot_id) {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from("graph_snapshots").select("graph").eq("id", job.snapshot_id).single();
    snapshot = data?.graph ? { ...(data.graph as object), snapshotId: job.snapshot_id } : null;
  }
  return NextResponse.json({ ...job, snapshot });
}
