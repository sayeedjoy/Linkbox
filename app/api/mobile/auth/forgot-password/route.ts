import { NextResponse } from "next/server";
import { requestPasswordResetByEmail } from "@/lib/password-reset";
import { consumeRateLimit } from "@/lib/request-rate-limit";

type ForgotPasswordBody = {
  email?: string;
};

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(request, "mobile-auth-forgot-password", 5, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many reset requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

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
