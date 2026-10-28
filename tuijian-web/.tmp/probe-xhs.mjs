import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await measure(session, "http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d", {width: 1440, height: 1000, settle: 2200, ready: ".rs-top", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log(await session.evaluate(`JSON.stringify({
    articleLen: (document.querySelector('#r-article')?.innerText || '').length,
    firstClasses: [...(document.querySelector('#r-article')?.children || [])].map(c => c.className),
    sample: (document.querySelector('#r-article')?.innerText || '').slice(0, 60),
  })`));
} finally { close(); }
