import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync('data/storage/tuijian.sqlite');
const show = (label, text) => {
  const at = text.indexOf('人工微调') >= 0 ? text.indexOf('人工微调') : text.indexOf('补充一句');
  console.log('---', label);
  console.log(JSON.stringify(text.slice(Math.max(0, at - 60), at + 40)));
};
const r1 = JSON.parse(db.prepare("SELECT result FROM generations WHERE id LIKE '6c713ab3%'").get().result);
show('6c713ab3 trace0', r1.trace[0].messages[1].content);
const r2 = JSON.parse(db.prepare("SELECT result FROM generations WHERE id LIKE 'b081e220%'").get().result);
const last = r2.trace.at(-1);
show('b081e220 last trace', JSON.stringify(last).slice(0, 0) + (typeof last.rawOutput === 'string' ? last.rawOutput : JSON.stringify(last)));
