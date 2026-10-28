const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const qs = ['双11+轻薄本', '双11%20轻薄本', '%22双11%22+轻薄本+推荐'];
for (const q of qs) {
  const u = `https://www.bing.com/search?q=${q}&format=rss`;
  const t = await (await fetch(u,{headers:{'User-Agent':UA}})).text();
  const items=[...t.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,3).map(m=>({
    title:(/<title>([\s\S]*?)<\/title>/.exec(m[1])||[])[1],
    link:(/<link>([\s\S]*?)<\/link>/.exec(m[1])||[])[1],
    date:(/<pubDate>([\s\S]*?)<\/pubDate>/.exec(m[1])||[])[1],
  }));
  console.log('=== q=', q, 'items', (t.match(/<item>/g)||[]).length);
  items.forEach(x=>console.log('  ', (x.title||'').slice(0,44), '|', (x.date||'').slice(0,16)));
}
