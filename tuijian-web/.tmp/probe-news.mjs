const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
for (const url of [
  "https://www.baidu.com/s?tn=news&rtt=1&wd=" + encodeURIComponent("华为 笔记本 新品 发布"),
  "https://news.sogou.com/news?query=" + encodeURIComponent("华为 笔记本 新品") + "&sort=1",
]) {
  try {
    const r = await fetch(url, {headers: {"User-Agent": UA, "Accept-Language": "zh-CN"}});
    const html = await r.text();
    const blocks = (html.match(/c-container/g) || []).length;
    const vr = (html.match(/vrwrap/g) || []).length;
    const times = [...html.matchAll(/(\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日|\d+小时前|\d+分钟前)/g)].slice(0, 4).map(m => m[1]);
    console.log(r.status, "len", html.length, "c-container", blocks, "vrwrap", vr, "times", JSON.stringify(times));
  } catch (e) { console.log("ERR", String(e.message).slice(0, 60)); }
}
