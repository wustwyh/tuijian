import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const kinds = ["article","news","qa","feed","poster","moment","doc","card"];
try {
  for (const k of kinds) {
    const url = "file:///E:/codes/创业/10.18黑客松/tuijian-web/.tmp/pub-" + k + ".html";
    await measure(session, url, {width: 1280, height: 940, settle: 1200});
    const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
    writeFileSync(".tmp/shots/platform-" + k + ".png", Buffer.from(cap.data, "base64"));
    console.log(k, await session.evaluate(`JSON.stringify({
      pf: document.querySelector(".pf")?.className,
      pfW: Math.round(document.querySelector(".pf")?.getBoundingClientRect().width || 0),
      chromeTop: document.querySelector(".pf-top")?.textContent.trim().slice(0,30),
      pageH: document.documentElement.scrollHeight,
    })`));
  }
} finally { close(); }
