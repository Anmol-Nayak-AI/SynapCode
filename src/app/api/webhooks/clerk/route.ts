import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

function normalizeRole(role: string) {
  if (role.includes("owner")) return "owner";
  if (role.includes("admin")) return "admin";
  if (role.includes("viewer")) return "viewer";
  return "member";
}

export async function POST(request: NextRequest) {
  try {
    const event = await verifyWebhook(request);
    if (!isSupabaseConfigured()) return NextResponse.json({ error: "Persistence is not configured." }, { status: 503 });
    const supabase = createSupabaseAdminClient();

    if (event.type === "organization.created" || event.type === "organization.updated") {
      const { error } = await supabase.from("organizations").upsert({
        clerk_org_id: event.data.id,
        name: event.data.name,
        slug: event.data.slug,
        image_url: event.data.image_url ?? null,
      }, { onConflict: "clerk_org_id" });
      if (error) throw error;
    }

    if (event.type === "organization.deleted") {
      const { error } = await supabase.from("organizations").delete().eq("clerk_org_id", event.data.id);
      if (error) throw error;
    }

    if (event.type === "organizationMembership.created" || event.type === "organizationMembership.updated") {
      const organization = event.data.organization;
      const { data: org, error: orgError } = await supabase.from("organizations").upsert({
        clerk_org_id: organization.id,
        name: organization.name,
        slug: organization.slug,
        image_url: organization.image_url ?? null,
      }, { onConflict: "clerk_org_id" }).select("id").single();
      if (orgError) throw orgError;
      const { error } = await supabase.from("organization_members").upsert({
        organization_id: org.id,
        clerk_user_id: event.data.public_user_data.user_id,
        role: normalizeRole(event.data.role),
      }, { onConflict: "organization_id,clerk_user_id" });
      if (error) throw error;
    }

    if (event.type === "organizationMembership.deleted") {
      const { data: org, error: orgError } = await supabase.from("organizations").select("id").eq("clerk_org_id", event.data.organization.id).single();
      if (orgError) throw orgError;
      const { error } = await supabase.from("organization_members").delete()
        .eq("organization_id", org.id).eq("clerk_user_id", event.data.public_user_data.user_id);
      if (error) throw error;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook failed", error);
    return NextResponse.json({ error: "Webhook verification or synchronization failed." }, { status: 400 });
  }
}
