import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Button } from "@/components/ui/button";
import { getAuthOptional } from "@/lib/auth";
import { isPublicSignupEnabled } from "@/lib/app-config";

export default async function SignUpPage() {
  await headers();
  const [session, publicSignupEnabled] = await Promise.all([
    getAuthOptional(),
    isPublicSignupEnabled(),
  ]);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  if (!publicSignupEnabled) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">
            Signups are disabled
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This self-hosted deployment is not accepting public registrations.
            If you already have an account, sign in to continue.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <SignUpForm />;
}
