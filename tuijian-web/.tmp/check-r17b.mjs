import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const setText = async (sel, text) => session.evaluate(`(() => { const t = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set; set.call(t, ${JSON.stringify(text)}); t.dispatchEvent(new Event("input", {bubbles: true})); })()`);
try {
  await measure(session, 'http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1600);
  // 逐张检查是否溢出
  console.log('溢出检查:', await session.evaluate(`JSON.stringify([...document.querySelectorAll('.wb .xhs-card.text')].map((c, i) => {
    const body = c.querySelector('.xhs-body');
    return {i, h: Math.round(body.getBoundingClientRect().height), scroll: body.scrollHeight, over: body.scrollHeight - body.clientHeight};
  }))`));
  // 改一张多段卡
  const tab = `[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('直接改'))`;
  await session.evaluate(`document.querySelectorAll('.wb .xhs-card.text')[1].querySelector('.edit-hit').click()`);
  await sleep(1200);
  await session.evaluate(`${tab}.click()`);
  await sleep(400);
  const before = await session.evaluate(`document.querySelector('.wb-direct')?.value`);
  console.log('多段卡片输入框段落数:', String(before).split(/\n+/).filter(Boolean).length, '| 前 20 字:', String(before).slice(0, 20));
  const edited = String(before).split(/\n+/).map((p, i) => i === 0 ? '【改过】' + p : p).join('\n\n');
  await setText('.wb-direct', edited);
  await sleep(300);
  await session.evaluate(`document.querySelector('.wb-direct-foot .wb-btn-apply').click()`);
  await sleep(900);
  console.log('改后卡面:', await session.evaluate(`document.querySelectorAll('.wb .xhs-card.text')[1].innerText.slice(0, 40)`));
  console.log('正文段数:', await session.evaluate(`(() => { const p = document.querySelector('.wb .xhs-card.text'); return document.querySelectorAll('.wb .xhs-card.text').length; })()`));
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('.tmp/shots/r17-xhs-multi-edit.png', Buffer.from(cap.data, 'base64'));
} finally {
  close();
}
