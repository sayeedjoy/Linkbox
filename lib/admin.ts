import { notFound, redirect } from "next/navigation";
import { getVerifiedAuthSession } from "@/lib/auth";

export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

export async function requireAdminSession() {
  const session = await getVerifiedAuthSession();
  if (!session) {
    redirect("/sign-in");
  }

  if (!isAdminEmail(session.user?.email)) {
    notFound();
  }

  return session;
}
