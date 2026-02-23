import { unfurl } from "unfurl.js";

export type UnfurlResult = {
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
};

export async function unfurlUrl(url: string): Promise<UnfurlResult> {
  try {
    const meta = await unfurl(url, { timeout: 8000 });
    const title =
      meta.title ??
      meta.open_graph?.title ??
      meta.twitter_card?.title ??
      null;
    const description =
      meta.description ??
      meta.open_graph?.description ??
      meta.twitter_card?.description ??
      null;
    const faviconUrl = meta.favicon ?? null;
    const previewImageUrl =
      meta.open_graph?.images?.[0]?.url ??
      meta.open_graph?.images?.[0]?.secure_url ??
      meta.twitter_card?.images?.[0]?.url ??
      null;
    return {
      title: title ?? null,
      description: description ?? null,
      faviconUrl: faviconUrl ?? null,
      previewImageUrl: previewImageUrl ?? null,
    };
  } catch {
    return {
      title: null,
      description: null,
      faviconUrl: null,
      previewImageUrl: null,
    };
  }
}

const URL_REGEX =
  /https?:\/\/[^\s<>\]\)"')\]]+/gi;

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  const seen = new Set<string>();
  return matches.filter((u) => {
    const normalized = u.replace(/[.,;:!?)]+$/, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    try {
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  });
}
