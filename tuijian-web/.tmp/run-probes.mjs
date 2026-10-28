// 结果页批量体检：桌面 1400 / 手机 390 两个宽度，量横向溢出、被裁切元素、控制台报错。
import {openBrowser, measure} from './cdp.mjs';

const base = 'http://localhost:5173';
const jobs = {
  store: '20edc028-0fa6-4d41-aa3c-1e14cdb8041d',
  moments: '4e0ca6eb-fef7-4d99-bf34-d7ff117dc4f7',
  xhs: '46a530bc-3019-478a-8b37-09696ada0872',
  xhs5: 'edd82c5c-2281-4942-881e-fe6dd67eba1a',
  zhihu: '304f1716-7c44-4035-878a-96a349fbfc16',
  wechat: '598058b7-ce0b-46d6-94b2-467a111e96fb',
  weibo: '3594e12d-14cb-4367-b4cd-6d1b05f64c5d',
  business: '2fd68911-a442-4d55-b074-9fc8c2e39003',
};

const {session, close} = await openBrowser();
let bad = 0;
try {
  for (const [name, id] of Object.entries(jobs)) {
    for (const width of [1400, 390]) {
      const r = await measure(session, `${base}/result/${id}`, {
        width, height: 1000, settle: 900, ready: '.result, .generated-article, .xhs-card',
        init: ["localStorage.setItem('tuijian_user','演示账号')"],
      });
      const clipped = r.clipped.filter((c) => !/login-page/.test(c.el));
      const flag = (r.hOverflow || clipped.length || r.overflowX.length || r.errors.length) ? '✗' : '✓';
      if (flag === '✗') bad += 1;
      console.log(`${flag} ${name.padEnd(9)} w=${String(width).padEnd(5)} docW=${String(r.docW).padEnd(5)} docH=${String(r.docH).padEnd(6)} overflowX=${JSON.stringify(r.overflowX)} clipped=${JSON.stringify(clipped)} errors=${JSON.stringify(r.errors)} count=${JSON.stringify(r.counts)}`);
    }
  }
} finally {
  close();
}
console.log(bad ? `\n有 ${bad} 个宽度不干净` : '\n全部干净');
