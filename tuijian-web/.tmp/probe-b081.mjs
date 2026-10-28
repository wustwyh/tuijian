import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync('data/storage/tuijian.sqlite');
const raw = db.prepare("SELECT result FROM generations WHERE id LIKE 'b081e220%'").get().result;
for (const needle of ['人工微调', '补充一句']) {
  let from = 0;
  const spots = [];
  while (true) {
    const at = raw.indexOf(needle, from);
    if (at < 0) break;
    spots.push(at);
    from = at + 1;
  }
  console.log(needle, '出现次数:', spots.length);
  for (const at of spots.slice(0, 3)) console.log('  …', JSON.stringify(raw.slice(Math.max(0, at - 50), at + 30)));
}
