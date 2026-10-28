import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 120) => {
  for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); }
  return null;
};
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const id = 'b081e220-517b-4241-ac8e-0d5bb2861a71';
try {
  await measure(session, `http://localhost:5173/result/${id}`, {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  console.log('范围:', await session.evaluate(`[...document.querySelectorAll('.wb-scope button')].map(b => b.textContent.trim())`));
  await sleep(500);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI'))?.click()`);
  console.log('历史按钮:', await session.evaluate(`document.querySelector('.wb-history')?.textContent.trim()`));

  // 选一段
  await session.evaluate(`document.querySelector('.wb .generated-article .article-lead')?.click()`);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI'))?.click()`);
  await waitFor(`document.querySelectorAll('.wb-chip-row .wb-chip').length >= 4 ? 1 : 0`, 90);
  console.log('第一步气泡:', await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].map(b => b.textContent.trim())`));
  console.log('自己提需求方框（未点时应为 false）:', await session.evaluate(`!!document.querySelector('.wb-own')`));
  await shot('.tmp/shots/r11-panel-1.png');

  // 点一个气泡
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('更口语') || b.textContent.includes('短一点'))?.click()`);
  await sleep(300);
  console.log('选中气泡:', await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip.is-on')].map(b => b.textContent.trim())`));

  // 点「自己提需求」→ 出现方框
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('自己提需求')).click()`);
  await sleep(400);
  console.log('点按钮后方框:', await session.evaluate(`!!document.querySelector('.wb-own .wb-input')`));
  await session.evaluate(`(() => { const t = document.querySelector('.wb-own .wb-input'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, '别那么多形容词，说清楚能装多少书'); t.dispatchEvent(new Event('input', {bubbles: true})); })()`);
  await sleep(300);

  // 让 AI 梳理
  await session.evaluate(`[...document.querySelectorAll('.wb-btn-soft')].find(b => b.textContent.includes('梳理')).click()`);
  await waitFor(`document.querySelector('.wb-analysis p') ? 1 : 0`, 120);
  console.log('AI 梳理:', await session.evaluate(`document.querySelector('.wb-analysis')?.innerText.replace(/\\n+/g, ' | ').slice(0, 130)`));
  await shot('.tmp/shots/r11-panel-2.png');

  // 开始修改 → 3 个版本
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  const cands = await waitFor(`document.querySelectorAll('.wb-cands li').length || 0`, 120);
  console.log('候选数:', cands, await session.evaluate(`[...document.querySelectorAll('.wb-cands span')].map(s => s.textContent.slice(0, 24))`));
  await shot('.tmp/shots/r11-candidates.png');

  // 采用第 2 版 → 对比
  const beforeText = await session.evaluate(`document.querySelector('.wb .generated-article .article-lead')?.innerText.slice(0, 30)`);
  await session.evaluate(`document.querySelectorAll('.wb-cands li button')[1].click()`);
  await sleep(700);
  console.log('对比卡:', await session.evaluate(`JSON.stringify({
    has: !!document.querySelector('.wb-compare'),
    before: document.querySelector('.wb-compare .is-before p')?.textContent.slice(0, 26),
    after: document.querySelector('.wb-compare .is-after p')?.textContent.slice(0, 26),
  })`));
  await shot('.tmp/shots/r11-compare.png');
  const afterText = await session.evaluate(`document.querySelector('.wb .generated-article .article-lead')?.innerText.slice(0, 30)`);
  console.log('导语变化:', beforeText !== afterText);

  // 整篇重写 → 只出 1 篇
  await session.evaluate(`[...document.querySelectorAll('.wb-scope button')].find(b => b.textContent.includes('整篇')).click()`);
  await sleep(500);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI'))?.click()`);
  await sleep(500);
  console.log('整篇按钮文案:', await session.evaluate(`document.querySelector('.wb-btn-primary')?.textContent.trim()`));
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('短一点'))?.click()`);
  await sleep(300);
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  const whole = await waitFor(`document.querySelectorAll('.wb-cands li').length || 0`, 150);
  console.log('整篇候选数:', whole);

  // 保存 → 历史
  await session.evaluate(`[...document.querySelectorAll('.wb-cands li button')][0]?.click()`);
  await sleep(600);
  await session.evaluate(`document.querySelector('.wb-save').click()`);
  await waitFor(`!document.querySelector('.wb-save')?.textContent.includes('保存中') ? 1 : 0`, 180);
  await sleep(2500);
  console.log('历史数:', await session.evaluate(`document.querySelector('.wb-history')?.textContent.trim()`));
  await session.evaluate(`document.querySelector('.wb-history').click()`);
  await sleep(900);
  console.log('历史列表:', await session.evaluate(`JSON.stringify({
    count: document.querySelectorAll('.wb-revs li').length,
    first: document.querySelector('.wb-revs li')?.innerText.replace(/\\n/g, ' | ').slice(0, 70),
  })`));
  await shot('.tmp/shots/r11-history.png');
  await session.evaluate(`document.querySelector('.wb-rev-restore').click()`);
  await sleep(1200);
  console.log('回溯后:', await session.evaluate(`JSON.stringify({toast: document.querySelector('.wb-toast')?.textContent, dirty: document.querySelector('.wb-dirty')?.textContent})`));
  await session.evaluate(`document.querySelector('.wb-close').click()`);
  await sleep(500);
} finally {
  close();
}
