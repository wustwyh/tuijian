import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 120) => {
  for (let i = 0; i < sec; i++) { if (await session.evaluate(expr)) return true; await sleep(1000); }
  return false;
};
const shot = async n => {
  const c = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('.tmp/shots/' + n, Buffer.from(c.data, 'base64'));
};
try {
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1500, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1400);
  await session.evaluate(`document.querySelector('.wb .generated-article .article-lead')?.click()`);
  await sleep(1500);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI')).click()`);
  await sleep(800);
  console.log('步骤 2 标题:', await session.evaluate(`document.querySelectorAll('.wb-step h4')[1]?.textContent.trim()`));
  // 点气泡 → AI 自动追问
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('更口语'))?.click()`);
  const asked = await waitFor(`document.querySelector('.wb-turn-q') ? 1 : 0`, 90);
  console.log('自动追问:', asked, '|', await session.evaluate(`document.querySelector('.wb-turn-q')?.textContent`));
  console.log('选项:', await session.evaluate(`JSON.stringify([...document.querySelectorAll('.wb-turn .wb-chip')].map(b => b.textContent.trim()))`));
  await shot('r20-turn.png');
  // 点选项 → 可能有第二问，直到出需求
  for (let i = 0; i < 3; i++) {
    const hasAnalysis = await session.evaluate(`!!document.querySelector('.wb-analysis')`);
    if (hasAnalysis) break;
    const hasQ = await session.evaluate(`!!document.querySelector('.wb-turn-q')`);
    if (!hasQ) { await sleep(2000); continue; }
    await session.evaluate(`document.querySelectorAll('.wb-turn .wb-chip')[0].click()`);
    await sleep(4000);
  }
  console.log('需求卡:', await session.evaluate(`document.querySelector('.wb-analysis')?.innerText.replace(/\\n+/g, ' | ').slice(0, 130)`));
  console.log('按钮文案:', await session.evaluate(`document.querySelector('.wb-btn-primary')?.innerText.replace(/\\n/g, ' / ')`));

  // 开始修改 → 3 版 → 用一版 → 保存这一版
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  await waitFor(`document.querySelectorAll('.wb-cands li').length >= 3`, 150);
  await session.evaluate(`document.querySelectorAll('.wb-cands li button')[0].click()`);
  await sleep(600);
  await session.evaluate(`document.querySelector('.wb-btn-apply').click()`);
  await sleep(900);
  console.log('用上后保存键:', await session.evaluate(`JSON.stringify([...document.querySelectorAll('.wb-compare .wb-btn-primary.is-save')].map(b => b.textContent.trim()))`));
  await shot('r20-save-btn.png');
  await session.evaluate(`document.querySelector('.wb-compare .wb-btn-primary.is-save')?.click()`);
  const saved = await waitFor(`document.querySelector('.wb-save')?.textContent.includes('已是最新') ? 1 : 0`, 300);
  console.log('保存完成:', saved, '| 历史:', await session.evaluate(`document.querySelector('.wb-history')?.textContent.trim()`));
} finally {
  close();
}
