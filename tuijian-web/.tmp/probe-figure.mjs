import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 45) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
try {
  await measure(session, "http://localhost:5173/result/16ae9440-f38d-450d-8c37-81d6bfc1e46d", {width: 1440, height: 1000, settle: 2000, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('预览发布稿'))?.click()`);
  await sleep(2200);
  await session.evaluate(`[...document.querySelectorAll('.pp-tabs button')].find(b=>b.textContent.includes('改稿'))?.click()`);
  await sleep(1000);
  console.log('before:', await session.evaluate(`JSON.stringify([...document.querySelectorAll('.article-figure img')].map(i=>i.src.slice(-30)))`));
  await session.evaluate(`[...document.querySelectorAll('.edit-hit[data-kind="figure"]')].at(-1).click()`);
  await waitFor(`document.querySelectorAll('.ai-chip').length >= 2`, 40);
  console.log('selected thumb index:', await session.evaluate(`[...document.querySelectorAll('.ai-thumb')].findIndex(t=>t.classList.contains('is-on'))`));
  await session.evaluate(`[...document.querySelectorAll('.ai-chip')].find(b=>b.textContent.includes('换一张图'))?.click()`);
  await sleep(300);
  const thumbs = await session.evaluate(`[...document.querySelectorAll('.ai-thumb img')].map(i=>i.src.slice(-26))`);
  console.log('thumbs:', thumbs.slice(0,4));
  await session.evaluate(`document.querySelectorAll('.ai-thumb')[2]?.click()`);
  await sleep(700);
  console.log('after:', await session.evaluate(`JSON.stringify([...document.querySelectorAll('.article-figure img')].map(i=>i.src.slice(-30)))`));
  console.log('panel still open:', await session.evaluate(`!!document.querySelector('.ai-panel')`), '｜dirty:', await session.evaluate(`!!document.querySelector('.inline-edit-actions .btn-primary')`));
} finally { close(); }
