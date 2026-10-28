import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  for (const path of ["/history", "/products", "/audiences"]) {
    const r = await measure(session, "http://localhost:5173" + path, {width: 1400, height: 900, settle: 2600, ready: "body", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
    const info = await session.evaluate(`JSON.stringify({
      text: (document.body.innerText || "").replace(/\\s+/g, " ").slice(0, 120),
      role: document.body.getAttribute("data-page") || "",
      empty: /加载|失败|错误|打不开/.test(document.body.innerText || ""),
    })`);
    console.log(path, "errors:", JSON.stringify(r.errors).slice(0, 220));
    console.log("   ", info);
  }
  const api = await session.evaluate(`(async () => { const out = {}; for (const p of ["/api/generations?limit=3", "/api/products", "/api/audiences"]) { try { const r = await fetch(p); out[p] = r.status + " " + (r.headers.get("content-type")||""); } catch (e) { out[p] = "ERR " + e.message; } } return JSON.stringify(out); })()`);
  console.log("api:", api);
} finally { close(); }
