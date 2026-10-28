// 整页截图结果页（身份条 + 01 + 03），用于 deliverables/assets/art-*.png
// 用法: node .tmp/shoot-article.mjs <url> <out.png> [--probe] [--full] [--to=<cssSelectorId>]
import {openBrowser} from './cdp.mjs';
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const url = process.argv[2];
const out = process.argv[3];
const probeOnly = process.argv.includes('--probe');
const fullPage = process.argv.includes('--full');
const toArg = process.argv.find((a) => a.startsWith('--to='));
const toSel = toArg ? toArg.slice(5) : 'r-article';

const WIDTH = 1920;
const {session, close} = await openBrowser();

const wait = async (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(expr, timeout = 30000, label = expr) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await session.evaluate(expr)) return true;
    await wait(250);
  }
  throw new Error('等待超时: ' + label);
}

try {
  // 1) 先到同源页面写登录态
  await session.send('Emulation.setDeviceMetricsOverride', {width: WIDTH, height: 1400, deviceScaleFactor: 1, mobile: false});
  await session.send('Page.navigate', {url: new URL(url).origin + '/'});
  await waitFor("document.readyState === 'complete'", 20000, 'readyState');
  await session.evaluate("localStorage.setItem('tuijian_user','演示账号')");

  // 2) 打开结果页
  await session.send('Page.navigate', {url});
  await waitFor("document.readyState === 'complete'", 30000, 'result readyState');
  await waitFor("!!document.querySelector('#r-article')", 40000, '#r-article 出现');
  // 03 里必须真有正文（不是"读取中/生成中"）
  await waitFor(`(() => {
    const el = document.querySelector('#r-article');
    if (!el) return false;
    const txt = el.innerText || '';
    return txt.length > 400 && !/正在读取|生成中/.test(document.querySelector('#r-progress')?.innerText || '');
  })()`, 40000, '03 正文渲染完成');

  // 3) 先滚一遍整页触发懒加载，再等图片全部解码（配图不能是灰块）
  await session.evaluate(`(async () => {
    const step = 900, max = document.documentElement.scrollHeight;
    for (let y = 0; y < max; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 300));
    return true;
  })()`);
  try { await waitFor(`[...document.images].every(i => i.complete)`, 30000, '图片加载完成'); } catch { /* 记到 imgReport 里，不中断 */ }
  await wait(1200);

  const imgReport = JSON.parse(await session.evaluate(`JSON.stringify([...document.images].map(i => ({
    src: (i.currentSrc || i.src).slice(-40), complete: i.complete, w: i.naturalWidth, alt: (i.alt || '').slice(0, 12)
  })))`));
  const broken = imgReport.filter((i) => !i.complete || i.w === 0);

  const metrics = JSON.parse(await session.evaluate(`(() => {
    const off = (id) => { const el = document.getElementById(id); if (!el) return null;
      const r = el.getBoundingClientRect(); return {top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY)}; };
    const sticky = document.querySelector('.result-sticky');
    return JSON.stringify({
      viewportW: innerWidth,
      docH: document.documentElement.scrollHeight,
      docW: document.documentElement.scrollWidth,
      hOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      stickyH: sticky ? Math.round(sticky.getBoundingClientRect().height) : 0,
      identity: document.querySelector('.result-sticky-main')?.innerText.replace(/\\s+/g, ' ').trim() || '',
      status: document.querySelector('.result-sticky-status')?.innerText || '',
      meta: document.querySelector('.result-meta-line')?.innerText || '',
      scene: off('r-scene'), basis: off('r-basis'), article: off('r-article'), review: off('r-review'),
      articleLen: document.querySelector('#r-article')?.innerText.length || 0,
      title: document.querySelector('#r-article h1, #r-article .generated-article h2')?.innerText || '',
      deck: document.querySelectorAll('.xhs-card').length,
      figures: document.querySelectorAll('.article-figure').length,
      headings: document.querySelectorAll('.article-heading').length,
      mdMarks: ((document.querySelector('#r-article')?.innerText || '').match(/##|\\*\\*!?\\[/g) || []).length,
      images: document.querySelectorAll('#r-article img').length,
      imagesLoaded: [...document.querySelectorAll('#r-article img')].filter(i => i.complete && i.naturalWidth > 0).length,
      bodyOverflowY: document.body.scrollHeight,
    });
  })()`));

  if (probeOnly) {
    console.log(JSON.stringify({url, ...metrics, brokenImages: broken}, null, 1));
  } else {
    // 截图高度：默认到 03 结束（含身份条 + 01 + 03），--full 则整页
    const bottom = fullPage ? metrics.docH : Math.min(metrics.docH, (metrics.article?.bottom ?? 0) + 28);
    const clip = {x: 0, y: 0, width: WIDTH, height: bottom, scale: 2};
    const cap = await session.send('Page.captureScreenshot', {
      format: 'png', clip, captureBeyondViewport: true, fromSurface: true,
    });
    mkdirSync(dirname(out), {recursive: true});
    const buf = Buffer.from(cap.data, 'base64');
    writeFileSync(out, buf);
    console.log(JSON.stringify({url, out, bytes: buf.length, clipH: bottom, ...metrics, brokenImages: broken}, null, 1));
  }
} finally {
  close();
}
