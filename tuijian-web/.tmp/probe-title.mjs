import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1600, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1400);
  console.log("标题类:", await session.evaluate(`JSON.stringify([...document.querySelectorAll(".wb .generated-article .edit-hit")].slice(0, 6).map(e => ({cls: e.className, tag: e.tagName, text: e.innerText.slice(0, 16)})))`));
  console.log("撤销按钮:", await session.evaluate(`JSON.stringify([...document.querySelectorAll(".wb button")].map(b => b.className).filter(c => /undo/i.test(c)))`));
} finally { close(); }
