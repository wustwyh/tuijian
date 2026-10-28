import {searchNews} from "../server/web-search.mjs";
const r = await searchNews("华为 笔记本 新品", {limit: 5});
console.log(r?.provider, r?.results.length);
r?.results.slice(0, 4).forEach((x, i) => console.log(" ", i + 1, x.date || "-", x.title.slice(0, 40), "|", x.url.slice(0, 42)));
