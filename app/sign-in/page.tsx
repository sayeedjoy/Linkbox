import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your LinkArena account to manage your bookmarks.",
  alternates: { canonical: "/sign-in" },
};

export default function SignInPage() {
  return <SignInForm />;
}
