const list = await (await fetch("http://localhost:5173/api/generations")).json();
let hits = 0;
for (const g of list.generations) {
  if (g.status !== "succeeded") continue;
  const j = await (await fetch(`http://localhost:5173/api/generations/${g.id}`)).json();
  const a = j.result?.article; if (!a) continue;
  const fields = {title: a.title, lead: a.lead, body: a.body, cta: a.cta};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v !== "string") continue;
    const imgs = (v.match(/!\[[^\]]*\]\([^)]*\)/g) || []);
    const links = (v.match(/(?<!!)\[[^\]]+\]\([^)]+\)/g) || []);
    const ids = (v.match(/image_id\s*[:：]\s*[0-9a-f]{8,}/g) || []);
    if (imgs.length || links.length || ids.length) {
      hits++;
      console.log(`${j.summary.platform} ${g.id.slice(0,8)} ${k}: imgs=${imgs.length} links=${links.length} ids=${ids.length}`);
      [...imgs, ...links, ...ids].slice(0,3).forEach((s) => console.log("    " + s.slice(0, 90)));
    }
  }
}
console.log("命中任务数:", hits);
