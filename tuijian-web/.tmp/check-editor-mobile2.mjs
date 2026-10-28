import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  const r1 = await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 390, height: 844, settle: 1800, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='改稿')?.click()`);
  await sleep(600);
  console.log('编辑@390:', await session.evaluate(`JSON.stringify({
    blocks: document.querySelectorAll('.art-block').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    blockW: Math.round(document.querySelector('.art-block')?.getBoundingClientRect().width || 0),
    toolsVisible: document.querySelectorAll('.art-tool').length,
    globalVisible: document.querySelectorAll('.art-global').length,
  })`));
} finally { close(); }
