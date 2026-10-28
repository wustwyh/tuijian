const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const urls=[
 `https://www.bing.com/news/search?q=${encodeURIComponent('双11 轻薄本')}&format=rss&setlang=zh-cn`,
 `https://cn.bing.com/news/search?q=${encodeURIComponent('双11 轻薄本')}&format=rss`,
 `https://www.bing.com/search?q=${encodeURIComponent('双11 轻薄本')}&format=rss`,
];
for (const u of urls) {
  try {
    const r = await fetch(u,{headers:{'User-Agent':UA}});
    const t = await r.text();
    const items=(t.match(/<item>/g)||[]).length;
    console.log(r.status, 'items', items, 'len', t.length, '|', t.slice(0,80).replace(/\s+/g,' '));
    if (items) {
      const m=/<item>([\s\S]*?)<\/item>/.exec(t)[1];
      console.log('  first:', (/<title>([\s\S]*?)<\/title>/.exec(m)||[])[1]?.slice(0,40), '|', (/<link>([\s\S]*?)<\/link>/.exec(m)||[])[1]?.slice(0,60), '|', (/<pubDate>([\s\S]*?)<\/pubDate>/.exec(m)||[])[1]);
    }
  } catch(e) { console.log('ERR', e.message.slice(0,60)); }
}
