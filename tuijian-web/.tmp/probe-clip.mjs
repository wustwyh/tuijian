import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  for (const [url, w] of [["http://localhost:5173/create/audience", 1400], ["http://localhost:5173/create/platform", 1400]]) {
    const r = await measure(session, url, {width: w, height: 900, settle: 1500, init: ["localStorage.setItem('tuijian_user','演示账号')"]});
    console.log(url.split("5173")[1], JSON.stringify(r.clipped || r.clip || r).slice(0, 600));
    console.log("errors:", JSON.stringify(r.errors));
  }
} finally { close(); }
