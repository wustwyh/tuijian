// 真浏览器布局探针：用 Edge headless 渲染导出 HTML，量出"有没有被静默裁掉 / 横向溢出"。
// 只做客观测量（scrollHeight vs clientHeight），不依赖肉眼截图。
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = new URL('./shots/', import.meta.url);
mkdirSync(outDir, {recursive: true});

const probe = `
<script>
window.addEventListener('load', () => {
  const tag = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim()
    ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
  const res = { winW: window.innerWidth, docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight, clipped: [], overflowX: [] };
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const hiddenY = cs.overflowY === 'hidden' && !cs.overflowY.includes('auto') && !cs.overflowY.includes('scroll');
    const hiddenX = cs.overflowX === 'hidden' && !cs.overflowX.includes('auto') && !cs.overflowX.includes('scroll');
    if (hiddenY && el.scrollHeight - el.clientHeight > 2) res.clipped.push({ el: tag(el), over: el.scrollHeight - el.clientHeight });
    if (hiddenX && el.scrollWidth - el.clientWidth > 2) res.overflowX.push({ el: tag(el), over: el.scrollWidth - el.clientWidth });
  }
  res.hOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
  const pre = document.createElement('pre');
  pre.id = '__metrics__';
  pre.textContent = JSON.stringify(res);
  document.body.appendChild(pre);
});
</script>
`;

export function measureHtml(html, name, width, height) {
  const file = new URL(`./shots/${name}.probe.html`, import.meta.url);
  writeFileSync(file, html.replace('</body>', probe + '</body>'));
  const dom = execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${width},${height}`, '--virtual-time-budget=4000', '--dump-dom', file.href],
    {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore']});
  const m = /<pre id="__metrics__">([\s\S]*?)<\/pre>/.exec(dom);
  if (!m) throw new Error(`${name}: 探针没跑起来（可能脚本报错）`);
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
}

if (process.argv[2]) {
  const html = readFileSync(new URL(`./shots/${process.argv[2]}.html`, import.meta.url), 'utf8');
  const r = measureHtml(html, process.argv[2], Number(process.argv[3] || 900), Number(process.argv[4] || 1400));
  console.log(JSON.stringify(r, null, 1));
}
