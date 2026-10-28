// 朋友圈展开态验收：展开后不再重复截断文本、收起按钮排在全文下面。
// 用法：node .tmp/check-moment-expand.mjs <file:///…html | http://…/result/<id>>
import {openBrowser, measure} from './cdp.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const arg = process.argv[2];
const isApp = arg.startsWith('http');
const url = isApp ? arg : pathToFileURL(resolve(arg)).href;
const {session, close} = await openBrowser();
try {
  const r = await measure(session, url, {
    width: 1400, height: 900, settle: 1200,
    ready: isApp ? '.moment-post, .article-flow, .xhs-card' : '',
    init: isApp ? ["localStorage.setItem('tuijian_user','演示账号')"] : [],
  });
  const result = JSON.parse(await session.evaluate(`new Promise((resolve) => {
    const details = document.querySelector('details.more, details.moment-more');
    const read = (sel) => document.querySelector(sel);
    const box = (el) => { const b = el.getBoundingClientRect(); return {top: Math.round(b.top), bottom: Math.round(b.bottom)}; };
    const snapshot = () => {
      const textEl = details.querySelector('.text, .moment-text');
      const fullEl = details.querySelector('.full, .moment-full');
      const openLbl = details.querySelector('.lbl-open, .moment-lbl-open');
      const closeLbl = details.querySelector('.lbl-close, .moment-lbl-close');
      const shownHead = textEl.textContent.trim().slice(0, 12);
      return {
        open: details.open,
        textDisplay: getComputedStyle(textEl).display,
        fullDisplay: getComputedStyle(fullEl).display,
        openLabel: getComputedStyle(openLbl).display,
        closeLabel: getComputedStyle(closeLbl).display,
        fullBox: box(fullEl),
        summaryBox: box(details.querySelector('summary')),
        bodyText: document.body.innerText,
        shownHead,
      };
    };
    const closed = snapshot();
    details.open = true;
    setTimeout(() => {
      const opened = snapshot();
      const dup = (opened.bodyText.match(new RegExp(opened.shownHead.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g')) || []).length;
      resolve(JSON.stringify({
        closed: {textDisplay: closed.textDisplay, openLabel: closed.openLabel, closeLabel: closed.closeLabel},
        opened: {textDisplay: opened.textDisplay, fullDisplay: opened.fullDisplay, openLabel: opened.openLabel, closeLabel: opened.closeLabel},
        duplicateOfPreview: dup,
        fullAboveClose: opened.fullBox.bottom <= opened.summaryBox.top + 2,
        fullBottom: opened.fullBox.bottom, summaryTop: opened.summaryBox.top,
        bodyLength: opened.bodyText.length,
      }));
    }, 300);
  })`));
  console.log(JSON.stringify({...result, clipped: r.clipped.length, hOverflow: r.hOverflow, errors: r.errors}, null, 1));
} finally {
  close();
}
