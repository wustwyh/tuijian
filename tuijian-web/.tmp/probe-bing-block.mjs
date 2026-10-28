const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const html = await (await fetch(`https://cn.bing.com/search?q=${encodeURIComponent('双11 轻薄本')}`, {headers:{'User-Agent':UA,'Accept-Language':'zh-CN,zh;q=0.9'}})).text();
const blocks = html.split(/<li class="b_algo"/).slice(1);
console.log('blocks', blocks.length);
blocks.slice(0,2).forEach((b,i)=>{ console.log('--- block', i, b.slice(0, 420).replace(/\s+/g,' ')); });
