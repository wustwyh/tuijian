import {inlinePlainText} from './publication.js';
import {platformSpec} from './platform-layout.js';
import {buildPublishHtml} from './publish-html.js';

const ext = (name) => { const m = /\.([a-z0-9]+)$/i.exec(name || ''); return (m ? m[1] : 'png').toLowerCase(); };
const mimeOf = (name) => ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' })[ext(name)] || 'image/png';

// 发布正文：标题/导语/正文/行动引导/话题标签，去掉内部 [f_n] 追溯标记、** 强调符
// 与「![主视觉](image_id:…)」这类图片占位，保证 ZIP 里的 txt 与导出的 HTML 内容一致。
function publishText(article) {
  return [article.title, article.lead, article.body, article.cta, (article.tags || []).map(t => '#' + t.replace(/^#+/g, '')).join(' ')]
    .map(t => inlinePlainText(t).trim()).filter(Boolean).join('\n\n');
}

async function loadImages(images) {
  return Promise.all((images || []).map(async (img, i) => {
    const r = await fetch(img.url);
    if (!r.ok) throw new Error('图片加载失败：' + (img.file || img.image_id));
    const buf = await r.arrayBuffer();
    return { img, i, bytes: new Uint8Array(buf), mime: r.headers.get('content-type') || mimeOf(img.file) };
  }));
}

const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return btoa(bin);
}

// —— 自包含 HTML 发布稿（图片内嵌 base64，打开即见排版，可复制文字、右键另存图片）——
// 版式按平台切换：公众号长文、小红书卡片、朋友圈短文案、门店海报等结构各不相同。
// 返回生成好的整页 HTML 字符串：结果页的「预览发布稿」弹窗直接用它渲染，跟下载的文件完全一致。
export async function buildPublishDoc(job) {
  const article = job.result.article;
  const loaded = await loadImages(article.image_plan);
  const spec = platformSpec(job.summary?.platformId || job.summary?.platform);
  const stamp = new Date(job.result?.completedAt || Date.now())
    .toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  return buildPublishHtml({ article, loaded, spec, generatedTime: stamp });
}

export async function downloadPublishHtml(job) {
  const html = await buildPublishDoc(job);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${job.summary.product}-${job.summary.platform}-发布稿.html`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// —— 最小 ZIP 打包（stored 方式，无压缩；图片本身已压缩）——
function crc32(bytes) {
  if (!crc32.table) {
    crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc32.table[n] = c >>> 0; }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crc32.table[(crc ^ bytes[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function zipBlob(files) {
  const enc = new TextEncoder();
  const u16 = n => [n & 0xff, (n >>> 8) & 0xff];
  const u32 = n => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = f.bytes, crc = crc32(data);
    const local = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name];
    parts.push(new Uint8Array(local), data);
    const entry = [...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name];
    central.push(new Uint8Array(entry));
    offset += local.length + data.length;
  }
  const centralOffset = offset, centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(centralOffset), ...u16(0)];
  return new Blob([...parts, ...central, new Uint8Array(end)], { type: 'application/zip' });
}

export async function downloadPublishZip(job) {
  const article = job.result.article;
  const loaded = await loadImages(article.image_plan);
  const enc = new TextEncoder();
  const files = [];
  const imageMap = loaded.map(({ img, i }) => `图${i + 1}（${publicationText(img.caption || '')}）｜位置：${img.position}｜用途：${img.purpose || ''}`).join('\n');
  const txt = publishText(article) + '\n\n配图说明（按顺序上传）：\n' + imageMap;
  files.push({ name: '发布文案.txt', bytes: enc.encode(txt) });
  for (const { img, i, bytes } of loaded) files.push({ name: `图${i + 1}-${img.position || i + 1}.${ext(img.file)}`, bytes });
  const url = URL.createObjectURL(zipBlob(files));
  const a = document.createElement('a');
  a.href = url; a.download = `${job.summary.product}-${job.summary.platform}-发布稿.zip`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
