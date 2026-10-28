import {openBrowser, measure} from './cdp.mjs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1680, height: 1050, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`window.__errs=[]; window.addEventListener('error', e => window.__errs.push('error: ' + e.message)); window.addEventListener('unhandledrejection', e => window.__errs.push('reject: ' + String(e.reason && e.reason.message || e.reason)));`);
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1400);
  await session.evaluate(`[...document.querySelectorAll('.wb-scope button')].find(b => b.textContent.includes('整篇')).click()`);
  await sleep(800);
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('短一点'))?.click()`);
  await sleep(400);
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  await sleep(20000);
  console.log('errors:', await session.evaluate(`JSON.stringify(window.__errs)`));
  console.log('dom:', await session.evaluate(`JSON.stringify({
    root: document.querySelector('#root')?.children.length,
    wb: !!document.querySelector('.wb'),
    side: (document.querySelector('.wb-side')?.innerText || '').slice(0, 80),
    stage: (document.querySelector('.wb-stage')?.innerText || '').slice(0, 80),
  })`));
} finally {
  close();
}
