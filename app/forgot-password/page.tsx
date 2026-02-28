"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";

const DEMO_EMAIL = "demo@linkarena.app";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
              Check your email
            </h3>
            <p className="text-pretty mt-2 text-center text-sm text-muted-foreground dark:text-muted-foreground">
              If an account exists with that email, you&apos;ll receive a reset link shortly.
            </p>
            <p className="text-pretty mt-6 text-center text-sm text-muted-foreground dark:text-muted-foreground">
              <Link
                href="/sign-in"
                className="font-medium text-primary hover:text-primary/90 dark:text-primary dark:hover:text-primary/90"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
            Forgot password
          </h3>
          <p className="text-pretty text-center text-sm text-muted-foreground dark:text-muted-foreground">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label
                htmlFor="email-forgot"
                className="text-sm font-medium text-foreground dark:text-foreground"
              >
                Email
              </Label>
              <Input
                type="email"
                id="email-forgot"
                name="email"
                autoComplete="email"
                placeholder={DEMO_EMAIL}
                className="mt-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="mt-4 w-full py-2 font-medium" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="text-pretty mt-6 text-center text-sm text-muted-foreground dark:text-muted-foreground">
            <Link
              href="/sign-in"
              className="font-medium text-primary hover:text-primary/90 dark:text-primary dark:hover:text-primary/90"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
