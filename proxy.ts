import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isMarkdownContentPath, markdownPathFor } from "@/lib/markdown-content";

const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

/** True when the client asked for Markdown via Accept header or `?format=md`. */
function wantsMarkdown(req: NextRequest): boolean {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("text/markdown") || req.nextUrl.searchParams.get("format") === "md";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // [C1] Markdown content negotiation: serve the `.md` mirror of a canonical
  // content URL when the client negotiates for Markdown. The URL is unchanged.
  if (isMarkdownContentPath(pathname) && wantsMarkdown(req)) {
    const mdPath = markdownPathFor(pathname);
    if (mdPath) return NextResponse.rewrite(new URL(mdPath, req.url));
  }

  // Route protection for authenticated areas.
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isProtected) {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token) {
      const signIn = new URL("/sign-in", req.url);
      signIn.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/privacy", "/support", "/dashboard/:path*", "/admin/:path*"],
};
