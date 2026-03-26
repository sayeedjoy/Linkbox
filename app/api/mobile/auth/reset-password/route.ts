import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";

type ResetPasswordBody = {
  token?: string;
  newPassword?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: ResetPasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const newPassword =
    typeof body.newPassword === "string"
      ? body.newPassword
      : typeof body.password === "string"
        ? body.password
        : "";

  if (!token || !newPassword) {
    return NextResponse.json(
      { error: "Token and newPassword are required" },
      { status: 400 }
    );
  }

  const result = await resetPasswordWithToken(token, newPassword);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
