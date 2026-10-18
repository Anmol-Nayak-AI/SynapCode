import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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
  return <main className="relative grid min-h-screen place-items-center bg-background p-6"><div className="absolute right-6 top-6"><ThemeToggle /></div><div className="flex flex-col items-center gap-8"><Logo /><ActivateOrganization /></div></main>;
}
