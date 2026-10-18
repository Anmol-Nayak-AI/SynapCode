import "server-only";

import { auth } from "@clerk/nextjs/server";

export type RequestContext =
  | { mode: "authenticated"; userId: string; organizationId: string }
  | { mode: "demo"; userId: "demo-user"; organizationId: "demo-org" };

export interface BillingAccess {
  plan: "free" | "paid" | "development";
  billingEnabled: boolean;
  unlimitedAnalyses: boolean;
  aiInvestigator: boolean;
}

export function isClerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export function isAuthenticationRequired() {
  return isClerkConfigured() || process.env.VERCEL_ENV === "production";
}

export async function getRequestContext(): Promise<RequestContext | null> {
  if (!isClerkConfigured()) return { mode: "demo", userId: "demo-user", organizationId: "demo-org" };
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;
  return { mode: "authenticated", userId, organizationId: orgId };
}

export async function getBillingAccess(): Promise<BillingAccess> {
  if (!isClerkConfigured()) {
    return { plan: "development", billingEnabled: false, unlimitedAnalyses: true, aiInvestigator: true };
  }

  const billingEnabled = process.env.CLERK_BILLING_ENABLED === "true";
  if (!billingEnabled) {
    return { plan: "free", billingEnabled: false, unlimitedAnalyses: false, aiInvestigator: false };
  }

  const { has } = await auth();
  const unlimitedAnalyses = has({ feature: "org:unlimited_analyses" });
  const aiInvestigator = has({ feature: "org:ai_investigator" });
  return {
    plan: unlimitedAnalyses || aiInvestigator ? "paid" : "free",
    billingEnabled: true,
    unlimitedAnalyses,
    aiInvestigator,
  };
}
