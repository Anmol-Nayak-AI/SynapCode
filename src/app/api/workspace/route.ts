import { connection, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/auth/context";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { findOrganizationId, getWorkspaceData } from "@/lib/supabase/repositories";

export async function GET() {
  await connection();
  try {
    const context = await getRequestContext();
    if (!context || context.mode !== "authenticated") return NextResponse.json({ error: "Sign in and select an organization first." }, { status: 401 });
    if (!isSupabaseConfigured()) return NextResponse.json({ error: "Persistence is not configured." }, { status: 503 });
    const organizationId = await findOrganizationId(context.organizationId, context.userId);
    return NextResponse.json(await getWorkspaceData(organizationId));
  } catch (error) {
    console.error("Workspace retrieval failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Workspace retrieval failed." }, { status: 500 });
  }
}
