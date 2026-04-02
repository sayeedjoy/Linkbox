import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create a LinkArena account to start saving and organizing your bookmarks.",
  alternates: { canonical: "/sign-up" },
};

export default function SignUpPage() {
  return <SignUpForm />;
}
