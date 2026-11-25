// /api/products/:id  单个商品：GET 查询 / PUT 修改 / DELETE 删除
// 写操作需 Authorization: Bearer <管理密码>
import { json, isAuthed, ensureDb, rowToProduct, normalizeProduct, validateProduct, cleanupOrphanImages } from "../../_lib.js";

export async function onRequest(context) {
  const { request, env, params } = context;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "无效的商品 ID" }, 400);
  if (!env.DB) {
    return json({ ok: false, error: "数据库未配置：请先绑定 D1（变量名 DB）" }, 503);
  }
  await ensureDb(env);

  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    if (!row) return json({ ok: false, error: "商品不存在" }, 404);
    return json({ ok: true, product: rowToProduct(row) });
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    if (!isAuthed(request, env)) return json({ ok: false, error: "未授权" }, 401);
    const row = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    if (!row) return json({ ok: false, error: "商品不存在" }, 404);
    let body = {};
    try { body = await request.json(); } catch (e) { return json({ ok: false, error: "请求体不是合法 JSON" }, 400); }
    const cur = rowToProduct(row);
    const oldUrls = [...(cur.images || []), cur.image].filter(Boolean);
    const merged = { ...cur, ...body };
    const p = normalizeProduct(merged);
    const err = validateProduct(p);
    if (err) return json({ ok: false, error: err }, 400);
    await env.DB.prepare(
      `UPDATE products SET name=?, category=?, catName=?, price=?, rating=?, isNew=?, image=?, description=?, feats=?, on_sale=?, sort=?,
        stock=?, brand=?, model=?, original_price=?, images=?, free_shipping=?, shipping_fee=?, i18n=? WHERE id=?`
    ).bind(
      p.name, p.category, p.catName, p.price, p.rating, p.isNew, p.image, p.description,
      JSON.stringify(p.feats), p.on_sale, p.sort,
      p.stock, p.brand, p.model, p.original_price, JSON.stringify(p.images),
      p.free_shipping, p.shipping_fee, JSON.stringify(p.i18n || {}), id
    ).run();
    // 清理本次编辑后不再被引用的本站 R2 图片
    const newUrls = [...p.images, p.image].filter(Boolean);
    const removed = oldUrls.filter(u => !newUrls.includes(u));
    if (removed.length) await cleanupOrphanImages(env, removed);
    const updated = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    return json({ ok: true, product: rowToProduct(updated) });
  }

  if (request.method === "DELETE") {
    if (!isAuthed(request, env)) return json({ ok: false, error: "未授权" }, 401);
    const row = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
    if (!row) return json({ ok: false, error: "商品不存在" }, 404);
    const cur = rowToProduct(row);
    const candidates = [...(cur.images || []), cur.image].filter(Boolean);
    const res = await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
    if (!res.meta.changes) return json({ ok: false, error: "商品不存在" }, 404);
    // 清理删除后不再被任何商品引用的本站 R2 图片
    if (candidates.length) await cleanupOrphanImages(env, candidates);
    return json({ ok: true });
  }

  return json({ ok: false, error: "不支持的方法" }, 405);
}
