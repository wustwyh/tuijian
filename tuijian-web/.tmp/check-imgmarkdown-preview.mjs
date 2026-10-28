import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  const r = await measure(session, "http://localhost:5173/result/e5b28d3c-808a-4890-8480-eaaeec324ddf", {width: 1400, height: 900, settle: 1200, ready: ".result", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const marks = JSON.parse(await session.evaluate(`JSON.stringify({
    imgMarkdown: (document.body.innerText.match(/!\\[[^\\]]*\\]/g)||[]).length,
    imageId: (document.body.innerText.match(/image_id/gi)||[]).length,
    figures: document.querySelectorAll(".article-figure").length,
    headings: document.querySelectorAll(".article-heading").length,
  })`));
  console.log(JSON.stringify({...marks, clipped: r.clipped.length, hOverflow: r.hOverflow, errors: r.errors}, null, 1));
} finally { close(); }
