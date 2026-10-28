import {DatabaseSync} from "node:sqlite";
import {seedGenerations} from "../server/seed-generations.mjs";
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE IF NOT EXISTS generations(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,status TEXT NOT NULL,summary TEXT NOT NULL,input TEXT NOT NULL,result TEXT,error TEXT)");
db.exec("CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY AUTOINCREMENT,generation_id TEXT NOT NULL,at TEXT NOT NULL,scope TEXT,requirement TEXT,source TEXT,article TEXT NOT NULL)");
const r = seedGenerations({db, projectRoot: process.cwd()});
console.log("import:", JSON.stringify(r));
console.log("rows:", db.prepare("SELECT COUNT(*) c FROM generations").get().c, "revisions:", db.prepare("SELECT COUNT(*) c FROM revisions").get().c);
const one = db.prepare("SELECT id, status, LENGTH(result) r FROM generations ORDER BY created_at DESC LIMIT 2").all();
console.log(JSON.stringify(one));
// 再跑一次不应该重复导入
console.log("again:", JSON.stringify(seedGenerations({db, projectRoot: process.cwd()})));
db.close();


