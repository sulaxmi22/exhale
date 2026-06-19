import "dotenv/config";
import OpenAI from "openai";
const c = new OpenAI({ apiKey: process.env.NEBIUS_API_KEY, baseURL: process.env.NEBIUS_BASE_URL });
console.log("key present:", !!process.env.NEBIUS_API_KEY, "| model:", process.env.NEBIUS_VISION_MODEL);
try {
  const r = await c.chat.completions.create({
    model: process.env.NEBIUS_VISION_MODEL,
    max_tokens: 20,
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
  });
  console.log("NEBIUS OK ->", r.choices[0].message.content.trim());
} catch (e) {
  console.log("NEBIUS ERROR ->", e.status || "", e.message.slice(0, 300));
}
