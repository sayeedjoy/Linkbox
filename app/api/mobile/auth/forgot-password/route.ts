import { NextResponse } from "next/server";
import { requestPasswordResetByEmail } from "@/lib/password-reset";

type ForgotPasswordBody = {
  email?: string;
};

export async function POST(request: Request) {
  let body: ForgotPasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  await requestPasswordResetByEmail(email);
  return NextResponse.json({ ok: true }, { status: 200 });
}
