// sundialyears-backup — stores database dumps in R2 (binding BACKUPS). No S3 keys anywhere.
//   PUT  /db/<name>.sql.gz   (Authorization: Bearer BACKUP_SECRET) → writes the object
//   GET  /db                 (Authorization: Bearer BACKUP_SECRET) → lists recent dumps
// Keeps the newest 30 dumps; older ones are deleted on each upload.
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });

const worker = {
  async fetch(req, env) {
    const auth = req.headers.get("authorization") || "";
    if (!env.BACKUP_SECRET || auth !== `Bearer ${env.BACKUP_SECRET}`) return json({ ok: false }, 401);
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/db") {
      const list = await env.BACKUPS.list({ prefix: "db/" });
      return json({ ok: true, objects: list.objects.map((o) => ({ key: o.key, size: o.size, uploaded: o.uploaded })) });
    }
    const m = /^\/db\/([A-Za-z0-9._-]+\.sql\.gz)$/.exec(url.pathname);
    if (req.method === "PUT" && m) {
      const obj = await env.BACKUPS.put(`db/${m[1]}`, req.body, { httpMetadata: { contentType: "application/gzip" } });
      const list = await env.BACKUPS.list({ prefix: "db/" });
      const old = list.objects.sort((a, b) => b.uploaded - a.uploaded).slice(30);
      for (const o of old) await env.BACKUPS.delete(o.key);
      return json({ ok: true, key: obj.key, size: obj.size, pruned: old.length });
    }
    return json({ ok: false, error: "not found" }, 404);
  },
};
export default worker;
