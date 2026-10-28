const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const q='双11 轻薄本 优惠';
// Sogou
const sg = await (await fetch(`https://www.sogou.com/web?query=${encodeURIComponent(q)}`,{headers:{'User-Agent':UA,'Accept-Language':'zh-CN'}})).text();
const sgBlocks = sg.split(/<div[^>]+class="[^"]*vrwrap/).slice(1);
console.log('sogou blocks', sgBlocks.length);
sgBlocks.slice(0,3).forEach((b,i)=>{
  const t=/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/.exec(b);
  const href=/<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/.exec(b);
  console.log(' S'+i, (t?.[1]||'').replace(/<[^>]+>/g,'').slice(0,40), '|', href?.[1]?.slice(0,50));
});
// Baidu: 只看 result c-container
const bd = await (await fetch(`https://www.baidu.com/s?wd=${encodeURIComponent(q)}&rn=10`,{headers:{'User-Agent':UA,'Accept-Language':'zh-CN'}})).text();
const bdBlocks = bd.split(/<div[^>]+class="result c-container/).slice(1);
console.log('baidu result blocks', bdBlocks.length);
bdBlocks.slice(0,3).forEach((b,i)=>{
  const t=/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/.exec(b);
  const mu=/mu="([^"]+)"/.exec(b);
  console.log(' B'+i, (t?.[1]||'').replace(/<[^>]+>/g,'').slice(0,44), '|', mu?.[1]?.slice(0,44));
});
