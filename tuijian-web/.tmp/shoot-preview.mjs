// 截「预览发布稿」弹窗：点按钮 → 等 iframe 渲染出发布稿 → 只截弹窗区域（2 倍清晰度）
// 用法: node .tmp/shoot-preview.mjs <resultUrl> <out.png> [--w=1280 --h=1100]
import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const url = process.argv[2];
const out = process.argv[3];
const arg = (k, d) => Number((process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d);
const W = arg('w', 1280), H = arg('h', 1100);

const {session, close} = await openBrowser();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const r = await measure(session, url, {
    width: W, height: H, settle: 1500, ready: '.result-actions',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });

  const opened = await session.evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /预览发布稿/.test(b.textContent));
    if (!btn) return 'no-button';
    btn.click();
    return 'clicked|' + btn.closest('.result-section-title,section')?.innerText.replace(/\\s+/g,' ').slice(0,40);
  })()`);

  // 等 iframe 出现 + 正文渲染完（不是"正在排版发布稿…"）
  let t0 = Date.now(), ready = false;
  while (Date.now() - t0 < 25000) {
    ready = await session.evaluate(`(() => {
      const f = document.querySelector('iframe.pp-frame');
      const d = f && f.contentDocument;
      if (!d || !d.body) return false;
      return d.body.innerText.length > 120;
    })()`);
    if (ready) break;
    await wait(400);
  }
  await wait(2500);   // base64 图片解码

  const state = JSON.parse(await session.evaluate(`(() => {
    const dialog = document.querySelector('.pp-dialog');
    const frame = document.querySelector('iframe.pp-frame');
    const doc = frame && frame.contentDocument;
    const text = doc ? doc.body.innerText : '';
    const imgs = doc ? [...doc.images] : [];
    const fr = frame ? frame.getBoundingClientRect() : null;
    const visibleImgs = imgs.filter(i => {
      const b = i.getBoundingClientRect();
      return b.bottom > 0 && b.top < (doc?.documentElement.clientHeight || 0) && b.width > 20;
    }).length;
    return JSON.stringify({
      dialog: Boolean(dialog), frame: Boolean(frame),
      loadingText: /正在排版|正在读取/.test(document.querySelector('.pp-body')?.innerText || ''),
      title: document.querySelector('.pp-title strong')?.innerText || '',
      subtitle: document.querySelector('.pp-title span')?.innerText || '',
      foot: document.querySelector('.pp-foot')?.innerText.replace(/\\s+/g, ' ').trim() || '',
      hasDownload: [...document.querySelectorAll('.pp-dialog button')].some(b => /下载 HTML/.test(b.textContent)),
      textLength: text.length,
      headings: doc ? doc.querySelectorAll('h1,h2,h3').length : 0,
      figures: doc ? doc.querySelectorAll('figure').length : 0,
      images: imgs.length, imagesLoaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
      visibleImgs, hasDeck: Boolean(doc && doc.querySelector('.deck')),
      markdownLeaks: (text.match(/##|\\*\\*|!\\[|\\]\\(image_id|\\[f_\\d+\\]/g) || []).length,
      docScrollH: doc ? doc.documentElement.scrollHeight : 0,
      frameW: fr ? Math.round(fr.width) : 0, frameH: fr ? Math.round(fr.height) : 0,
      sample: text.slice(0, 70).replace(/\\s+/g, ' '),
    });
  })()`));

  if (!state.dialog || !state.frame) throw new Error('弹窗/iframe 未出现: ' + JSON.stringify(state));

  const box = JSON.parse(await session.evaluate(`(() => {
    const d = document.querySelector('.pp-dialog'); const b = d.getBoundingClientRect();
    return JSON.stringify({x: b.x, y: b.y, width: b.width, height: b.height});
  })()`));
  const cap = await session.send('Page.captureScreenshot', {
    format: 'png', clip: {x: box.x, y: box.y, width: box.width, height: box.height, scale: 2},
  });
  mkdirSync(dirname(out), {recursive: true});
  const buf = Buffer.from(cap.data, 'base64');
  writeFileSync(out, buf);
  console.log(JSON.stringify({url, out, bytes: buf.length, box, outPx: [Math.round(box.width * 2), Math.round(box.height * 2)],
    opened, ...state, pageErrors: r.errors}, null, 1));
} finally {
  close();
}
