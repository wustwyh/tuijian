import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const shots = [
  {path: "/history", width: 3440, height: 1400, out: ".tmp/shots/history-3440.png"},
  {path: "/history", width: 1440, height: 1000, out: ".tmp/shots/history-1440.png"},
  {path: "/create/product", width: 3440, height: 1200, out: ".tmp/shots/create-3440.png"},
];
try {
  for (const s of shots) {
    await measure(session, `http://localhost:5173${s.path}`, {width: s.width, height: s.height, settle: 1600, ready: ".main-inner > *", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
    const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: true});
    const {writeFileSync, statSync} = await import("node:fs");
    writeFileSync(s.out, Buffer.from(cap.data, "base64"));
    console.log(s.out, Math.round(statSync(s.out).size / 1024) + "KB");
  }
} finally { close(); }
