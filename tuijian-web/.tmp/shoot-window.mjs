// 按平台展示风格取景：滚到指定分段，截一屏（横版/竖版按平台定），sticky 身份条自动留在顶部。
// 用法: node .tmp/shoot-window.mjs <url> <out.png> --w=1600 --h=1200 [--at=#r-article]
import {openBrowser} from './cdp.mjs';
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const url = process.argv[2];
const out = process.argv[3];
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] ?? d;
const W = Number(arg('w', 1600));
const H = Number(arg('h', 1200));
const AT = arg('at', '#r-article');

const {session, close} = await openBrowser();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(expr, timeout = 30000, label = expr) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await session.evaluate(expr)) return true; await wait(250); }
  throw new Error('等待超时: ' + label);
}

// 视口内元素坐标 + 保护区域（卡片/配图不能被下边缘切断）
const MEASURE = `(() => {
  const h = innerHeight;
  const box = (el) => { const r = el.getBoundingClientRect(); return {top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height)}; };
  const sticky = document.querySelector('.result-sticky');
  const sec = document.querySelector(${JSON.stringify(AT)});
  const prot = [...document.querySelectorAll('.xhs-card, .article-figure, .article-tags, .generated-article h2, .article-cta')].map(box);
  const imgs = [...document.querySelectorAll(${JSON.stringify(AT)} + ' img')].map(i => ({...box(i), ok: i.complete && i.naturalWidth > 0}));
  return JSON.stringify({
    scrollY: Math.round(scrollY), vh: h,
    sticky: sticky ? box(sticky) : null,
    stickyText: document.querySelector('.result-sticky-main')?.innerText.replace(/\\s+/g, ' ').trim() || '',
    status: document.querySelector('.result-sticky-status')?.innerText || '',
    sectionTop: sec ? box(sec).top : null,
    sectionNo: sec ? (sec.querySelector('.result-section-no')?.innerText || '') : '',
    sectionTitle: sec ? (sec.querySelector('.result-section-title')?.innerText || '').replace(/\\s+/g, ' ').trim() : '',
    protect: prot, imgs,
    cards: [...document.querySelectorAll('.xhs-card')].filter(c => { const b = c.getBoundingClientRect(); return b.top >= 0 && b.bottom <= h; }).length,
    figuresFully: [...document.querySelectorAll('.article-figure')].filter(c => { const b = c.getBoundingClientRect(); return b.top >= 0 && b.bottom <= h; }).length,
    picsCut: [...document.querySelectorAll(${JSON.stringify(AT)} + ' img')].filter(i => { const b = i.getBoundingClientRect(); return b.top < h - 2 && b.bottom > h + 2; }).length,
    hOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    articleH: sec ? Math.round(sec.getBoundingClientRect().height) : null,
    visibleChars: (() => {
      // 按可见高度加权：单段长文也能算出真实可见字数
      let n = 0;
      for (const el of document.querySelectorAll(${JSON.stringify(AT)} + ' p, ' + ${JSON.stringify(AT)} + ' h2, ' + ${JSON.stringify(AT)} + ' h3, ' + ${JSON.stringify(AT)} + ' .xhs-body, ' + ${JSON.stringify(AT)} + ' .xhs-cover-text')) {
        const b = el.getBoundingClientRect();
        if (b.height <= 0) continue;
        const over = Math.max(0, Math.min(b.bottom, h) - Math.max(b.top, 0));
        n += (el.innerText || '').length * (over / b.height);
      }
      return Math.round(n);
    })(),
    totalChars: sec ? sec.innerText.length : null,
  });
})()`;

async function layout(w, h) {
  await session.send('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 2, mobile: w < 700});
  await wait(400);
}
async function scrollToSection() {
  // 粗定位：先滚到分段附近
  await session.evaluate(`(() => {
    const sec = document.querySelector(${JSON.stringify(AT)});
    scrollTo(0, sec.getBoundingClientRect().top + scrollY - 260);
    return true;
  })()`);
  await wait(500);
  // 精定位：让分段标题落在 sticky 身份条下方（sticky 粘住后占 64..64+h）
  for (let i = 0; i < 3; i++) {
    const delta = await session.evaluate(`(() => {
      const sec = document.querySelector(${JSON.stringify(AT)});
      const st = document.querySelector('.result-sticky');
      const gap = 18;
      const want = (st ? st.getBoundingClientRect().bottom : 0) + gap;
      return Math.round(sec.getBoundingClientRect().top - want);
    })()`);
    if (Math.abs(delta) <= 2) break;
    await session.evaluate(`scrollBy(0, ${delta})`);
    await wait(350);
  }
  await wait(300);
}

try {
  await layout(W, H);
  await session.send('Page.navigate', {url: new URL(url).origin + '/'});
  await waitFor("document.readyState === 'complete'", 20000, 'readyState');
  await session.evaluate("localStorage.setItem('tuijian_user','演示账号')");
  await session.send('Page.navigate', {url});
  await waitFor("document.readyState === 'complete'", 30000, 'result readyState');
  await waitFor(`!!document.querySelector(${JSON.stringify(AT)})`, 40000, AT + ' 出现');
  await waitFor(`(() => { const el = document.querySelector(${JSON.stringify(AT)}); return el && el.innerText.length > 300; })()`, 40000, '正文渲染');
  // 滚一遍触发懒加载，再回到目标位置（图片才会真正下载）
  await session.evaluate(`(async () => { const max = document.documentElement.scrollHeight;
    for (let y = 0; y < max; y += 800) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } return true; })()`);
  await wait(800);

  await scrollToSection();
  await waitFor(`[...document.querySelectorAll(${JSON.stringify(AT)} + ' img')].every(i => i.complete)`, 20000, '图片加载');

  // 微调高度：下边缘不许切在卡片/配图中间
  let m = JSON.parse(await session.evaluate(MEASURE));
  let finalH = H;
  const cut = m.protect.filter((b) => b.top < H - 4 && b.bottom > H + 4);
  if (cut.length) {
    const next = Math.min(...cut.map((b) => b.top - 12)).valueOf();
    if (next > H * 0.6) finalH = Math.round(next);
  }
  if (finalH !== H) { await layout(W, finalH); await scrollToSection(); await wait(600); m = JSON.parse(await session.evaluate(MEASURE)); }

  const cap = await session.send('Page.captureScreenshot', {format: 'png'});
  mkdirSync(dirname(out), {recursive: true});
  const buf = Buffer.from(cap.data, 'base64');
  writeFileSync(out, buf);

  console.log(JSON.stringify({
    url, out, bytes: buf.length, frame: [W, finalH], outPx: [W * 2, finalH * 2],
    sticky: m.sticky, sectionTop: m.sectionTop, stickyText: m.stickyText, status: m.status,
    section: m.sectionTitle, sectionNo: m.sectionNo,
    cardsFullyVisible: m.cards, figuresFullyVisible: m.figuresFully, picsCutAtEdge: m.picsCut,
    articleHeight: m.articleH, visibleChars: m.visibleChars + '/' + m.totalChars,
    imgsLoaded: m.imgs.filter(i => i.ok).length + '/' + m.imgs.length,
    hOverflow: m.hOverflow,
  }, null, 1));
} finally {
  close();
}
