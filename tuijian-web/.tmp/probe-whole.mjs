import {openBrowser, measure} from './cdp.mjs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1680, height: 1050, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1400);
  await session.evaluate(`[...document.querySelectorAll('.wb-scope button')].find(b => b.textContent.includes('整篇')).click()`);
  await sleep(800);
  console.log('步骤:', await session.evaluate(`JSON.stringify({steps: [...document.querySelectorAll('.wb-step h4')].map(h => h.textContent.trim()), btn: document.querySelector('.wb-btn-primary')?.textContent.trim(), disabled: document.querySelector('.wb-btn-primary')?.disabled})`));
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('短一点'))?.click()`);
  await sleep(500);
  console.log('点击前:', await session.evaluate(`JSON.stringify({chips: [...document.querySelectorAll('.wb-chip.is-on')].map(c => c.textContent.trim()), disabled: document.querySelector('.wb-btn-primary')?.disabled})`));
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  await sleep(15000);
  console.log('15 秒后:', await session.evaluate(`JSON.stringify({
    busy: document.querySelector('.wb-busy')?.textContent || document.querySelector('.wb-state-inline')?.textContent || '',
    error: document.querySelector('.wb-error')?.textContent || '',
    cands: document.querySelectorAll('.wb-cands li').length,
    cmp: !!document.querySelector('.wb-cmp'),
    btn: document.querySelector('.wb-btn-primary')?.textContent.trim(),
  })`));
  await sleep(45000);
  console.log('60 秒后:', await session.evaluate(`JSON.stringify({
    error: document.querySelector('.wb-error')?.textContent || '',
    cands: document.querySelectorAll('.wb-cands li').length,
    cmp: !!document.querySelector('.wb-cmp'),
    body: (document.querySelector('.wb-side')?.innerText || '').slice(0, 160),
  })`));
} finally {
  close();
}
