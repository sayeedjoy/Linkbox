"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSignupConfig } from "@/hooks/use-signup-config";
import { Button } from "@/components/ui/button";

export function LandingCtaButtons() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const publicSignupEnabled = useSignupConfig();

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <Button asChild size="lg" className="rounded-md bg-foreground text-background">
        <Link href="/dashboard">Open dashboard</Link>
      </Button>
      {!isAuthenticated ? (
        <Button asChild variant="outline" size="lg" className="rounded-md">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      ) : null}
      {!isAuthenticated && publicSignupEnabled ? (
        <Button asChild variant="outline" size="lg" className="rounded-md">
          <Link href="/sign-up">Sign up</Link>
        </Button>
      ) : null}
    </div>
  );
}
