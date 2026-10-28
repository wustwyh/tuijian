import {writeFileSync} from 'node:fs';
import {openBrowser, measure} from './cdp.mjs';
import {buildPublishDoc} from '../src/export.js';
const rawFetch = globalThis.fetch;
globalThis.fetch = (input, init) => rawFetch(typeof input === 'string' && input.startsWith('/') ? 'http://localhost:5173' + input : input, init);

const base = 'http://localhost:5173';
const ids = {
  wechat: 'b081e220-517b-4241-ac8e-0d5bb2861a71',
  xhs: '4c0c91ef-2809-4034-9b88-f10cba7ce63d',
};
const files = {};
for (const [name, id] of Object.entries(ids)) {
  const job = await (await fetch(`${base}/api/generations/${id}`)).json();
  const html = await buildPublishDoc(job);
  const path = `E:/codes/创业/10.18黑客松/tuijian-web/.tmp/pub-${name}.html`;
  writeFileSync(path, html);
  files[name] = path;
  console.log(name, 'HTML', html.length, '字符｜篇幅提示:', html.includes('篇幅提示') ? '有' : '无');
}
const {session, close} = await openBrowser();
try {
  for (const [name, path] of Object.entries(files)) {
    const url = 'file:///' + path.replace(/\\/g, '/');
    await measure(session, url, {width: 1280, height: 900, settle: 2000});
    console.log(name, await session.evaluate(`JSON.stringify({
      bodyW: Math.round(document.body.getBoundingClientRect().width),
      imgs: [...document.querySelectorAll('img')].slice(0, 4).map(i => [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)]),
      cards: document.querySelectorAll('.card').length,
      cols: getComputedStyle(document.querySelector('.deck') || document.body).gridTemplateColumns.split(' ').length,
      font: getComputedStyle(document.body).fontFamily.slice(0, 20),
    })`));
    const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
    writeFileSync(`.tmp/shots/pub-${name}.png`, Buffer.from(cap.data, 'base64'));
  }
} finally {
  close();
}
