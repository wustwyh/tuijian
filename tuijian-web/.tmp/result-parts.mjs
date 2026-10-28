import {DatabaseSync} from "node:sqlite";
const db = new DatabaseSync("data/storage/tuijian.sqlite");
const rows = db.prepare("SELECT result FROM generations WHERE status='succeeded' ORDER BY created_at DESC LIMIT 3").all();
for (const r of rows) {
  const o = JSON.parse(r.result);
  const parts = Object.entries(o).map(([k,v]) => k + ":" + (typeof v === "string" ? v.length : JSON.stringify(v||null).length));
  console.log(parts.join(" | ").slice(0, 300));
  console.log("conv turns:", o.conversation?.length, "trace:", o.trace?.length);
}
db.close();
