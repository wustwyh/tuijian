import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 200) => { for (let i = 0; i < sec; i++) { if (await session.evaluate(expr)) return true; await sleep(1000); } return false; };
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1500, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1300);
  await session.evaluate(`[...document.querySelectorAll(".wb-scope button")].find(b => b.textContent.includes("整篇")).click()`);
  await sleep(700);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button")].find(b => b.textContent.includes("AI")).click()`);
  await sleep(500);
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("短一点"))?.click()`);
  await waitFor(`!!document.querySelector(".wb-analysis")`, 90);
  await session.evaluate(`document.querySelector(".wb-btn-primary").click()`);
  const ok = await waitFor(`document.querySelectorAll(".wb-cmp-pane iframe").length === 2`, 200);
  console.log("对比已出:", ok);
  console.log("对比条按钮(用上前):", await session.evaluate(`JSON.stringify([...document.querySelectorAll(".wb-cmp-actions button")].map(b => b.textContent.trim()))`));
  await session.evaluate(`document.querySelector(".wb-cmp-actions .wb-btn-apply")?.click()`);
  await sleep(900);
  console.log("对比条按钮(用上后):", await session.evaluate(`JSON.stringify([...document.querySelectorAll(".wb-cmp-actions button")].map(b => b.textContent.trim()))`));
} finally { close(); }
