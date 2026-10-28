// 页面冒烟：桌面/手机两档宽度跑一遍主要路由，抓控制台报错与横向溢出。
import {openBrowser, measure} from './cdp.mjs';

const base = 'http://localhost:5173';
const routes = ['/create/product', '/create/audience', '/create/platform', '/create/topic', '/create/discovery', '/history', '/products', '/audiences', '/materials', '/workflows',
  '/result/20edc028-0fa6-4d41-aa3c-1e14cdb8041d', '/result/4e0ca6eb-fef7-4d99-bf34-d7ff117dc4f7'];

const {session, close} = await openBrowser();
let bad = 0;
try {
  for (const route of routes) {
    for (const width of [1400, 390]) {
      const r = await measure(session, base + route, {width, height: 900, settle: 800,
        init: ["localStorage.setItem('tuijian_user','演示账号')"]});
      const clipped = r.clipped.filter((c) => !/login-page/.test(c.el));
      const flag = (r.hOverflow || clipped.length || r.errors.length) ? '✗' : '✓';
      if (flag === '✗') bad += 1;
      console.log(`${flag} ${route.padEnd(44)} w=${String(width).padEnd(5)} docW=${String(r.docW).padEnd(5)} overflowX=${JSON.stringify(r.overflowX)} clipped=${JSON.stringify(clipped)} errors=${JSON.stringify(r.errors.slice(0, 2))}`);
    }
  }
} finally { close(); }
console.log(bad ? `\n有 ${bad} 处不干净` : '\n全部干净');
