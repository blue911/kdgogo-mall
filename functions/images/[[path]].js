// GET /images/[[path]]  读取 R2 图片并回传（同站访问，免开 R2 公开域名）
export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method !== "GET") return new Response("仅支持 GET", { status: 405 });
  if (!env.IMAGES) return new Response("未配置图片存储", { status: 503 });

  const parts = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);
  const key = parts.map(decodeURIComponent).join("/");
  if (!key) return new Response("缺少图片路径", { status: 400 });

  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response("图片不存在", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", (obj.httpMetadata && obj.httpMetadata.contentType) || "image/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (typeof obj.size === "number") headers.set("Content-Length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
}
