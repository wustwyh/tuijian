import {DatabaseSync} from "node:sqlite";
const db = new DatabaseSync("data/storage/tuijian.sqlite");
const rows = db.prepare("SELECT id,source,scope FROM revisions").all();
console.log("rows:", rows.length, JSON.stringify(rows.slice(0,3)));
db.prepare("DELETE FROM revisions WHERE source='测试'").run();
console.log("after:", db.prepare("SELECT COUNT(*) c FROM revisions").get().c);
db.close();
