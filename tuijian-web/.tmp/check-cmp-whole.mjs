import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 180) => {
  for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); }
  return null;
};
const shot = async n => {
  const c = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('.tmp/shots/' + n, Buffer.from(c.data, 'base64'));
};
try {
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1680, height: 1050, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll('.wb-scope button')].find(b => b.textContent.includes('整篇')).click()`);
  await sleep(500);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI'))?.click()`);
  await sleep(600);
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('短一点'))?.click()`);
  await sleep(400);
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  const cands = await waitFor(`document.querySelectorAll('.wb-cands li').length || 0`, 180);
  console.log('候选:', cands, '| 自动开对比:', await session.evaluate(`!!document.querySelector('.wb-cmp')`));
  await waitFor(`document.querySelectorAll('.wb-cmp-pane iframe').length === 2 && [...document.querySelectorAll('.wb-cmp-pane iframe')].every(f => (f.contentDocument?.body?.innerText || '').length > 60) ? 1 : 0`, 180);
  console.log('两版排版:', await session.evaluate(`(() => {
    const fs = [...document.querySelectorAll('.wb-cmp-pane iframe')];
    return JSON.stringify(fs.map(f => {
      const d = f.contentDocument;
      return {
        chars: (d.body.innerText || '').length,
        pf: d.querySelectorAll('.pf').length,
        imgs: [...d.images].filter(i => i.complete && i.naturalWidth > 0).length,
        imgsTotal: d.images.length,
        head: (d.querySelector('.pf h1, .pf .pf-title, .pf h2')?.textContent || '').slice(0, 18),
      };
    }));
  })()`));
  console.log('两侧框尺寸:', await session.evaluate(`JSON.stringify([...document.querySelectorAll('.wb-cmp-pane iframe')].map(f => { const r = f.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }))`));
  await shot('r14-compare-whole.png');
  // 用右边这一版
  const beforeChars = await session.evaluate(`document.querySelectorAll('.wb-cmp-pane iframe')[0].contentDocument.body.innerText.length`);
  await session.evaluate(`document.querySelector('.wb-cmp-actions .wb-btn-apply').click()`);
  await sleep(2500);
  console.log('用上后:', await session.evaluate(`JSON.stringify({bar: document.querySelector('.wb-cmp-title span')?.textContent, dirty: document.querySelector('.wb-dirty')?.textContent})`));
  console.log('右侧变了吗:', beforeChars !== (await session.evaluate(`document.querySelectorAll('.wb-cmp-pane iframe')[1].contentDocument.body.innerText.length`)) || 'same-length');
  await shot('r14-compare-applied.png');
  // 收起对比
  await session.evaluate(`[...document.querySelectorAll('.wb-cmp-actions .wb-chip')][0].click()`);
  await sleep(1200);
  console.log('收起后:', await session.evaluate(`JSON.stringify({cmp: !!document.querySelector('.wb-cmp'), stage: !!document.querySelector('.wb-stage .pf, .wb-stage iframe')})`));
} finally {
  close();
}
