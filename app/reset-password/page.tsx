"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      if ("ok" in res && res.ok) {
        router.push("/sign-in");
        return;
      }
      setError("error" in res ? res.error : "Something went wrong");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
              Invalid reset link
            </h3>
            <p className="text-pretty mt-2 text-center text-sm text-muted-foreground dark:text-muted-foreground">
              This link is missing or invalid. Request a new one from the forgot password page.
            </p>
            <p className="text-pretty mt-6 text-center text-sm text-muted-foreground dark:text-muted-foreground">
              <Link
                href="/forgot-password"
                className="font-medium text-primary hover:text-primary/90 dark:text-primary dark:hover:text-primary/90"
              >
                Request new reset link
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
            Set new password
          </h3>
          <p className="text-pretty text-center text-sm text-muted-foreground dark:text-muted-foreground">
            Enter your new password below.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label
                htmlFor="password-reset"
                className="text-sm font-medium text-foreground dark:text-foreground"
              >
                New password
              </Label>
              <Input
                type="password"
                id="password-reset"
                name="password"
                autoComplete="new-password"
                placeholder="**************"
                className="mt-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label
                htmlFor="confirm-password-reset"
                className="text-sm font-medium text-foreground dark:text-foreground"
              >
                Confirm password
              </Label>
              <Input
                type="password"
                id="confirm-password-reset"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="**************"
                className="mt-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="mt-4 w-full py-2 font-medium" disabled={loading}>
              {loading ? "Resetting…" : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
