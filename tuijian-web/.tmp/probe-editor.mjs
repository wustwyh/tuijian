import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  const r = await measure(session, "http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71", {width: 1440, height: 1000, settle: 2500, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log(JSON.stringify(await session.evaluate(`JSON.stringify({
    entry: !!document.querySelector('.article-edit-entry'),
    entryHtml: document.querySelector('.article-edit-entry')?.outerHTML.slice(0,200) || '',
    restore: !!document.querySelector('.restore-bar'),
    buttons: [...document.querySelectorAll('#r-article button')].map(b=>b.textContent.trim().slice(0,12)),
  })`)));
  console.log('errors:', JSON.stringify(r.errors));
} finally { close(); }
