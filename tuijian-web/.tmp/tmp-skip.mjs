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
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button')]`) ;
} catch (e) { console.log("skip"); } finally { close(); }
