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
    width: 1440, height: 1000, settle: 2400, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  console.log('错误:', JSON.stringify(r.errors));
  console.log('首屏:', await session.evaluate(`JSON.stringify({
    buttons: [...document.querySelectorAll('.rs-top button, .rs-top summary')].map(b => b.textContent.trim() || b.getAttribute('aria-label')),
    heroLine: document.querySelector('.rs-hero-text p')?.textContent,
    figures: [...document.querySelectorAll('.rs-figures span')].map(s => s.textContent.trim()),
    folds: [...document.querySelectorAll('.rs-fold > summary')].map(s => s.textContent.trim()),
    foldOpen: [...document.querySelectorAll('.rs-fold')].map(d => d.open),
    articleVisible: !!document.querySelector('#r-article .generated-article'),
    checksOpen: document.querySelector('.rs-review .rs-toggle')?.getAttribute('aria-expanded'),
    totalButtons: document.querySelectorAll('.result-page button').length,
    words: (document.querySelector('.result-page')?.innerText || '').length,
    docH: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`));
  await shot('.tmp/shots/result-slim-desktop.png');
  // 展开第一个折叠块
  await session.evaluate(`document.querySelectorAll('.rs-fold > summary')[0].click()`);
  await sleep(400);
  console.log('展开场景判断后高:', await session.evaluate(`document.documentElement.scrollHeight`));
  // 更多菜单
  await session.evaluate(`document.querySelector('.rs-more > summary').click()`);
  await sleep(300);
  console.log('更多菜单:', await session.evaluate(`[...document.querySelectorAll('.rs-more-menu button')].map(b=>b.textContent.trim())`));
  // 手机
  await measure(session, `http://localhost:5173/result/${id}`, {
    width: 390, height: 844, settle: 2000, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  console.log('手机:', await session.evaluate(`JSON.stringify({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    topH: Math.round(document.querySelector('.rs-top')?.getBoundingClientRect().height || 0),
    words: (document.querySelector('.result-page')?.innerText || '').length,
  })`));
  await shot('.tmp/shots/result-slim-mobile.png');
  // 历史筛选
  await measure(session, 'http://localhost:5173/history', {width: 1440, height: 1000, settle: 1800, ready: '.history-scope'});
  console.log('筛选:', await session.evaluate(`JSON.stringify({
    selects: [...document.querySelectorAll('.history-select select')].map(s => s.options[0].textContent.trim()),
    shown: document.querySelectorAll('.history-card').length,
    total: document.querySelector('.history-total')?.textContent,
  })`));
  const picked = await session.evaluate(`(() => {
    const s = document.querySelectorAll('.history-select select')[0];
    const v = s.options[1].value;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(s, v);
    s.dispatchEvent(new Event('change', {bubbles: true}));
    return v;
  })()`);
  await sleep(700);
  console.log('选产品「' + picked + '」→', await session.evaluate(`JSON.stringify({
    shown: document.querySelectorAll('.history-card').length,
    total: document.querySelector('.history-total')?.textContent,
    clear: !!document.querySelector('.history-clear'),
    products: [...new Set([...document.querySelectorAll('.history-card-title')].map(t=>t.textContent))],
  })`));
  await shot('.tmp/shots/history-filters.png');
} finally {
  close();
}
