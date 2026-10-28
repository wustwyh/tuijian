// 导出 HTML 真机宽度体检：手机 390 / 桌面 1400，量横向溢出与卡面裁切。
import {openBrowser, measure} from './cdp.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const names = ['store', 'moments', 'xhs', 'xhs5', 'zhihu', 'wechat', 'weibo', 'business', 'news'];
const {session, close} = await openBrowser();
try {
  for (const name of names) {
    const url = pathToFileURL(resolve('.tmp/shots', `${name}.html`)).href;
    for (const width of [1400, 390]) {
      const r = await measure(session, url, {width, height: 900, settle: 700});
      const flag = (r.hOverflow || r.clipped.length || r.overflowX.length || r.errors.length) ? '✗' : '✓';
      console.log(`${flag} ${name.padEnd(9)} w=${String(width).padEnd(5)} winW=${String(r.winW).padEnd(5)} docW=${String(r.docW).padEnd(5)} overflowX=${JSON.stringify(r.overflowX)} clipped=${JSON.stringify(r.clipped)} errors=${JSON.stringify(r.errors)}`);
    }
  }
} finally {
  close();
}
