import {openBrowser, measure} from "./cdp.mjs";
const {writeFileSync} = await import("node:fs");
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 45) => { for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); } return null; };
const id = "b081e220-517b-4241-ac8e-0d5bb2861a71";
const shot = async out => { const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: false}); writeFileSync(out, Buffer.from(cap.data, "base64")); };
try {
  const r = await measure(session, `http://localhost:5173/result/${id}`, {width: 1440, height: 900, settle: 2200, ready: "#r-article", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  console.log('errors:', JSON.stringify(r.errors));
  console.log('03 区按钮:', await session.evaluate(`[...document.querySelectorAll('#r-article button')].map(b=>b.textContent.trim())`));
  await session.evaluate(`[...document.querySelectorAll('#r-article button')].find(b=>b.textContent.includes('打开工作台'))?.click()`);
  await sleep(2600);
  console.log('工作台:', await session.evaluate(`JSON.stringify({
    open: !!document.querySelector('.wb'),
    tabs: [...document.querySelectorAll('.wb-tabs button')].map(b=>b.textContent.trim()),
    device: [...document.querySelectorAll('.wb-device button')].map(b=>b.textContent.trim()),
    frameW: Math.round(document.querySelector('.wb-frame iframe')?.getBoundingClientRect().width || 0),
    sideW: Math.round(document.querySelector('.wb-side')?.getBoundingClientRect().width || 0),
    hasSave: !!document.querySelector('.wb-save'),
  })`));
  await shot('.tmp/shots/workbench-publish.png');
  // 手机档
  await session.evaluate(`[...document.querySelectorAll('.wb-device button')].find(b=>b.textContent.includes('手机'))?.click()`);
  await sleep(700);
  console.log('手机档 iframe 宽:', await session.evaluate(`Math.round(document.querySelector('.wb-frame iframe')?.getBoundingClientRect().width||0)`));
  // 切到修改
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b=>b.textContent.includes('修改'))?.click()`);
  await sleep(1000);
  console.log('修改态:', await session.evaluate(`JSON.stringify({hits: document.querySelectorAll('.edit-hit').length, renderW: Math.round(document.querySelector('.wb-render-inner')?.getBoundingClientRect().width||0), empty: !!document.querySelector('.wb-empty')})`));
  // 点一段
  const seg = await session.evaluate(`(() => { const b=[...document.querySelectorAll('.edit-hit')].find(x=>x.dataset.kind==='para'); if(!b) return 'none'; b.click(); return b.textContent.slice(0,26); })()`);
  const chips = await waitFor(`document.querySelectorAll('.wb-chip').length >= 4 ? [...document.querySelectorAll('.wb-chip')].map(b=>b.textContent.trim()).join('｜') : 0`, 40);
  console.log('点段落:', seg, '\n关键词:', chips);
  const t0 = Date.now();
  await session.evaluate(`document.querySelectorAll('.wb-chips .wb-chip')[0].click()`);
  const req = await waitFor(`document.querySelector('.wb-requirement p')?.textContent || ''`, 45);
  console.log(`AI 需求 ${Math.round((Date.now()-t0)/1000)}s:`, req.slice(0, 60));
  console.log('标题脏标记:', await session.evaluate(`!!document.querySelector('.wb-dirty')`), '｜保存按钮:', await session.evaluate(`document.querySelector('.wb-save')?.textContent.trim()`));
  await shot('.tmp/shots/workbench-edit.png');
  // 保存并同步
  const t1 = Date.now();
  await session.evaluate(`document.querySelector('.wb-save')?.click()`);
  const toast = await waitFor(`document.querySelector('.wb-toast')?.textContent || ''`, 90);
  console.log(`保存 ${Math.round((Date.now()-t1)/1000)}s｜toast: ${toast}｜回到预览:`, await session.evaluate(`!!document.querySelector('.wb-frame iframe')`));
  console.log('通知:', await session.evaluate(`document.querySelector('.product-notice')?.textContent || ''`));
  await sleep(1200);
  await session.evaluate(`document.querySelector('.wb-close')?.click()`);
  await sleep(800);
  console.log('关闭后 03 正文是否更新:', await session.evaluate(`(document.querySelector('#r-article .generated-article')?.innerText || '').includes('挑电脑') || (document.querySelector('#r-article')?.innerText||'').length > 400`));
} finally { close(); }
