import { markdownResponse } from "@/lib/markdown-content";

// Markdown mirror of the home page (`/`). See lib/markdown-content.ts.
export function GET() {
  return markdownResponse("/");
}
