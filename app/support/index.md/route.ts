import { markdownResponse } from "@/lib/markdown-content";

// Markdown mirror of /support. See lib/markdown-content.ts.
export function GET() {
  return markdownResponse("/support");
}
