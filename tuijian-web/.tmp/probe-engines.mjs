const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const q='双11 轻薄本';
for (const url of [
  `https://cn.bing.com/search?q=${encodeURIComponent(q)}`,
  `https://cn.bing.com/search?q=${encodeURIComponent(q).replace(/%20/g,'+')}&form=QBLH`,
  `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
  `https://www.sogou.com/web?query=${encodeURIComponent(q)}`,
]) {
  try {
    const r = await fetch(url, {headers:{'User-Agent':UA,'Accept-Language':'zh-CN,zh;q=0.9'}});
    const html = await r.text();
    const m = /<title>([\s\S]*?)<\/title>/.exec(html);
    const algo = (html.match(/b_algo/g)||[]).length;
    const res = (html.match(/c-container/g)||[]).length;
    const vr = (html.match(/vrwrap/g)||[]).length;
    console.log(r.status, 'len', html.length, '| title:', m?.[1].slice(0,40), '| b_algo', algo, '| c-container', res, '| vrwrap', vr);
  } catch (e) { console.log('ERR', url.slice(0,50), e.message.slice(0,50)); }
}
