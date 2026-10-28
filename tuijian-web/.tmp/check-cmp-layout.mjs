import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 180) => {
  for (let i = 0; i < sec; i++) { if (await session.evaluate(expr)) return true; await sleep(1000); }
  return false;
};
const shot = async n => {
  const c = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('.tmp/shots/' + n, Buffer.from(c.data, 'base64'));
};
try {
  // 窄屏：两版上下排
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1180, height: 950, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll('.wb-scope button')].find(b => b.textContent.includes('整篇')).click()`);
  await sleep(500);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI'))?.click()`);
  await sleep(500);
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('更口语'))?.click()`);
  await sleep(300);
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  await waitFor(`document.querySelectorAll('.wb-cmp-pane iframe').length === 2`, 180);
  await sleep(1500);
  console.log('窄屏布局:', await session.evaluate(`(() => {
    const panes = [...document.querySelectorAll('.wb-cmp-pane')].map(p => p.getBoundingClientRect());
    return JSON.stringify({stacked: panes.length === 2 && panes[1].top > panes[0].bottom - 10, w: panes.map(p => Math.round(p.width)), stageW: Math.round(document.querySelector('.wb-stage').getBoundingClientRect().width)});
  })()`));
  await shot('r14-cmp-narrow.png');
  // 电脑视图
  await session.evaluate(`[...document.querySelectorAll('.wb-device button')].find(b => b.textContent.includes('电脑')).click()`);
  await sleep(2500);
  console.log('电脑视图:', await session.evaluate(`JSON.stringify({desk: document.querySelectorAll('.wb-cmp-pane .wb-frame.is-desktop').length, frames: [...document.querySelectorAll('.wb-cmp-pane iframe')].map(f => Math.round(f.getBoundingClientRect().width))})`));
  await shot('r14-cmp-desktop.png');
} finally {
  close();
}
