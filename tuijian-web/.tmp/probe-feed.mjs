import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await measure(session, "file:///E:/codes/创业/10.18黑客松/tuijian-web/.tmp/pub-feed.html", {width: 1280, height: 900, settle: 1200});
  console.log(await session.evaluate(`JSON.stringify({
    bodyW: Math.round(document.body.getBoundingClientRect().width),
    bodyMaxW: getComputedStyle(document.body).maxWidth,
    first: document.body.firstElementChild?.className,
    firstW: Math.round(document.body.firstElementChild?.getBoundingClientRect().width || 0),
    styleTags: document.querySelectorAll("style").length,
    cssHead: document.querySelector("style")?.textContent.slice(0, 120),
  })`));
} finally { close(); }
