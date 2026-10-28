import {openBrowser, measure} from './cdp.mjs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 180) => {
  for (let i = 0; i < sec; i++) { if (await session.evaluate(expr)) return true; await sleep(1000); }
  return false;
};
try {
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1500);
  await session.evaluate(`document.querySelector('.wb .generated-article .article-lead')?.click()`);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabbar button')].find(b => b.textContent.includes('AI'))?.click()`);
  await sleep(2500);
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('短一点'))?.click()`);
  await sleep(400);
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  await waitFor(`document.querySelectorAll('.wb-cands li').length >= 3`, 180);
  console.log('段落模式:', await session.evaluate(`JSON.stringify({
    cands: document.querySelectorAll('.wb-cands li').length,
    cmpStage: !!document.querySelector('.wb-cmp'),
    cmpRow: !!document.querySelector('.wb-compare-row'),
    before: document.querySelector('.wb-compare-row .is-before p')?.textContent.slice(0, 24),
    after: document.querySelector('.wb-compare-row .is-after p')?.textContent.slice(0, 24),
  })`));
} finally {
  close();
}

