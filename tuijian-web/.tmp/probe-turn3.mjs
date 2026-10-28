import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1500, height: 1000, settle: 2600, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  await session.evaluate(`window.__log=[]; const of=window.fetch; window.fetch=async function(...a){ const t0=Date.now(); const r=await of.apply(this,a); const txt=await r.clone().text(); window.__log.push({url:String(a[0]).slice(-40), status:r.status, ms:Date.now()-t0, body:txt.slice(0,160)}); return r; };`);
  await session.evaluate(`document.querySelector(".rs-main-btn").click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabs button")].find(b => b.textContent.includes("修改")).click()`);
  await sleep(1200);
  await session.evaluate(`document.querySelector(".wb .generated-article .article-lead")?.click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll(".wb-tabbar button")].find(b => b.textContent.includes("AI")).click()`);
  await sleep(800);
  await session.evaluate(`[...document.querySelectorAll(".wb-chip-row .wb-chip")].find(b => b.textContent.includes("更口语"))?.click()`);
  for (let i = 0; i < 8; i++) {
    await sleep(5000);
    const has = await session.evaluate(`!!document.querySelector(".wb-turn-q") || !!document.querySelector(".wb-analysis")`);
    if (has) break;
  }
  console.log("log:", await session.evaluate(`JSON.stringify(window.__log.filter(x => /rewrite/.test(x.url)))`));
  console.log("ui:", await session.evaluate(`JSON.stringify({q: document.querySelector(".wb-turn-q")?.textContent, analysis: document.querySelector(".wb-analysis")?.innerText.slice(0,60)})`));
} finally { close(); }
