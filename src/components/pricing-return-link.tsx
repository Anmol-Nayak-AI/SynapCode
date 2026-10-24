"use client";

import { useSearchParams } from "next/navigation";
import { BackToHomeLink } from "@/components/back-to-home-link";

export function PricingReturnLink() {
  const openedFromConsole = useSearchParams().get("from") === "console";

  return (
    <BackToHomeLink
      href={openedFromConsole ? "/dashboard" : "/"}
      label={openedFromConsole ? "Back to Console" : "Back to homepage"}
      compactLabel={openedFromConsole ? "Console" : "Home"}
    />
  );
}
