import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 180) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
const base = "http://localhost:5173";
const opts = await (await fetch(base + "/api/compose-options")).json();
const products = (await (await fetch(base + "/api/products")).json()).products;
const audiences = (await (await fetch(base + "/api/audiences")).json()).audiences;
const compose = JSON.stringify({productId: products[0].id, audienceId: audiences[0].id, platformId: "wechat", task: opts.tasks[0], format: opts.formats[0], topicIds: [], recommendedTopics: [], hotTopics: [], extra: "", materialIncludedIds: [], materialExcludedIds: []});
try {
  await measure(session, base + "/create/topic", {width: 1440, height: 1200, settle: 2500, ready: ".insight-search", init: ["localStorage.setItem('tuijian_user','演示账号')", "sessionStorage.setItem('tuijian_compose', " + JSON.stringify(compose) + ")"]});
  await session.evaluate(`(() => { const i = document.querySelector(".insight-search input"); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, "双11 轻薄本 优惠"); i.dispatchEvent(new Event("input", {bubbles: true})); })()`);
  await sleep(300);
  await session.evaluate(`document.querySelector(".insight-search button").click()`);
  const n = await waitFor(`document.querySelectorAll(".hot-card").length || 0`, 180);
  console.log("热点条数:", n);
  console.log("提示:", await session.evaluate(`document.querySelector(".insight-note")?.textContent`));
  console.log("来源链接:", await session.evaluate(`[...document.querySelectorAll(".hot-src")].map(a => a.getAttribute("href").slice(0, 40))`));
  console.log("原始结果:", await session.evaluate(`document.querySelector(".hot-sources summary")?.textContent`));
  await session.evaluate(`document.querySelector(".hot-sources summary")?.click()`);
  await sleep(400);
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
  writeFileSync(".tmp/shots/r12-hot-web.png", Buffer.from(cap.data, "base64"));
} finally { close(); }
