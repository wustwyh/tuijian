import {DatabaseSync} from "node:sqlite";
const db = new DatabaseSync("data/storage/tuijian.sqlite");
const row = db.prepare("SELECT result FROM generations WHERE status='succeeded' AND id='b081e220-517b-4241-ac8e-0d5bb2861a71' LIMIT 1").get();
const o = JSON.parse(row.result);
const im = o.article.image_plan[0];
console.log(JSON.stringify(im, null, 1).slice(0, 1400));
db.close();
