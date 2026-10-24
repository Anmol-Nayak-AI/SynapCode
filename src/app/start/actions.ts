"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function resolveOrganization(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("You must sign in before creating a Console.");
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({ userId, limit: 1 });
  const existing = memberships.data[0];
  if (existing) return existing.organization.id;
  const user = await clerk.users.getUser(userId);
  const identity = user.firstName ?? user.username ?? user.primaryEmailAddress?.emailAddress.split("@")[0];
  const organization = await clerk.organizations.createOrganization({ name: identity ? `${identity}'s Console` : "My Console", createdBy: userId });
  return organization.id;
}
