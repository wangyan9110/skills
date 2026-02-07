import path from "node:path";
import { readFile } from "node:fs/promises";
import type { CliArgs } from "../types";

export function getDefaultModel(): string {
  return process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-3-pro-image-preview";
}

function getApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY || null;
}

function getBaseUrl(): string {
  const base = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  return base.replace(/\/+$/g, "");
}

async function readImageAsBase64(p: string): Promise<{ data: string; mimeType: string }> {
  const buf = await readFile(p);
  const ext = path.extname(p).toLowerCase();
  let mimeType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
  else if (ext === ".gif") mimeType = "image/gif";
  else if (ext === ".webp") mimeType = "image/webp";
  return { data: buf.toString("base64"), mimeType };
}

function buildPromptWithAspect(prompt: string, ar: string | null, quality: CliArgs["quality"]): string {
  let result = prompt;
  if (ar) {
    result += ` Aspect ratio: ${ar}.`;
  }
  if (quality === "2k") {
    result += " High resolution 2048px.";
  }
  return result;
}

type OpenRouterImageResponse = {
  choices: Array<{
    message: {
      content?: string | null;
      images?: Array<{
        image_url: {
          url: string; // Base64 data URL like "data:image/png;base64,..."
        };
      }>;
    };
  }>;
};

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs
): Promise<Uint8Array> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required");

  const baseURL = getBaseUrl();
  const fullPrompt = buildPromptWithAspect(prompt, args.aspectRatio, args.quality);

  // Build message content parts
  const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Add reference images if provided
  for (const refPath of args.referenceImages) {
    const { data, mimeType } = await readImageAsBase64(refPath);
    contentParts.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${data}` },
    });
  }

  // Add text prompt
  contentParts.push({ type: "text", text: fullPrompt });

  const body: Record<string, any> = {
    model,
    messages: [
      {
        role: "user",
        content: contentParts.length === 1 ? fullPrompt : contentParts,
      },
    ],
    modalities: ["image", "text"],
  };

  console.log(`Generating image with OpenRouter (${model})...`);

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${err}`);
  }

  const result = (await res.json()) as OpenRouterImageResponse;
  const message = result.choices?.[0]?.message;

  if (message?.images && message.images.length > 0) {
    const imageUrl = message.images[0]!.image_url.url;

    // Handle base64 data URL: "data:image/png;base64,..."
    if (imageUrl.startsWith("data:")) {
      const commaIdx = imageUrl.indexOf(",");
      if (commaIdx === -1) throw new Error("Invalid data URL in response");
      const b64 = imageUrl.slice(commaIdx + 1);
      return Uint8Array.from(Buffer.from(b64, "base64"));
    }

    // Handle regular URL
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to download image from OpenRouter");
      const buf = await imgRes.arrayBuffer();
      return new Uint8Array(buf);
    }

    // Assume raw base64
    return Uint8Array.from(Buffer.from(imageUrl, "base64"));
  }

  console.error("Full response:", JSON.stringify(result, null, 2));
  throw new Error("No image in OpenRouter response. Check console for full response structure.");
}
