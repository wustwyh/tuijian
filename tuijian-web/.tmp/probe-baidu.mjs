const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const q='双11 轻薄本 优惠';
const html = await (await fetch(`https://www.baidu.com/s?wd=${encodeURIComponent(q)}&rn=10`, {headers:{'User-Agent':UA,'Accept-Language':'zh-CN,zh;q=0.9'}})).text();
const blocks = html.split(/<div[^>]+class="[^"]*c-container/).slice(1);
console.log('blocks', blocks.length);
blocks.slice(0,3).forEach((b,i)=>{
  const mu=/mu="([^"]+)"/.exec(b);
  const t=/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/.exec(b);
  console.log('---', i, '| mu:', mu?.[1]?.slice(0,50), '| title:', (t?.[1]||'').replace(/<[^>]+>/g,'').slice(0,40));
});
