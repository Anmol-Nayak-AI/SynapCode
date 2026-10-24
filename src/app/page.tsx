import { LandingExperience } from "@/components/landing-experience";
import { MarketingHeader } from "@/components/marketing-header";
import { isClerkConfigured } from "@/lib/auth/context";

export default function LandingPage() {
  const authEnabled = isClerkConfigured();
  return (
    <main className="spatial-shell min-h-screen text-slate-200">
      <MarketingHeader authEnabled={authEnabled} />
      <LandingExperience authEnabled={authEnabled} />
    </main>
  );
}
