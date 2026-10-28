import {openBrowser, measure} from "./cdp.mjs";
import {writeFileSync} from "node:fs";
const {session, close} = await openBrowser();
const kinds = ["qa","feed","article","card"];
try {
  for (const k of kinds) {
    const url = "file:///E:/codes/创业/10.18黑客松/tuijian-web/.tmp/pub-" + k + ".html";
    await measure(session, url, {width: 390, height: 844, settle: 1200});
    const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false});
    writeFileSync(".tmp/shots/phone-" + k + ".png", Buffer.from(cap.data, "base64"));
    console.log(k, await session.evaluate(`JSON.stringify({
      bodyW: Math.round(document.body.getBoundingClientRect().width),
      padded: getComputedStyle(document.body).padding,
      pfW: Math.round(document.querySelector(".pf")?.getBoundingClientRect().width || 0),
      firstH: document.querySelector(".pf h1")?.textContent.slice(0, 20),
    })`));
  }
} finally { close(); }
