import type { CliArgs } from "../types";

export function getDefaultModel(): string {
  return process.env.POE_IMAGE_MODEL || "nano-banana-pro";
}

function getApiKey(): string | null {
  return process.env.POE_API_KEY || null;
}

function getBaseUrl(): string {
  const base = process.env.POE_BASE_URL || "https://api.poe.com/v1";
  return base.replace(/\/+$/g, "");
}

// 从 POE API 响应中提取图片数据
function extractImageData(response: any): string | null {
  // POE API 响应格式: output 数组中包含 image_generation_call 类型的对象
  if (response.output && Array.isArray(response.output)) {
    for (const item of response.output) {
      if (item.type === "image_generation_call" && item.status === "completed") {
        // result 字段包含 base64 编码的图片数据
        if (item.result && typeof item.result === "string") {
          return item.result;
        }
      }
    }
  }

  // 备用格式 1: 类似 Google Gemini 的 candidates 格式
  if (response.candidates) {
    for (const candidate of response.candidates) {
      for (const part of candidate.content?.parts || []) {
        const data = part.inlineData?.data;
        if (typeof data === "string" && data.length > 0) return data;
      }
    }
  }

  // 备用格式 2: 在 data 数组中（类似 OpenAI）
  if (response.data && Array.isArray(response.data)) {
    const img = response.data[0];
    if (img?.b64_json) return img.b64_json;
    if (img?.url) return img.url;
  }

  return null;
}

export async function generateImage(
  prompt: string,
  model: string,
  args: CliArgs
): Promise<Uint8Array> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("POE_API_KEY is required");

  if (args.referenceImages.length > 0) {
    console.error("Warning: Reference images not yet supported with POE, ignoring.");
  }

  const baseURL = getBaseUrl();
  
  // POE 使用 OpenAI 兼容的 API，使用 responses.create 端点
  // 需要在 extra_body 中传递额外参数
  const extraBody: any = {
    image_only: true,  // 必须设置为 true 才能生成图片
  };

  // 添加可选参数到 extra_body
  if (args.aspectRatio) {
    extraBody.aspect_ratio = args.aspectRatio;
  }
  if (args.size) {
    extraBody.size = args.size;
  }
  if (args.quality) {
    extraBody.quality = args.quality;
  }

  const body: any = {
    model,
    input: prompt,
    extra_body: extraBody,
  };

  console.log(`Generating image with POE (${model})...`);

  const res = await fetch(`${baseURL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "User-Agent": "baoyu-image-gen/1.0",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`POE API error (${res.status}):`, err);
    throw new Error(`POE API error (${res.status}): ${err}`);
  }

  const result = await res.json();
  console.log("POE API Response structure:", JSON.stringify(result, null, 2));

  const imageData = extractImageData(result);
  
  if (!imageData) {
    console.error("Full response:", JSON.stringify(result, null, 2));
    throw new Error("No image data found in POE response. Check console for full response structure.");
  }

  // 判断是 URL 还是 base64
  if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
    console.log("Downloading image from URL...");
    const imgRes = await fetch(imageData);
    if (!imgRes.ok) throw new Error("Failed to download image from POE");
    const buf = await imgRes.arrayBuffer();
    return new Uint8Array(buf);
  }

  // 假设是 base64
  return Uint8Array.from(Buffer.from(imageData, "base64"));
}
