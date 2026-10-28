import {DatabaseSync} from "node:sqlite";
const db = new DatabaseSync("data/storage/tuijian.sqlite");
const row = db.prepare("SELECT result FROM generations WHERE status = 'succeeded' AND LENGTH(result) > 200000 LIMIT 1").get();
const o = JSON.parse(row.result);
const t = o.trace[0];
console.log("trace keys:", Object.keys(t));
for (const k of Object.keys(t)) console.log(" ", k, typeof t[k] === "string" ? t[k].length : JSON.stringify(t[k] ?? null).length);
db.close();
