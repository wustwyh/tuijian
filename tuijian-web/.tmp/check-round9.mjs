import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const open = async (id) => {
  await measure(session, `http://localhost:5173/result/${id}`, {
    width: 1440, height: 980, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
};
const geo = () => session.evaluate(`(() => {
  const f = document.querySelector('.wb-frame iframe');
  const stage = document.querySelector('.wb-stage').getBoundingClientRect();
  if (f) {
    const d = f.contentDocument, pf = d.querySelector('.pf'), fr = f.getBoundingClientRect(), pr = pf?.getBoundingClientRect();
    return JSON.stringify({
      mode: 'publish',
      stageW: Math.round(stage.width), frameW: Math.round(fr.width), frameLeft: Math.round(fr.left - stage.left),
      pfW: Math.round(pr?.width || 0), pfLeft: Math.round((pr?.left || 0)) ,
      centered: pr ? Math.abs((pr.left) - (d.documentElement.clientWidth - pr.right)) < 3 : null,
      name: d.querySelector('.pf-name')?.textContent,
      follow: !!d.querySelector('.pf-follow'),
    });
  }
  const pf = document.querySelector('.wb-render-inner .pf');
  const pr = pf?.getBoundingClientRect(), sr = document.querySelector('.wb-render-inner')?.getBoundingClientRect();
  return JSON.stringify({
    mode: 'edit', stageW: Math.round(stage.width),
    sheetW: Math.round(sr?.width || 0), pfW: Math.round(pr?.width || 0),
    centeredInSheet: pr && sr ? Math.abs((pr.left - sr.left) - (sr.right - pr.right)) < 3 : null,
    name: document.querySelector('.wb-render-inner .pf-name')?.textContent,
    cards: document.querySelectorAll('.wb-render-inner .xhs-card').length,
    activeCards: [...document.querySelectorAll('.wb-render-inner .xhs-card')].filter(c => getComputedStyle(c).display !== 'none').length,
    nav: (() => { const n = document.querySelector('.wb-render-inner .xhs-nav'); return n ? getComputedStyle(n).display : 'missing'; })(),
    outline: (() => { const c = document.querySelector('.wb-render-inner .xhs-card.is-active'); return c ? getComputedStyle(c).outlineStyle + ' ' + getComputedStyle(c).outlineColor : 'none'; })(),
  });
})()`);
try {
  // 公众号：电脑预览 + 电脑修改
  await open('b081e220-517b-4241-ac8e-0d5bb2861a71');
  await session.evaluate(`[...document.querySelectorAll('.wb-device button')].find(b => b.textContent.includes('电脑')).click()`);
  await sleep(1400);
  console.log('公众号 电脑预览:', await geo());
  await shot('.tmp/shots/r9-wechat-preview.png');
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1400);
  console.log('公众号 电脑修改:', await geo());
  await shot('.tmp/shots/r9-wechat-edit.png');

  // 小红书：电脑 + 手机，卡片数与导航、高亮
  await session.evaluate(`document.querySelector('.wb-close').click()`);
  await sleep(600);
  await open('4c0c91ef-2809-4034-9b88-f10cba7ce63d');
  await session.evaluate(`[...document.querySelectorAll('.wb-device button')].find(b => b.textContent.includes('电脑')).click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1600);
  console.log('小红书 电脑修改:', await geo());
  console.log('小红书 卡片尺寸:', await session.evaluate(`(() => { const c = document.querySelector('.wb-render-inner .xhs-card.is-active'); const r = c?.getBoundingClientRect(); return JSON.stringify({w: Math.round(r?.width || 0), h: Math.round(r?.height || 0)}); })()`));
  await shot('.tmp/shots/r9-xhs-desktop.png');
  await session.evaluate(`document.querySelectorAll('.wb-render-inner .xhs-nav button')[1].click()`);
  await sleep(600);
  console.log('翻页后:', await session.evaluate(`document.querySelector('.wb-render-inner .xhs-nav span')?.textContent`));
  // 手机
  await session.evaluate(`[...document.querySelectorAll('.wb-device button')].find(b => b.textContent.includes('手机')).click()`);
  await sleep(1400);
  console.log('小红书 手机修改:', await geo());
  console.log('手机卡片尺寸:', await session.evaluate(`(() => { const c = document.querySelector('.phone-frame .xhs-card.is-active'); const r = c?.getBoundingClientRect(); return JSON.stringify({w: Math.round(r?.width || 0), h: Math.round(r?.height || 0)}); })()`));
  await shot('.tmp/shots/r9-xhs-phone.png');
} finally {
  close();
}
