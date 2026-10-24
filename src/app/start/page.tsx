import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthStage } from "@/components/auth-stage";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { isClerkConfigured } from "@/lib/auth/context";
import { ActivateOrganization } from "./activate";

// Organization activation depends on the current Clerk session.
export const instant = false;

export default async function StartPage() {
  if (!isClerkConfigured()) redirect("/sign-in");
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (orgId) redirect("/dashboard");
  return <main className="spatial-shell relative grid min-h-screen place-items-center p-6"><div className="absolute right-6 top-6 z-10"><ThemeToggle /></div><AuthStage><Logo /><ActivateOrganization /></AuthStage></main>;
}
