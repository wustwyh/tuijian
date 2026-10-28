import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 90) => {
  for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); }
  return null;
};
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
try {
  const r = await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  console.log('右栏骨架:', await session.evaluate(`JSON.stringify({
    scope: [...document.querySelectorAll('.wb-scope button')].map(b => b.textContent.trim() + (b.className.includes('is-on') ? '★' : '')),
    steps: [...document.querySelectorAll('.wb-step h4')].map(h => h.textContent.trim()),
    hasInput: !!document.querySelector('.wb-input'),
    empty: !!document.querySelector('.wb-empty'),
  })`));
  // 点导语
  await session.evaluate(`document.querySelector('.wb .generated-article h1.edit-hit, .wb .generated-article .article-lead')?.click()`);
  await sleep(600);
  console.log('选中:', await session.evaluate(`document.querySelector('.wb-target-head')?.textContent.trim()`));
  // 等关键词加载完（选中段落时自动拉）再点提需求，避免按钮还在 busy
  await waitFor(`document.querySelectorAll('.wb-chips .wb-chip').length >= 3 ? 1 : 0`, 90);
  // 1 提需求
  console.log('按钮状态:', await session.evaluate(`JSON.stringify([...document.querySelectorAll('.wb-btn-soft')].map(b => [b.textContent.trim(), b.disabled]))`));
  await session.evaluate(`[...document.querySelectorAll('.wb-btn-soft')].find(b => b.textContent.includes('3 条改法')).click()`);
  const reqs = await waitFor(`document.querySelectorAll('.wb-reqs button').length || 0`, 90);
  console.log('AI 改法条数:', reqs, await session.evaluate(`[...document.querySelectorAll('.wb-reqs b')].map(b => b.textContent.trim())`));
  await shot('.tmp/shots/wb-panel-req.png');
  const before = await session.evaluate(`document.querySelector('.wb .generated-article')?.innerText.slice(0, 40)`);
  await session.evaluate(`document.querySelectorAll('.wb-reqs button')[0].click()`);
  await sleep(400);
  console.log('选中需求:', await session.evaluate(`document.querySelector('.wb-analysis-req')?.textContent.trim()`));
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  await waitFor(`document.querySelector('.wb-cand')?.textContent.includes('换一版') ? 1 : 0`, 90);
  await sleep(800);
  const after = await session.evaluate(`document.querySelector('.wb .generated-article')?.innerText.slice(0, 40)`);
  console.log('重写生效:', before !== after);
  console.log('  前:', before);
  console.log('  后:', after);
  console.log('候选面板:', await session.evaluate(`document.querySelector('.wb-cand p')?.textContent.trim()`));
  await shot('.tmp/shots/wb-panel-result.png');

  // 2 说一句 → AI 分析
  await session.evaluate(`(() => {
    const ta = document.querySelector('.wb-input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '别那么多形容词，说清楚能装多少书');
    ta.dispatchEvent(new Event('input', {bubbles: true}));
  })()`);
  await sleep(400);
  await session.evaluate(`[...document.querySelectorAll('.wb-btn-soft')].find(b => b.textContent.includes('分析这条需求')).click()`);
  await waitFor(`document.querySelector('.wb-analysis p em') ? 1 : 0`, 90);
  console.log('分析结果:', await session.evaluate(`document.querySelector('.wb-analysis')?.innerText.replace(/\\n+/g, ' | ').slice(0, 150)`));
  await shot('.tmp/shots/wb-panel-analyze.png');

  // 3 整篇切换
  await session.evaluate(`[...document.querySelectorAll('.wb-scope button')].find(b => b.textContent.includes('整篇')).click()`);
  await sleep(600);
  console.log('整篇:', await session.evaluate(`JSON.stringify({
    target: document.querySelector('.wb-target-head')?.textContent.trim(),
    steps: document.querySelectorAll('.wb-step h4').length,
  })`));
  console.log('错误:', JSON.stringify(r.errors));
} finally {
  close();
}
