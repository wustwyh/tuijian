import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const id = 'b081e220-517b-4241-ac8e-0d5bb2861a71';
try {
  const r = await measure(session, `http://localhost:5173/result/${id}`, {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  console.log('结果页:', await session.evaluate(`JSON.stringify({
    chips: [...document.querySelectorAll('.rs-chip')].map(c => c.textContent.trim()),
    rail: document.querySelectorAll('.rs-rail li').length,
    railTitle: document.querySelector('.rs-rail-title')?.textContent,
    summary: {
      title: document.querySelector('.rs-title')?.textContent?.slice(0, 18),
      struct: [...document.querySelectorAll('.rs-struct span')].map(s => s.textContent.trim()),
      thumbs: document.querySelectorAll('.rs-thumbs img').length,
      cta: !!document.querySelector('.rs-article-cta'),
    },
    articlePreview: !!document.querySelector('#r-article .generated-article, #r-article .pf'),
    buttons: [...document.querySelectorAll('.rs-top-actions button')].map(b => {
      const r = b.getBoundingClientRect();
      return b.textContent.trim() + ' ' + Math.round(r.width) + 'x' + Math.round(r.height);
    }),
    backtop: !!document.querySelector('.rs-backtop'),
  })`));
  await shot('.tmp/shots/rs-new-desktop.png');

  // 滚到 04，检查右侧导航高亮与回到顶部
  await session.evaluate(`document.getElementById('r-review').scrollIntoView()`);
  await sleep(900);
  console.log('滚动后:', await session.evaluate(`JSON.stringify({
    active: document.querySelector('.rs-rail button.is-on')?.textContent.trim(),
    backtop: !!document.querySelector('.rs-backtop'),
  })`));
  // 点导航里的 02，应该展开折叠块
  await session.evaluate(`[...document.querySelectorAll('.rs-rail li button')].find(b => b.textContent.includes('知识库依据')).click()`);
  await sleep(900);
  console.log('点 02 后:', await session.evaluate(`JSON.stringify({
    basisOpen: document.getElementById('r-basis')?.open,
    y: Math.round(window.scrollY),
  })`));

  // 工作台：默认手机 + 手机机身
  await session.evaluate(`window.scrollTo(0,0)`);
  await sleep(400);
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  console.log('工作台:', await session.evaluate(`JSON.stringify({
    device: [...document.querySelectorAll('.wb-device button')].find(b => b.className.includes('is-on'))?.textContent.trim(),
    phone: !!document.querySelector('.phone-frame'),
    phoneSize: (() => { const f = document.querySelector('.phone-frame'); if (!f) return null; const r = f.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    iframe: !!document.querySelector('.phone-frame iframe'),
  })`));
  await shot('.tmp/shots/wb-phone-publish.png');
  // 手机机身内的内容确实是滚动的
  console.log('iframe 文档高度:', await session.evaluate(`(() => {
    const f = document.querySelector('.phone-frame iframe');
    return f?.contentDocument ? [f.contentDocument.documentElement.scrollHeight, f.contentDocument.documentElement.clientHeight] : null;
  })()`));
  // 切到修改档，看平台外壳
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1400);
  console.log('修改档外壳:', await session.evaluate(`JSON.stringify({
    pf: document.querySelector('.wb .pf')?.className,
    chromeTop: document.querySelector('.wb .pf-top')?.textContent.trim().slice(0, 40),
    chromeFoot: document.querySelector('.wb .pf-foot')?.textContent.trim().slice(0, 40),
    phone: !!document.querySelector('.wb .phone-frame'),
  })`));
  await shot('.tmp/shots/wb-phone-edit.png');
  // 切电脑
  await session.evaluate(`[...document.querySelectorAll('.wb-device button')].find(b => b.textContent.includes('电脑')).click()`);
  await sleep(900);
  console.log('电脑档:', await session.evaluate(`JSON.stringify({
    frameW: Math.round(document.querySelector('.wb-frame')?.getBoundingClientRect().width || 0),
    pfW: Math.round(document.querySelector('.wb .pf')?.getBoundingClientRect().width || 0),
  })`));
  await shot('.tmp/shots/wb-desktop-edit.png');
  console.log('错误:', JSON.stringify(r.errors));
} finally {
  close();
}
