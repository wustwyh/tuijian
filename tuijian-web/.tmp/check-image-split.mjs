import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const waitFor = async (expr, sec = 60) => {
  for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); }
  return null;
};
try {
  const r = await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  console.log('错误:', JSON.stringify(r.errors));
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  console.log('工作台预览 iframe:', await session.evaluate(`JSON.stringify({
    frameW: Math.round(document.querySelector('.wb-frame iframe')?.getBoundingClientRect().width || 0),
  })`));
  await shot('.tmp/shots/wb-publish-new.png');
  // 切到修改，点图片
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  console.log('修改态块数:', await session.evaluate(`document.querySelectorAll('.edit-hit').length`));
  const imgPick = await session.evaluate(`(() => {
    const el = document.querySelector('.article-shot.edit-hit');
    if (!el) return 'none';
    el.click();
    return 'clicked';
  })()`);
  await sleep(1200);
  console.log('点图片 →', imgPick, await session.evaluate(`JSON.stringify({
    panel: document.querySelector('.wb-panel-image') ? 'image' : document.querySelector('.wb-panel') ? 'text' : 'none',
    head: document.querySelector('.wb-panel-head strong')?.textContent,
    chips: [...document.querySelectorAll('.wb-panel-image .wb-chip')].map(c => c.textContent.trim()),
    keywordChips: document.querySelectorAll('.wb-chips .wb-chip').length,
    hasPreview: !!document.querySelector('.wb-image-preview img'),
  })`));
  await shot('.tmp/shots/wb-image-panel.png');
  // 换图
  await session.evaluate(`[...document.querySelectorAll('.wb-panel-image .wb-chip')].find(c => c.textContent.includes('换一张图')).click()`);
  await sleep(600);
  console.log('候选图:', await session.evaluate(`document.querySelectorAll('.wb-thumb').length`));
  const before = await session.evaluate(`document.querySelector('.article-shot img')?.src.slice(-24)`);
  await session.evaluate(`document.querySelectorAll('.wb-thumb')[1]?.click()`);
  await sleep(800);
  const after = await session.evaluate(`document.querySelectorAll('.article-shot img')[0]?.src.slice(-24)`);
  console.log('换图生效:', before !== after, '｜脏标记:', await session.evaluate(`document.querySelector('.wb-save')?.textContent.trim()`));
  // 点图注 → 文字流程
  await session.evaluate(`document.querySelector('.article-caption.edit-hit')?.click()`);
  const kw = await waitFor(`document.querySelectorAll('.wb-chips .wb-chip').length >= 3 ? document.querySelectorAll('.wb-chips .wb-chip').length : 0`, 40);
  console.log('点图注 → 面板:', await session.evaluate(`JSON.stringify({
    panel: document.querySelector('.wb-panel-image') ? 'image' : 'text',
    head: document.querySelector('.wb-panel-head strong')?.textContent,
  })`), '｜关键词:', kw);
  // 撤回全部（不保存）
  await session.evaluate(`document.querySelector('.wb-close').click()`);
  await sleep(600);
  console.log('关闭后是否回到原界面:', await session.evaluate(`!!document.querySelector('.rs-top')`));
} finally {
  close();
}
