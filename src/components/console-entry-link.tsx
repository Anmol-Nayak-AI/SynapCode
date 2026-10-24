"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import type { ReactNode } from "react";

interface ConsoleEntryLinkProps {
  authEnabled: boolean;
  className: string;
  signedInChildren: ReactNode;
  signedOutChildren: ReactNode;
  signedOutHref?: "/sign-in" | "/sign-up";
}

export function ConsoleEntryLink({
  authEnabled,
  className,
  signedInChildren,
  signedOutChildren,
  signedOutHref = "/sign-in",
}: ConsoleEntryLinkProps) {
  if (!authEnabled) {
    return <Link href={signedOutHref} className={className}>{signedOutChildren}</Link>;
  }

  return <ConfiguredConsoleEntryLink className={className} signedInChildren={signedInChildren} signedOutChildren={signedOutChildren} signedOutHref={signedOutHref} />;
}

function ConfiguredConsoleEntryLink({
  className,
  signedInChildren,
  signedOutChildren,
  signedOutHref = "/sign-in",
}: Omit<ConsoleEntryLinkProps, "authEnabled">) {
  const { isSignedIn } = useAuth();
  const signedIn = Boolean(isSignedIn);

  return (
    <Link href={signedIn ? "/dashboard" : signedOutHref} className={className}>
      {signedIn ? signedInChildren : signedOutChildren}
    </Link>
  );
}
