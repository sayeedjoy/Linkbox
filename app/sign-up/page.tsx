import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getVerifiedAuthSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create a LinkArena account to start saving and organizing your bookmarks.",
  alternates: { canonical: "/sign-up" },
};

export default async function SignUpPage() {
  const session = await getVerifiedAuthSession();
  if (session) {
    redirect("/dashboard");
  }
  return <SignUpForm />;
}
