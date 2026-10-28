import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const opts = await (await fetch("http://localhost:5173/api/compose-options")).json();
const products = (await (await fetch("http://localhost:5173/api/products")).json()).products;
const audiences = (await (await fetch("http://localhost:5173/api/audiences")).json()).audiences;
const compose = JSON.stringify({productId: products[0].id, audienceId: audiences[0].id, platformId: "zhihu", task: opts.tasks[0], format: opts.formats[0], topicIds: [], recommendedTopics: [], hotTopics: [], extra: "", materialIncludedIds: [], materialExcludedIds: []});
try {
  const r = await measure(session, "http://localhost:5173/create/topic", {width: 1440, height: 1000, settle: 2500, ready: "body", init: ["localStorage.setItem('tuijian_user','演示账号')", "sessionStorage.setItem('tuijian_compose', " + JSON.stringify(compose) + ")"]});
  console.log("errors:", JSON.stringify(r.errors));
  console.log("html:", await session.evaluate(`document.querySelector(".step-page, .compose-main, main")?.innerText?.slice(0, 300) || document.body.innerText.slice(0, 300)`));
} finally { close(); }
