import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => { const c = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false}); writeFileSync(".tmp/shots/" + n, Buffer.from(c.data, "base64")); };
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await sleep(600);
  await session.evaluate(`document.querySelector(".rs-thumb").click()`);
  await sleep(700);
  await shot("r17-img-detail.png");
  await session.evaluate(`document.querySelector(".rs-img-mask").click()`);
  await sleep(300);
  await session.evaluate(`document.querySelector(".wb, .rs-main-btn")?.click()`);
  await measure(session, "http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d", {width: 1440, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1600);
  await session.evaluate(`document.querySelector(".wb .xhs-nav .is-next").click()`);
  await sleep(700);
  await shot("r17-xhs-filled.png");
} finally { close(); }
