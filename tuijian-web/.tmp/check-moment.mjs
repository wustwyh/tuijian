import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const id = 'f2f1dd63-dc9d-4be1-a7d3-75d462cd94d1';
const base = 'http://localhost:5173';
for (let i = 0; i < 150; i++) {
  const j = await (await fetch(`${base}/api/generations/${id}`)).json();
  if (j.status === 'succeeded' || j.status === 'failed') { console.log('状态:', j.status, '| 字数:', j.result?.article?.body?.length); break; }
  await new Promise(r => setTimeout(r, 3000));
}
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
try {
  await measure(session, `${base}/result/${id}`, {
    width: 1440, height: 980, settle: 3200, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3400);
  await session.evaluate(`[...document.querySelectorAll('.wb-device button')].find(b => b.textContent.includes('电脑')).click()`);
  await sleep(1500);
  console.log('预览（电脑）:', await session.evaluate(`(() => {
    const f = document.querySelector('.wb-frame iframe'); const d = f.contentDocument;
    const pf = d.querySelector('.pf'), pr = pf?.getBoundingClientRect(), vw = d.documentElement.clientWidth;
    const t = d.querySelector('.pf-body')?.innerText || '';
    const i = t.indexOf('…');
    return JSON.stringify({
      frameW: Math.round(f.getBoundingClientRect().width),
      pfW: Math.round(pr?.width || 0), centered: pr ? Math.abs(pr.left - (vw - pr.right)) < 3 : null,
      hasEllipsis: i >= 0, ellipsisTail: i >= 0 ? t.slice(i, i + 12) : null,
      expandLink: !!d.querySelector('.moment-more summary'),
    });
  })()`));
  await shot('.tmp/shots/r9-moment-publish.png');
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1600);
  console.log('修改（电脑）:', await session.evaluate(`JSON.stringify({
    full: !!document.querySelector('.wb-render-inner .moment-text.is-full'),
    details: !!document.querySelector('.wb-render-inner .moment-more'),
    textLen: (document.querySelector('.wb-render-inner .moment-text.is-full')?.innerText || '').length,
    ellipsis: (document.querySelector('.wb-render-inner .moment-text.is-full')?.innerText || '').includes('…'),
    pfW: Math.round(document.querySelector('.wb-render-inner .pf')?.getBoundingClientRect().width || 0),
  })`));
  await shot('.tmp/shots/r9-moment-edit.png');
} finally {
  close();
}
