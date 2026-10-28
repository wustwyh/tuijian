import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  const r = await measure(session, "http://localhost:5173/result/4e0ca6eb-fef7-4d99-bf34-d7ff117dc4f7", {width: 1280, height: 900, settle: 1800, ready: ".result-actions"});
  const info = await session.evaluate(`(() => {
    const btns = [...document.querySelectorAll('button')].map(b => b.textContent.trim().slice(0,12));
    const target = [...document.querySelectorAll('button')].find(b => b.textContent.includes('预览发布稿'));
    return JSON.stringify({buttons: btns, found: Boolean(target), disabled: target?.disabled});
  })()`);
  console.log("buttons:", info);
  await session.evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('预览发布稿')).click()`);
  await new Promise(r => setTimeout(r, 1500));
  const after = await session.evaluate(`JSON.stringify({backdrop: Boolean(document.querySelector('.pp-backdrop')), dialog: Boolean(document.querySelector('.pp-dialog')), state: document.querySelector('.pp-state')?.textContent || ''})`);
  console.log("after click:", after);
  console.log("errors:", JSON.stringify(r.errors));
} finally { close(); }
