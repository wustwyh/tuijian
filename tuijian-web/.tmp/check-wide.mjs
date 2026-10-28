// 宽屏适配体检：在指定视口宽度下，量出「内容实际占了多少、右边空了多少」。
// 用法：node .tmp/check-wide.mjs <宽度> <路径1,路径2,...>
import {openBrowser, measure} from './cdp.mjs';

const width = Number(process.argv[2] || 3440);
const paths = (process.argv[3] || '/create/product,/history,/products').split(',');
const {session, close} = await openBrowser();
try {
  const rows = [];
  for (const path of paths) {
    const r = await measure(session, `http://localhost:5173${path}`, {
      width, height: 1200, settle: 1400, ready: '.main',
      init: ["localStorage.setItem('tuijian_user','演示账号')"],
    });
    const info = JSON.parse(await session.evaluate(`(() => {
      const main = document.querySelector('.main');
      const mb = main.getBoundingClientRect();
      const kids = [...main.children].filter(el => el.offsetHeight > 0);
      const boxes = kids.map(el => {
        const b = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { sel: el.className ? '.' + String(el.className).split(' ')[0] : el.tagName.toLowerCase(),
          left: Math.round(b.left), width: Math.round(b.width), right: Math.round(b.right),
          maxWidth: cs.maxWidth, marginLeft: cs.marginLeft };
      });
      const widest = boxes.reduce((a, b) => (b.right > (a?.right || 0) ? b : a), null);
      return JSON.stringify({
        main: {left: Math.round(mb.left), width: Math.round(mb.width), right: Math.round(mb.right)},
        docW: document.documentElement.clientWidth,
        widest,
        gapRight: Math.round(document.documentElement.clientWidth - (widest?.right || 0)),
        boxes: boxes.slice(0, 6),
        hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      });
    })()`));
    rows.push({path, ...info, errors: r.errors.length});
  }
  console.log(JSON.stringify(rows, null, 1));
} finally { close(); }
