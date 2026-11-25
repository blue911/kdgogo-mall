// POST /api/translate  机翻预填（后台管理鉴权）
// 入参：{ target: "en"|"ru"|..., text: { name, description, feats: [] } }
// 出参：{ ok:true, result:{ name, description, feats:[] } }
// 说明：译文仅作为后台草稿，人工核对保存后才入库；线上展示不调用本接口。
// 通道可替换：默认 Cloudflare Workers AI；后续可在 env 配置 TRANSLATE_PROVIDER=deepl|google 并补对应调用。
import { json, isAuthed, I18N_LANGS } from "../_lib.js";

const WORKERS_AI_MODEL = "@cf/meta/m2m100-12b";

async function translateWorkersAI(env, text, target) {
  if (!env.AI) throw new Error("NO_AI_BINDING");
  const out = await env.AI.run(WORKERS_AI_MODEL, {
    text,
    source_lang: "zh",
    target_lang: target
  });
  return out && out.translated_text ? String(out.translated_text) : text;
}

async function translateOne(env, str, target) {
  if (!str) return "";
  const provider = String(env.TRANSLATE_PROVIDER || "workersai").toLowerCase();
  if (provider === "deepl") throw new Error("DEEPL_NOT_CONFIGURED");
  if (provider === "google") throw new Error("GOOGLE_NOT_CONFIGURED");
  return translateWorkersAI(env, str, target);
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ ok: false, error: "不支持的方法" }, 405);
  if (!isAuthed(request, env)) return json({ ok: false, error: "未授权" }, 401);

  let body = {};
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: "请求体不是合法 JSON" }, 400); }

  const target = String(body.target || "").trim();
  if (!I18N_LANGS.includes(target)) return json({ ok: false, error: "不支持的目标语种" }, 400);

  const text = body.text && typeof body.text === "object" ? body.text : {};
  const name = String(text.name || "").trim();
  const description = String(text.description || "").trim();
  const feats = Array.isArray(text.feats) ? text.feats.map(f => String(f).trim()).filter(Boolean) : [];
  if (!name && !description && !feats.length) return json({ ok: false, error: "没有可翻译的内容" }, 400);

  try {
    const [tn, td, tFeats] = await Promise.all([
      name ? translateOne(env, name, target) : Promise.resolve(""),
      description ? translateOne(env, description, target) : Promise.resolve(""),
      Promise.all(feats.map(f => translateOne(env, f, target)))
    ]);
    return json({ ok: true, result: { name: tn, description: td, feats: tFeats } });
  } catch (err) {
    const msg = (err && err.message === "NO_AI_BINDING")
      ? "未配置翻译通道（需在 Cloudflare 绑定 Workers AI，变量名 AI），可手工填写译文"
      : "机翻服务暂不可用，可手工填写译文";
    return json({ ok: false, error: msg }, 503);
  }
}
