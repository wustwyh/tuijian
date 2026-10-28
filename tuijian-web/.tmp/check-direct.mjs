import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => {
  const c = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('.tmp/shots/' + n, Buffer.from(c.data, 'base64'));
};
const setText = async (selector, text) => session.evaluate(`(() => {
  const t = document.querySelector(${JSON.stringify(selector)});
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  set.call(t, ${JSON.stringify(text)});
  t.dispatchEvent(new Event('input', {bubbles: true}));
})()`);
try {
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1600, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  await session.evaluate(`document.querySelector('.wb .generated-article .article-lead')?.click()`);
  await sleep(1500);
  console.log('页签:', await session.evaluate(`JSON.stringify({tabs: [...document.querySelectorAll('.wb-tabbar button')].map(b => b.textContent.trim() + (b.classList.contains('is-on') ? '*' : '')), textarea: !!document.querySelector('.wb-direct'), value: document.querySelector('.wb-direct')?.value.slice(0, 30), steps: document.querySelectorAll('.wb-step h4').length})`));
  await shot('r15-direct-default.png');

  // 直接改导语：加两个字
  const original = await session.evaluate(`document.querySelector('.wb-direct').value`);
  const lead0 = await session.evaluate(`document.querySelector('.wb .generated-article .article-lead')?.innerText.slice(0, 30)`);
  await setText('.wb-direct', original.replace(/^/, '真的，'));
  await sleep(300);
  await session.evaluate(`[...document.querySelectorAll('.wb-direct-foot .wb-btn-apply')][0].click()`);
  await sleep(900);
  const lead1 = await session.evaluate(`document.querySelector('.wb .generated-article .article-lead')?.innerText.slice(0, 30)`);
  console.log('直接改生效:', lead0 !== lead1, '|', JSON.stringify({before: lead0, after: lead1}));
  console.log('状态:', await session.evaluate(`JSON.stringify({dirty: document.querySelector('.wb-dirty')?.textContent, toast: document.querySelector('.wb-toast')?.textContent, areaAfter: document.querySelector('.wb-direct')?.value.slice(0, 20)})`));

  // 切到 AI 页签，三步还在
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI')).click()`);
  await sleep(600);
  console.log('AI 页签:', await session.evaluate(`JSON.stringify({steps: [...document.querySelectorAll('.wb-step h4')].map(h => h.textContent.trim()), direct: !!document.querySelector('.wb-direct')})`));
  await shot('r15-ai-tab.png');

  // 改标题
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('直接改')).click()`);
  await sleep(400);
  await session.evaluate(`document.querySelector('.wb .generated-article h1, .wb .generated-article .article-title')?.click()`);
  await sleep(900);
  const title0 = await session.evaluate(`document.querySelector('.wb-direct')?.value.slice(0, 24)`);
  await setText('.wb-direct', title0.replace(/$/, '，轻到能塞进书包'));
  await sleep(300);
  await session.evaluate(`[...document.querySelectorAll('.wb-direct-foot .wb-btn-apply')][0].click()`);
  await sleep(900);
  console.log('标题改:', await session.evaluate(`JSON.stringify({now: document.querySelector('.wb .generated-article h1, .wb .generated-article .article-title')?.innerText.slice(0, 34), dirty: document.querySelector('.wb-dirty')?.textContent})`));
  await shot('r15-direct-title.png');

  // 撤销
  await session.evaluate(`document.querySelector('.wb-undo')?.click()`);
  await sleep(700);
  console.log('撤销后标题:', await session.evaluate(`document.querySelector('.wb .generated-article h1, .wb .generated-article .article-title')?.innerText.slice(0, 26)`));
} finally {
  close();
}
