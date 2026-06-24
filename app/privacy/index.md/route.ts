import { markdownResponse } from "@/lib/markdown-content";

// Markdown mirror of /privacy. See lib/markdown-content.ts.
export function GET() {
  return markdownResponse("/privacy");
}
