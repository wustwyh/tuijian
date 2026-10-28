import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const base = 'http://localhost:5173';
const opts = await (await fetch(base + '/api/compose-options')).json();
const products = (await (await fetch(base + '/api/products')).json()).products;
const audiences = (await (await fetch(base + '/api/audiences')).json()).audiences;
const compose = JSON.stringify({
  productId: products[0].id, audienceId: audiences[0]?.id || null, platformId: 'xhs',
  task: opts.tasks[0], format: opts.formats[0], topicIds: [opts.topics[0].id],
  extra: '', materialIncludedIds: [], materialExcludedIds: [],
});
const waitFor = async (expr, sec = 70) => {
  for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); }
  return null;
};
try {
  const r = await measure(session, `${base}/create/discovery`, {
    width: 1440, height: 980, settle: 2400, ready: '.dc',
    init: [`localStorage.setItem('tuijian_user','演示账号')`, `sessionStorage.setItem('tuijian_compose', ${JSON.stringify(compose)})`, `sessionStorage.removeItem('tuijian_discovery_v3')`],
  });
  console.log('错误:', JSON.stringify(r.errors));
  console.log('空态:', await session.evaluate(`JSON.stringify({
    title: document.querySelector('.dc-head h2')?.textContent,
    steps: [...document.querySelectorAll('.steps a, .steps span')].map(s => s.textContent.trim()).slice(0, 6),
    emptyShown: !!document.querySelector('.dc-empty'),
    startBtn: document.querySelector('.dc-start')?.textContent.trim(),
    intro: document.querySelectorAll('.dc-intro-grid > div').length,
  })`));
  await shot('.tmp/shots/discovery-empty.png');

  await session.evaluate(`document.querySelector('.dc-start').click()`);
  const q1 = await waitFor(`document.querySelector('.dc-question h4')?.textContent || ''`);
  console.log('第一问:', String(q1).slice(0, 60));
  console.log('开场:', await session.evaluate(`document.querySelector('.dc-bubble.is-ai')?.textContent.slice(0, 50)`));
  await shot('.tmp/shots/discovery-q1.png');

  await session.evaluate(`[...document.querySelectorAll('.dc-option')].find(b => !b.disabled)?.click()`);
  const q2 = await waitFor(`document.querySelectorAll('.dc-question').length >= 2 ? [...document.querySelectorAll('.dc-question h4')].pop().textContent : ''`);
  console.log('第二问:', String(q2).slice(0, 60));
  console.log('我的回答气泡:', await session.evaluate(`document.querySelector('.dc-bubble.is-me')?.textContent`));
  console.log('轮次/维度:', await session.evaluate(`JSON.stringify({rounds: document.querySelector('.dc-rounds')?.textContent, covered: document.querySelector('.dc-covered')?.textContent})`));

  await session.evaluate(`(() => {
    const el = document.querySelector('.dc-input-wrap input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, '我更想让第一次换机的家长看懂，不需要太专业的词');
    el.dispatchEvent(new Event('input', {bubbles: true}));
  })()`);
  await sleep(300);
  await session.evaluate(`document.querySelector('.dc-send').click()`);
  const q3 = await waitFor(`document.querySelectorAll('.dc-question').length >= 3 ? [...document.querySelectorAll('.dc-question h4')].pop().textContent : ''`);
  console.log('第三问:', String(q3).slice(0, 60));
  await shot('.tmp/shots/discovery-q3.png');

  await session.evaluate(`document.querySelector('.dc-finish').click()`);
  const summary = await waitFor(`document.querySelector('.dc-summary p')?.textContent || ''`, 90);
  console.log('摘要:', String(summary).slice(0, 80));
  await shot('.tmp/shots/discovery-summary.png');
  await session.evaluate(`[...document.querySelectorAll('.dc-summary-actions button')].find(b => b.textContent.includes('填入')).click()`);
  await sleep(600);
  console.log('写入其他要求:', await session.evaluate(`JSON.parse(sessionStorage.getItem('tuijian_compose')).extra.slice(0, 50)`));
  console.log('按钮回执:', await session.evaluate(`[...document.querySelectorAll('.dc-summary-actions button')].map(b=>b.textContent.trim())`));
  await session.send('Page.reload');
  await sleep(2600);
  console.log('刷新后:', await session.evaluate(`JSON.stringify({questions: document.querySelectorAll('.dc-question').length, summary: !!document.querySelector('.dc-summary'), rounds: document.querySelector('.dc-rounds')?.textContent})`));
  console.log('错误(最终):', JSON.stringify(r.errors));
} finally {
  close();
}
