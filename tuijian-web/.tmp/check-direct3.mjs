import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const setText = async (sel, text) => session.evaluate(`(() => { const t = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set; set.call(t, ${JSON.stringify(text)}); t.dispatchEvent(new Event("input", {bubbles: true})); })()`);
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1600, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1300);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(900);
  await setText(".wb-direct", "我改了一半但没保存");
  await sleep(300);
  // 换到另一段：输入框应回到新段原文
  await session.evaluate(`document.querySelectorAll(".wb .generated-article .article-para")[0]?.click()`);
  await sleep(900);
  console.log("换段后输入框:", await session.evaluate(`document.querySelector(".wb-direct")?.value.slice(0, 26)`), "| 期望是新段原文");
  // 整篇 + 直接改
  await session.evaluate(`[...document.querySelectorAll(".wb-scope button")].find(b => b.textContent.includes("整篇")).click()`);
  await sleep(700);
  console.log("整篇直接改:", await session.evaluate(`JSON.stringify({len: document.querySelector(".wb-direct")?.value.length, tab: document.querySelector(".wb-tabbar .is-on")?.textContent})`));
} finally { close(); }
