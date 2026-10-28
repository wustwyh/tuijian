import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 180) => { for (let i = 0; i < sec; i++) { if (await session.evaluate(expr)) return true; await sleep(1000); } return false; };
const base = "http://localhost:5173";
const opts = await (await fetch(base + "/api/compose-options")).json();
const products = (await (await fetch(base + "/api/products")).json()).products;
const audiences = (await (await fetch(base + "/api/audiences")).json()).audiences;
const compose = JSON.stringify({productId: products[0].id, audienceId: audiences[0].id, platformId: "xhs", task: opts.tasks[0], format: opts.formats[0], topicIds: [], recommendedTopics: [], hotTopics: [], extra: "", materialIncludedIds: [], materialExcludedIds: []});
try {
  await measure(session, base + "/create/topic", {width: 1440, height: 1200, settle: 2500, ready: ".insight-search", init: ["localStorage.setItem('tuijian_user','演示账号')", "sessionStorage.setItem('tuijian_compose', " + JSON.stringify(compose) + ")"]});
  const got = await waitFor(`document.querySelectorAll(".hot-card").length >= 3`, 180);
  console.log("自动出现热点:", got, "条数:", await session.evaluate(`document.querySelectorAll(".hot-card").length`));
  console.log("内容:", await session.evaluate(`JSON.stringify([...document.querySelectorAll(".hot-card")].map(c => c.querySelector(".hot-head strong").textContent + " [" + (c.querySelector(".hot-head span")?.textContent || "") + "]"))`));
  console.log("说明:", await session.evaluate(`document.querySelector(".insight-note")?.textContent`));
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
  writeFileSync(".tmp/shots/r18-hot-auto.png", Buffer.from(cap.data, "base64"));
  // 换一批
  await session.evaluate(`document.querySelector(".insight-refresh").click()`);
  await sleep(2000);
  const changed = await waitFor(`document.querySelectorAll(".hot-card").length >= 3`, 180);
  console.log("换一批后:", changed, await session.evaluate(`document.querySelectorAll(".hot-card")[0].querySelector(".hot-head strong").textContent`));
} finally { close(); }
