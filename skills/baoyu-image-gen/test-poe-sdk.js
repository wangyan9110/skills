// 使用 OpenAI SDK 测试 POE API
const { OpenAI } = require("openai");

const client = new OpenAI({
    apiKey: process.env.POE_API_KEY,
    baseURL: "https://api.poe.com/v1",
    timeout: 120000, // 120 seconds
    maxRetries: 0,
});

async function test() {
    try {
        console.log("Testing POE API with OpenAI SDK...");
        console.log("API Key:", process.env.POE_API_KEY ? "Set" : "Not set");
        console.log("Base URL:", "https://api.poe.com/v1");
        console.log("Proxy:", process.env.https_proxy || process.env.http_proxy || "Not set");
        
        const response = await client.responses.create({
            model: "nano-banana-pro",
            input: "一只可爱的猫咪",
            extra_body: {
                "aspect_ratio": "1:1",
                "image_only": true
            }
        });
        
        console.log("\n✅ Success!");
        console.log("Response:", JSON.stringify(response, null, 2));
        console.log("\nOutput text:", response.output_text);
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
        if (error.cause) {
            console.error("Cause:", error.cause);
        }
    }
}

test();
