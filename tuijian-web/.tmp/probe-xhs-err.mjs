import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  const r = await measure(session, "http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d", {width: 1440, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(2500);
  console.log("errors:", JSON.stringify(r.errors).slice(0, 500));
  console.log("stage html:", await session.evaluate(`document.querySelector(".wb-stage")?.innerHTML.slice(0, 300)`));
  console.log("cards:", await session.evaluate(`document.querySelectorAll(".xhs-card").length`), "deck:", await session.evaluate(`document.querySelectorAll(".xhs-deck").length`));
} finally { close(); }
