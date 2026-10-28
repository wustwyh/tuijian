import {searchWeb} from "../server/web-search.mjs";
for (const q of ["双11 轻薄本 优惠", "开学季 笔记本电脑 选购"]) {
  const r = await searchWeb(q, {limit: 5});
  console.log("=== " + q + " =>", r ? r.provider + " " + r.results.length + " 条" : "失败");
  if (r) r.results.slice(0, 3).forEach((x, i) => console.log(" " + (i + 1) + ". " + x.title.slice(0, 40) + " | " + x.url.slice(0, 60) + " | " + (x.snippet || "").slice(0, 50)));
}
