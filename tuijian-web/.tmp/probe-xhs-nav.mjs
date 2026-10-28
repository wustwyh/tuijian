import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d", {width: 1440, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(2500);
  console.log(await session.evaluate(`JSON.stringify({
    deck: document.querySelectorAll(".xhs-deck").length,
    nav: document.querySelectorAll(".xhs-nav").length,
    navBtns: document.querySelectorAll(".xhs-nav button").length,
    prev: document.querySelectorAll(".xhs-nav .is-prev").length,
    count: document.querySelector(".xhs-count")?.textContent,
    navParent: document.querySelector(".xhs-nav")?.parentElement?.className,
  })`));
} finally { close(); }
