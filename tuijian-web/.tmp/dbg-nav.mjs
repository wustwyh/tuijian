import {openBrowser} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await session.send("Emulation.setDeviceMetricsOverride", {width: 3440, height: 1200, deviceScaleFactor: 1, mobile: false});
  const nav = await session.send("Page.navigate", {url: "http://localhost:5173/"});
  console.log("navigate result:", JSON.stringify(nav));
  await new Promise(r => setTimeout(r, 1500));
  console.log("href:", await session.evaluate("location.href"));
  console.log("ready:", await session.evaluate("document.readyState"));
  try { await session.evaluate("localStorage.setItem('x','1')"); console.log("localStorage OK"); } catch (e) { console.log("localStorage FAIL:", e.message); }
} finally { close(); }
