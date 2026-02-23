"use server";

import OpenAI from "openai";
import { unfurlUrl, extractUrlsFromText } from "@/lib/parse";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function parseTextForUrls(text: string): Promise<string[]> {
  if (!text.trim()) return [];
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Extract all URLs from the user message. Reply with only a JSON array of URL strings, nothing else. Example: [\"https://a.com\", \"https://b.com\"]",
          },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0]?.message?.content?.trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { urls?: string[] } | string[];
      const urls = Array.isArray(parsed) ? parsed : parsed?.urls ?? [];
      return urls.filter(
        (u): u is string =>
          typeof u === "string" && u.startsWith("http")
      );
    } catch {
      return [];
    }
  }
  return extractUrlsFromText(text);
}

export async function parseImageForUrls(
  imageBase64: string,
  mimeType: string
): Promise<string[]> {
  if (!openai) return [];
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Look at the image and extract every URL that is visible (links, addresses in text, etc). Reply with only a JSON array of URL strings, nothing else. Example: [\"https://a.com\", \"https://b.com\"]",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { urls?: string[] } | string[];
    const urls = Array.isArray(parsed) ? parsed : parsed?.urls ?? [];
    return urls.filter(
      (u): u is string => typeof u === "string" && u.startsWith("http")
    );
  } catch {
    return [];
  }
}

export { unfurlUrl };
