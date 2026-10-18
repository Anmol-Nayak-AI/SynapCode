import { OrganizationProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { isClerkConfigured } from "@/lib/auth/context";

// Organization management depends on the current Clerk session.
export const instant = false;

export default async function OrganizationPage() {
  if (!isClerkConfigured()) redirect("/sign-in");
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/start");
  return <main className="relative grid min-h-screen place-items-center bg-background p-6"><div className="absolute right-6 top-6"><ThemeToggle /></div><OrganizationProfile routing="hash" /></main>;
}
