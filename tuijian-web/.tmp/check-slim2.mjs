import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
try {
  // 新生成 → 观察「生成中」的精简版结果页
  const body = JSON.stringify({productId: '01-鸿蒙电脑/HUAWEI MateBook Pro', platformId: 'tieba', task: '迁资料', format: '问题清单', topicIds: [], materialIds: [], extra: ''});
  const created = await fetch('http://localhost:5173/api/generations', {method: 'POST', headers: {'Content-Type': 'application/json'}, body});
  const job = await created.json();
  console.log('新任务:', job.id);
  writeFileSync('.tmp/last-gen-id.txt', job.id);
  await measure(session, `http://localhost:5173/result/${job.id}`, {
    width: 1440, height: 900, settle: 2500, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  console.log('生成中页:', await session.evaluate(`JSON.stringify({
    wait: !!document.querySelector('.result-wait'),
    waitText: document.querySelector('.result-wait h2')?.textContent,
    buttons: [...document.querySelectorAll('.rs-top button')].map(b => b.textContent.trim()),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`));
  await shot('.tmp/shots/result-slim-pending.png');

  // 已完成页面：从「改稿」进工作台
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1440, height: 950, settle: 2200, ready: '.rs-article',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-text-btn').click()`);
  await sleep(2200);
  console.log('改稿入口进工作台:', await session.evaluate(`!!document.querySelector('.wb')`), '｜tab:', await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b=>b.className.includes('is-on'))?.textContent.trim()`));
  await session.evaluate(`document.querySelector('.wb-close')?.click()`);
  await sleep(600);
  // 顶部按钮
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(2000);
  console.log('顶部入口进工作台:', await session.evaluate(`!!document.querySelector('.wb')`));
  await session.evaluate(`document.querySelector('.wb-close')?.click()`);
  await sleep(400);
  // 核验展开
  await session.evaluate(`document.querySelector('.rs-review .rs-toggle').click()`);
  await sleep(500);
  console.log('核验展开:', await session.evaluate(`JSON.stringify({
    rows: document.querySelectorAll('.verification-row').length,
    questions: document.querySelectorAll('.verification-questions li').length,
    fixButtons: document.querySelectorAll('.fix-action').length,
  })`));
  await shot('.tmp/shots/result-slim-checks.png');
  // 预览发布稿里不该再有篇幅提示
  const html = await session.evaluate(`(async () => {
    const r = await fetch('/api/generations/b081e220-517b-4241-ac8e-0d5bb2861a71/publish');
    const d = await r.json();
    return d.html || '';
  })()`).catch(() => '');
  console.log('发布稿篇幅提示:', html.includes('篇幅提示') || html.includes('plat-warn') ? '仍在' : '已移除', '｜长度', html.length);
} finally {
  close();
}
