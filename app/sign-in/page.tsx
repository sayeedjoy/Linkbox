import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getAuthOptional } from "@/lib/auth";
import { isPublicSignupEnabled } from "@/lib/app-config";

export default async function SignInPage() {
  await headers();
  const [session, publicSignupEnabled] = await Promise.all([
    getAuthOptional(),
    isPublicSignupEnabled(),
  ]);

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <SignInForm publicSignupEnabled={publicSignupEnabled} />;
}
