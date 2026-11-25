// POST /api/upload  后台鉴权；multipart 上传商品图片到 R2，返回同站 /images/ 地址
// 表单字段：files（多文件）或 file（单文件）
import { json, isAuthed } from "../_lib.js";

const MAX_BYTES = 5 * 1024 * 1024; // 单张 5MB
const TYPE_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif"
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return json({ ok: false, error: "仅支持 POST 请求" }, 405);
  if (!isAuthed(request, env)) return json({ ok: false, error: "未授权" }, 401);
  if (!env.IMAGES) return json({ ok: false, error: "未配置 R2 图片存储绑定（变量名 IMAGES）" }, 503);

  let form;
  try { form = await request.formData(); } catch (e) { return json({ ok: false, error: "请求体不是合法表单" }, 400); }

  const files = [];
  for (const f of form.getAll("files")) { if (f && typeof f === "object" && f.size != null) files.push(f); }
  if (!files.length) {
    for (const f of form.getAll("file")) { if (f && typeof f === "object" && f.size != null) files.push(f); }
  }
  if (!files.length) return json({ ok: false, error: "请选择要上传的图片" }, 400);

  const urls = [];
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  for (const file of files) {
    const ext = TYPE_EXT[file.type];
    if (!ext) return json({ ok: false, error: "仅支持 JPG / PNG / WebP / GIF / AVIF 图片" }, 400);
    if (file.size > MAX_BYTES) return json({ ok: false, error: "单张图片不能超过 5MB" }, 400);
    const key = `products/${yyyymm}/${crypto.randomUUID()}${ext}`;
    await env.IMAGES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { uploadedAt: now.toISOString() }
    });
    urls.push("/images/" + key);
  }

  return json({ ok: true, urls });
}
