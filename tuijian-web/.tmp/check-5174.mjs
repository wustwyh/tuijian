import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  for (const path of ["/history", "/products", "/audiences"]) {
    const r = await measure(session, "http://localhost:5174" + path, {width: 1400, height: 900, settle: 3000, ready: "body", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
    const t = await session.evaluate(`(document.body.innerText || "").replace(/\\s+/g, " ").slice(0, 90)`);
    console.log("5174" + path, "| errors:", JSON.stringify(r.errors).slice(0, 160), "|", t);
  }
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
  (await import("node:fs")).writeFileSync(".tmp/shots/r19-history-5174.png", Buffer.from(cap.data, "base64"));
} finally { close(); }
