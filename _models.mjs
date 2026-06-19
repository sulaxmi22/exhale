import "dotenv/config";
const r = await fetch(process.env.NEBIUS_BASE_URL.replace(/\/$/,"") + "/models", {
  headers: { Authorization: "Bearer " + process.env.NEBIUS_API_KEY },
});
const d = await r.json();
const ids = (d.data || []).map(m => m.id);
console.log("total models:", ids.length);
console.log("VISION/VL candidates:");
ids.filter(i => /vl|vision|qwen2\.5-vl|llava|pixtral|gemma-3|nemotron/i.test(i)).forEach(i => console.log("  ", i));
