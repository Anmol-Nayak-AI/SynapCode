import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { getBillingAccess, isAuthenticationRequired, isClerkConfigured } from "@/lib/auth/context";

// Clerk reads request headers, so this route must render against the live request.
export const instant = false;

export default async function DashboardPage() {
  const authEnabled = isClerkConfigured();
  if (!authEnabled && isAuthenticationRequired()) redirect("/sign-in");
  if (authEnabled) {
    const { userId, orgId } = await auth();
    if (!userId) redirect("/sign-in");
    if (!orgId) redirect("/start");
  }
  const billing = await getBillingAccess();
  const persistenceEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY);
  return <Dashboard authEnabled={authEnabled} persistenceEnabled={persistenceEnabled} services={{ clerk: authEnabled, billing: billing.billingEnabled, supabase: persistenceEnabled, inngest: Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY), openai: Boolean(process.env.OPENAI_API_KEY), langsmith: Boolean(process.env.LANGSMITH_API_KEY && process.env.LANGSMITH_TRACING === "true"), github: Boolean(process.env.GITHUB_TOKEN) }} />;
}
