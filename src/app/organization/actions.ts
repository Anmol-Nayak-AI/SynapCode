"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function organizationSession() {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  if (!session.orgId) redirect("/start");
  if (session.orgRole !== "org:admin") redirect("/organization?error=permission");
  return { userId: session.userId, organizationId: session.orgId };
}

export async function updateOrganizationName(formData: FormData) {
  const { organizationId } = await organizationSession();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 64) redirect("/organization?error=name");

  let failed = false;
  try {
    const clerk = await clerkClient();
    await clerk.organizations.updateOrganization(organizationId, { name });
  } catch {
    failed = true;
  }
  if (failed) redirect("/organization?error=update");
  revalidatePath("/organization");
  redirect("/organization?saved=profile");
}

export async function inviteOrganizationMember(formData: FormData) {
  const { userId, organizationId } = await organizationSession();
  const emailAddress = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) redirect("/organization?error=email");

  let failed = false;
  try {
    const clerk = await clerkClient();
    await clerk.organizations.createOrganizationInvitation({ organizationId, emailAddress, role: "org:member", inviterUserId: userId });
  } catch {
    failed = true;
  }
  if (failed) redirect("/organization?error=invite");
  revalidatePath("/organization");
  redirect("/organization?saved=invite");
}
