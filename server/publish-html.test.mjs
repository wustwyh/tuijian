import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPublishHtml} from '../src/publish-html.js';
import {platformSpec} from '../src/platform-layout.js';

const loaded = (count) => Array.from({ length: count }, (_, i) => ({
  img: { caption: `配图${i + 1}`, position: i === 0 ? 'cover' : 'body' },
  mime: 'image/png',
  bytes: new Uint8Array([137, 80, 78, 71, i]),
}));

const article = (over = {}) => ({
  title: '轻装移动办公新选择',
  lead: '差旅路上包太重、会议演示屏要清楚、临时工位接口要够用，这台机器给出了一个更轻的答案。',
  body: [
    '出差、客户会议、临时工位切换，移动办公最怕的就是包太重、屏不清、协同断。',
    '整机轻至约798克起，放进包里负担更小。',
    '会议演示时，14.2英寸3:2柔性OLED触控屏，分辨率3120×2080，支持120Hz刷新率和十点触控。',
  ].join('\n'),
  cta: '欢迎到店咨询具体配置，预约上手体验。',
  tags: [],
  image_plan: Array.from({ length: 3 }, (_, i) => ({ image_id: `im_${i}` })),
  ...over,
});

const html = (id, over, count = 3) =>
  buildPublishHtml({ article: article(over), loaded: loaded(count), spec: platformSpec(id), generatedTime: '2026/10/21' });

test('门店海报画幅固定为 820px，不会内容多高就多高', () => {
  const out = html('store', {}, 1);
  assert.match(out, /\.page\{[^}]*height:820px/);
  assert.match(out, /overflow:hidden/);
});

test('门店海报卖点最多 3 条且每条是短句，不塞整段正文', () => {
  const out = html('store', {}, 1);
  const block = /<ul class="points">([\s\S]*?)<\/ul>/.exec(out);
  assert.ok(block, '应有卖点列表');
  const points = [...block[1].matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
  assert.ok(points.length >= 1 && points.length <= 3, `卖点条数应在 1–3，实际 ${points.length}`);
  for (const p of points) assert.ok(p.length <= 17, `卖点「${p}」过长（${p.length} 字）`);
});

test('门店海报跳过「会议演示时」这类无信息碎片和数字打头的截断串', () => {
  const out = html('store', {}, 1);
  const points = [...out.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
  assert.ok(!points.some((p) => p.length < 8), `出现了过短碎片：${points.join(' / ')}`);
  assert.ok(!points.some((p) => /^[\dA-Za-z]/.test(p)), `出现了非中文打头的碎片：${points.join(' / ')}`);
});

test('门店海报只放 1 张主视觉', () => {
  const out = html('store', {}, 3);
  assert.equal((out.match(/<img\b[^>]*src="data:/g) || []).length, 1);
});

test('朋友圈卡内文本不超过 150 字', () => {
  const long = { body: Array.from({ length: 20 }, () => '常出差的人选本要先掂包轻不轻、屏够不够用。').join('\n') };
  const out = html('moments', long, 3);
  const text = /<span class="text">([\s\S]*?)<\/span>/.exec(out)[1].replace(/&quot;/g, '"');
  assert.ok(text.length <= 150, `朋友圈文本 ${text.length} 字，超过 150`);
});

test('朋友圈不出现标题和话题标签', () => {
  const out = html('moments', {}, 3);
  const text = /<span class="text">([\s\S]*?)<\/span>/.exec(out)[1];
  assert.ok(!/#/.test(text), '不应有话题标签');
  assert.ok(!text.includes('轻装移动办公新选择'), '不应把标题写进文案');
  assert.ok(!/class="meta"/.test(out), '不应有标题栏');
});

test('朋友圈配图按张数选择网格：1/2/3/更多', () => {
  const gridOf = (n) => /class="grid (n\d)"/.exec(html('moments', {}, n))?.[1];
  assert.equal(gridOf(1), 'n1');
  assert.equal(gridOf(2), 'n2');
  assert.equal(gridOf(3), 'n3');
  assert.equal(gridOf(5), 'n4');
});

test('朋友圈超长时自动截断并给「展开全文」，不再弹篇幅提示', () => {
  const long = { body: Array.from({ length: 20 }, () => '常出差的人选本要先掂包轻不轻、屏够不够用。').join('\n') };
  const out = html('moments', long, 1);
  const shown = /<span class="text">([\s\S]*?)<\/span>/.exec(out)[1].replace(/&quot;/g, '"');
  assert.ok(shown.length <= 150, `卡内文字 ${shown.length} 字，超过 150`);
  assert.match(out, /<details class="more">[\s\S]*展开全文/);
  const full = /<div class="full">([\s\S]*?)<\/div>/.exec(out)[1];
  assert.ok(full.length > shown.length, '展开后的全文应比卡内展示的文字更长');
  assert.ok(full.includes('常出差的人'), '展开全文不能丢正文');
  assert.match(out, /class="clip"/);
  assert.ok(!/篇幅提示/.test(out), '朋友圈超长已自动折叠，不应再弹篇幅提示');
});

test('朋友圈展开后不再重复截断文本，收起按钮排在全文之后', () => {
  const long = { body: Array.from({ length: 20 }, () => '常出差的人选本要先掂包轻不轻、屏够不够用。').join('\n') };
  const out = html('moments', long, 1);
  // 截断版只有一份，且它在 <summary> 里；全文放在 details 正文里
  assert.equal((out.match(/class="text"/g) || []).length, 1, '截断文本只能出现一次');
  const summary = /<summary>([\s\S]*?)<\/summary>/.exec(out)[1];
  assert.match(summary, /class="text"/);
  assert.match(summary, /class="lbl-open"/);
  assert.match(summary, /class="lbl-close"/);
  // 展开后隐藏截断文本、只留「收起」，并把收起按钮排到全文下面
  assert.match(out, /details\.more\[open\] \.text\{display:none\}/);
  assert.match(out, /details\.more\[open\] \.lbl-close\{display:block\}/);
  assert.match(out, /details\.more \.full\{order:1/);
  assert.match(out, /details\.more summary\{order:2/);
});

test('公众号正文的「## 一、…」渲染成小标题，井号不上屏', () => {
  const body = ['## 一、先说你的纠结：屏幕要舒服，接口要够用', '长文档一屏能多看一截，写起来不来回滚。', '## 二、接口比转接头省心', '一个全功能 USB-C、一个 HDMI，接投影不用转接。'].join('\n');
  const out = html('wechat', { body }, 2);
  assert.match(out, /<h3>一、先说你的纠结：屏幕要舒服，接口要够用<\/h3>/);
  assert.match(out, /<h3>二、接口比转接头省心<\/h3>/);
  assert.ok(!out.includes('##'), '导出稿里不应出现 markdown 井号');
});

test('知乎与企业采购同样把井号渲染成小标题', () => {
  const body = ['## 先给结论：这台本适合谁', '适合经常出差、需要长文档和投屏的人。'].join('\n');
  for (const id of ['zhihu', 'business']) {
    const out = html(id, { body }, 2);
    assert.match(out, /<h3>先给结论：这台本适合谁<\/h3>/, `${id} 应有小标题`);
    assert.ok(!out.includes('##'), `${id} 导出稿不应出现井号`);
  }
});

test('正文里的图片占位行不会印成乱码，图片仍按 image_plan 插入', () => {
  const body = [
    '先说便携：整机约798克，通勤包里负担小。',
    '',
    '![主视觉](image_id:6afe9082b4ae278a15c46ccc57d0d6e92fecb7df48109252770f18d1cfa2bf19)',
    '',
    '再说屏幕：3:2比例看长文档更从容。',
  ].join('\n');
  for (const id of ['wechat', 'zhihu', 'news', 'business', 'xhs', 'moments', 'store', 'weibo']) {
    const out = html(id, { body }, 3);
    assert.ok(!out.includes('image_id'), `${id} 导出稿不应出现 image_id`);
    assert.ok(!out.includes('!['), `${id} 导出稿不应出现 markdown 图片语法`);
    assert.ok(!/<p>\s*<\/p>/.test(out), `${id} 不应留下空段落`);
    assert.ok(out.includes('先说便携'), `${id} 正文内容不能丢`);
  }
  // 公众号：两张正文图 + 一张封面图都要在
  assert.equal((html('wechat', { body }, 3).match(/<figure\b/g) || []).length, 3);
});
