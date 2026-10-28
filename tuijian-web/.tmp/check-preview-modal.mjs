// 验收「预览发布稿」弹窗：点按钮 → 弹窗出现 → iframe 里真的渲染出发布稿 → Esc 关闭 → 截图。
import {openBrowser, measure} from './cdp.mjs';

const url = process.argv[2];
const shot = process.argv[3] || '.tmp/shots/preview-modal.png';
const {session, close} = await openBrowser();
try {
  const r = await measure(session, url, {width: 1280, height: 900, settle: 1500, ready: '.result-actions', init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const opened = await session.evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /预览发布稿/.test(b.textContent));
    if (!btn) return 'no-button';
    btn.click();
    return 'clicked';
  })()`);
  for (let i = 0; i < 30; i++) { await new Promise((res) => setTimeout(res, 500)); if (await session.evaluate("Boolean(document.querySelector('iframe.pp-frame'))")) break; }
  const state = JSON.parse(await session.evaluate(`(() => {
    const dialog = document.querySelector('.pp-dialog');
    const frame = document.querySelector('iframe.pp-frame');
    const doc = frame && frame.contentDocument;
    const body = doc && doc.body;
    const text = body ? body.innerText : '';
    return JSON.stringify({
      dialog: Boolean(dialog),
      frame: Boolean(frame),
      docSize: doc ? doc.documentElement.outerHTML.length : 0,
      textLength: text.length,
      headings: doc ? doc.querySelectorAll('h1,h2,h3').length : 0,
      figures: doc ? doc.querySelectorAll('figure').length : 0,
      images: doc ? doc.querySelectorAll('img').length : 0,
      imagesLoaded: doc ? [...doc.images].filter(i => i.complete && i.naturalWidth > 0).length : 0,
      hasDeck: Boolean(doc && doc.querySelector('.deck')),
      hasMoment: Boolean(doc && doc.querySelector('.post')),
      scrollH: doc ? doc.documentElement.scrollHeight : 0,
      frameH: frame ? Math.round(frame.getBoundingClientRect().height) : 0,
      dialogW: dialog ? Math.round(dialog.getBoundingClientRect().width) : 0,
      head: document.querySelector('.pp-title')?.innerText || '',
      bodyOverflow: getComputedStyle(document.body).overflow,
      sample: text.slice(0, 80).replace(/\\s+/g, ' '),
    });
  })()`));
  // 截图（弹窗全貌）
  const box = JSON.parse(await session.evaluate(`(() => { const d = document.querySelector('.pp-dialog'); const b = d.getBoundingClientRect(); return JSON.stringify({x:b.x,y:b.y,width:b.width,height:b.height}); })()`));
  const cap = await session.send('Page.captureScreenshot', {format: 'png', clip: {x: box.x, y: box.y, width: box.width, height: box.height, scale: 1}});
  const {writeFileSync, mkdirSync} = await import('node:fs');
  const {dirname} = await import('node:path');
  mkdirSync(dirname(shot), {recursive: true});
  writeFileSync(shot, Buffer.from(cap.data, 'base64'));
  const closed = await session.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    return 'esc';
  })()`);
  await new Promise((res) => setTimeout(res, 400));
  const afterClose = await session.evaluate(`Boolean(document.querySelector('.pp-dialog')) + '|' + document.body.style.overflow`);
  console.log(JSON.stringify({opened, ...state, afterClose, errors: r.errors, screenshot: shot}, null, 1));
} finally {
  close();
}