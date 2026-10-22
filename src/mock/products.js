// 产品 mock：扫描知识库 P1 的产品文件夹，每个产品取 images 里编号最小的一张做封面。
// 加新产品只需往知识库里放文件夹，不用改代码。正式运行时图片改走后端 ima 代理（docs/04 §9.3）。
const files = import.meta.glob(
  '../../data/华为PC全板块深度知识库_v7/P1-产品参数库/*/*/images/*.{jpg,jpeg,png,webp}',
  { eager: true, query: '?url', import: 'default' }
);

const CATEGORY_LABEL = { '鸿蒙电脑': '鸿蒙电脑', 'MateBook-Windows': 'Windows 笔记本' };

// 文件夹名末尾的版本后缀，做成醒目标签，方便区分易混型号
const VARIANT = /\s*(酷睿 Ultra|SE 版)$/;

// 手动指定封面，格式：{ '02-MateBook-Windows/MateBook D 16': '文件名.jpg' }。
// 目前有 4 个产品的第一张不是整机图（D 16 SE、D 16、GT、X 系列），之后在这里换。
const COVER_OVERRIDE = {};

// 文件名形如 xxx_描述_01_7e0eedb6.png 或 xxx_描述_02.jpg，按 _01 这个编号排序
function seq(file) {
  const m = file.match(/_(\d+)(?:_[0-9a-f]{6,})?\.\w+$/i);
  return m ? Number(m[1]) : 9999;
}

const groups = new Map();
for (const [path, url] of Object.entries(files)) {
  const parts = path.split('/');
  const i = parts.indexOf('P1-产品参数库');
  const cat = parts[i + 1];
  const dir = parts[i + 2];
  if (cat.startsWith('00-')) continue;
  const id = `${cat}/${dir}`;
  if (!groups.has(id)) groups.set(id, { id, cat, dir, images: [] });
  groups.get(id).images.push({ file: parts[parts.length - 1], url });
}

function toProduct({ id, cat, dir, images }) {
  images.sort((a, b) => seq(a.file) - seq(b.file) || a.file.localeCompare(b.file, 'zh', { numeric: true }));

  const catName = cat.replace(/^\d+-/, '');
  const isHarmony = catName === '鸿蒙电脑';
  const full = dir.replace(/^HUAWEI\s+/, '').replace(/(\S)系列$/, '$1 系列');
  const v = full.match(VARIANT);
  const series = v ? full.slice(0, v.index) : full;

  const tags = [];
  if (v) tags.push({ text: v[1], solid: true });
  tags.push(isHarmony ? { text: '鸿蒙版', solid: true } : { text: 'Windows', solid: false });

  const cover = images.find((im) => im.file === COVER_OVERRIDE[id]) || images[0];

  return {
    id,
    dir,
    category: CATEGORY_LABEL[catName] || catName.replace(/-/g, ' '),
    series,
    tags,
    // 侧栏和组合单里用的短名，带上版本，例如「MateBook 14 鸿蒙版」
    short: [series, ...tags.filter((t) => t.solid).map((t) => t.text)].join(' '),
    fullName: `HUAWEI ${full}${isHarmony ? '（鸿蒙版）' : ''}`,
    cover: cover.url,
    imageCount: images.length,
  };
}

export const PRODUCTS = [...groups.values()]
  .sort((a, b) => a.id.localeCompare(b.id, 'zh', { numeric: true }))
  .map(toProduct);

export const CATEGORIES = [...new Set(PRODUCTS.map((p) => p.category))];
