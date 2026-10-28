import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  const r = await measure(session, "http://localhost:5173/create/product", {width: 1400, height: 900, settle: 800, init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const hint = await session.evaluate(`(() => { const btn=[...document.querySelectorAll('button')].find(b=>/演示账号|admin|账号/.test(b.textContent)); if(!btn) return 'no-account-button'; btn.click(); return 'clicked'; })()`);
  console.log("open account: " + hint);
  console.log(JSON.stringify({errors: r.errors, clipped: r.clipped.length}));
} finally { close(); }
