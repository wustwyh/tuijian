import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 60) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
const id = "b081e220-517b-4241-ac8e-0d5bb2861a71";
try {
  await measure(session, `http://localhost:5173/result/${id}`, {width: 1440, height: 1000, settle: 2200, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const fixes = await session.evaluate(`document.querySelectorAll('.fix-action').length`);
  console.log('可「按这条改」的建议:', fixes);
  if (fixes) {
    await session.evaluate(`document.querySelector('.fix-action').click()`);
    const cards = await waitFor(`document.querySelectorAll('.art-candidate:not(.is-loading)').length >= 2 ? document.querySelectorAll('.art-candidate:not(.is-loading)').length : 0`, 45);
    console.log('按建议改写候选:', cards, '｜编辑器已开:', await session.evaluate(`!!document.querySelector('.article-editor')`));
    await session.evaluate(`[...document.querySelectorAll('.article-editor-actions button')].find(b=>b.textContent.includes('退出改稿'))?.click()`);
    await sleep(400);
  }
  // 撤回上次保存
  const hasRestore = await session.evaluate(`!!document.querySelector('.restore-bar button')`);
  console.log('撤回入口:', hasRestore);
  if (hasRestore) {
    const t0 = Date.now();
    await session.evaluate(`document.querySelector('.restore-bar button').click()`);
    const notice = await waitFor(`(document.querySelector('.product-notice')?.textContent||'').includes('撤回') ? document.querySelector('.product-notice').textContent : ''`, 90);
    console.log(`撤回 ${Math.round((Date.now()-t0)/1000)}s｜${notice}｜剩余可撤回:`, await session.evaluate(`document.querySelectorAll('.restore-bar').length`));
  }
} finally { close(); }
