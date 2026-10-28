import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1200);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(1500);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button")].find(b => b.textContent.includes("AI"))?.click()`);
  await sleep(600);
  console.log("按钮文案:", await session.evaluate(`document.querySelector(".wb-btn-primary")?.textContent.trim()`));
  await session.evaluate(`[...document.querySelectorAll(".wb-scope button")].find(b => b.textContent.includes("整篇")).click()`);
  await sleep(500);
  console.log("整篇:", await session.evaluate(`document.querySelector(".wb-btn-primary")?.textContent.trim()`));
  console.log("面板括号残留:", await session.evaluate(`JSON.stringify((document.querySelector(".wb-side")?.innerText || "").match(/（[^）]*）|\\\\([^)]*\\\\)/g) || [])`));
} finally { close(); }
