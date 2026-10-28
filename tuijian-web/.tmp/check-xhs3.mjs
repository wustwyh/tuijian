import {openBrowser, measure} from './cdp.mjs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 60) => {
  for (let i = 0; i < sec; i++) { if (await session.evaluate(expr)) return true; await sleep(500); }
  return false;
};
try {
  await measure(session, 'http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await waitFor(`!!document.querySelector('.wb .xhs-deck')`, 60);
  console.log('nav 位置:', await session.evaluate(`(() => {
    const deck = document.querySelector('.wb .xhs-deck').getBoundingClientRect();
    const prev = document.querySelector('.wb .xhs-nav .is-prev').getBoundingClientRect();
    const next = document.querySelector('.wb .xhs-nav .is-next').getBoundingClientRect();
    return JSON.stringify({
      deckW: Math.round(deck.width), deckH: Math.round(deck.height),
      prevLeftInset: Math.round(prev.left - deck.left),
      nextRightInset: Math.round(deck.right - next.right),
      prevMidY: Math.round(prev.top + prev.height / 2 - deck.top),
      deckMidY: Math.round(deck.height / 2),
      countPos: document.querySelector('.wb .xhs-count')?.textContent,
    });
  })()`));
  await session.evaluate(`document.querySelector('.wb .xhs-card.is-active .edit-hit')?.click()`);
  await sleep(900);
  console.log('点文字后:', await session.evaluate(`JSON.stringify({selected: document.querySelectorAll('.wb .is-selected').length, outline: getComputedStyle(document.querySelector('.wb .xhs-card.is-active')).outlineStyle})`));
  await session.evaluate(`document.querySelector('.wb .xhs-nav .is-next').click()`);
  await sleep(700);
  console.log('翻页后:', await session.evaluate(`JSON.stringify({selected: document.querySelectorAll('.wb .is-selected').length, idx: document.querySelector('.wb .xhs-count')?.textContent})`));
  await session.evaluate(`document.querySelector('.wb .xhs-card.is-active .edit-hit')?.click()`);
  await sleep(900);
  await session.evaluate(`document.querySelector('.wb .xhs-nav .is-next').click()`);
  await sleep(600);
  console.log('再选再翻:', await session.evaluate(`JSON.stringify({selected: document.querySelectorAll('.wb .is-selected').length})`));
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('预览')).click()`);
  await sleep(2200);
  const frame = `document.querySelector('.phone-frame iframe, .wb-frame iframe')`;
  console.log('预览模式:', await session.evaluate(`JSON.stringify({selected: document.querySelectorAll('.wb .is-selected').length, active: ${frame}?.contentDocument.querySelectorAll('.card.is-active').length})`));
  const before = await session.evaluate(`${frame}.contentDocument.querySelector('.nav-idx').textContent`);
  await session.evaluate(`(() => { const d = ${frame}.contentDocument; d.querySelectorAll('.nav button')[1].click(); })()`);
  await sleep(500);
  const after = await session.evaluate(`${frame}.contentDocument.querySelector('.nav-idx').textContent`);
  console.log('预览翻页:', before, '→', after);
  console.log('预览按钮位置:', await session.evaluate(`(() => {
    const d = ${frame}.contentDocument;
    const deck = d.querySelector('.deck').getBoundingClientRect();
    const a = d.querySelectorAll('.nav button')[0].getBoundingClientRect();
    const b = d.querySelectorAll('.nav button')[1].getBoundingClientRect();
    return JSON.stringify({prevLeftInset: Math.round(a.left - deck.left), nextRightInset: Math.round(deck.right - b.right), prevMidY: Math.round(a.top + a.height/2 - deck.top), deckMidY: Math.round(deck.height/2)});
  })()`));
} finally {
  close();
}
