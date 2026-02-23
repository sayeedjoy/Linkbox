export function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

export function safeHostname(url: string | null): string {
  if (!url) return "Note";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
