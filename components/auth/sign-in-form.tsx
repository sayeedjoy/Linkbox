"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_EMAIL = "demo@linkarena.app";

function SignInFormInner({ publicSignupEnabled }: { publicSignupEnabled: boolean }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="flex flex-1 flex-col justify-center px-4 py-10 lg:px-6">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h3 className="text-balance text-center text-lg font-semibold text-foreground dark:text-foreground">
            Welcome Back
          </h3>
          <p className="text-pretty text-center text-sm text-muted-foreground dark:text-muted-foreground">
            Enter your credentials to access your account.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label
                htmlFor="email-login-03"
                className="text-sm font-medium text-foreground dark:text-foreground"
              >
                Email
              </Label>
              <Input
                type="email"
                id="email-login-03"
                name="email"
                autoComplete="email"
                placeholder={DEMO_EMAIL}
                className="mt-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password-login-03"
                  className="text-sm font-medium text-foreground dark:text-foreground"
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary/90 dark:text-primary dark:hover:text-primary/90"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password-login-03"
                  name="password"
                  autoComplete="current-password"
                  placeholder="**************"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="mt-4 w-full py-2 font-medium" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          {publicSignupEnabled ? (
            <p className="text-pretty mt-6 text-sm text-muted-foreground dark:text-muted-foreground">
              No account?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-primary hover:text-primary/90 dark:text-primary dark:hover:text-primary/90"
              >
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-pretty mt-6 text-sm text-muted-foreground dark:text-muted-foreground">
              Public signups are disabled on this deployment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SignInForm({ publicSignupEnabled }: { publicSignupEnabled: boolean }) {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">Loading...</div>}>
      <SignInFormInner publicSignupEnabled={publicSignupEnabled} />
    </Suspense>
  );
}
