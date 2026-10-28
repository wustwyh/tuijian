import {buildPublishHtml} from '../src/publish-html.js';
import {platformSpec, PLATFORM_LAYOUTS} from '../src/platform-layout.js';

const article = {
  title: '备课上课批改，一台够顺手的本',
  lead: '备课在办公室、上课在教室、批改在家里，一天换好几个地方。',
  body: [
    '教育人的电脑，往往一天要换好几个场景。上午在办公室整理长文档，下午到教室接投影讲课，晚上回家接着批改。',
    '14.2英寸OLED屏，3:2比例，2880×1920分辨率，长文档上下比对时一屏能多看一截。',
    'Windows版支持十点触控，讲课时直接在屏幕上圈重点、做标注，比用鼠标比划更直观。',
    '机身重1.31 kg，厚14.5 mm，装在包里从办公室到教室不算负担。',
    '接口给得实在：一个全功能USB-C、两个USB3.2 Gen1、一个HDMI、一个3.5 mm音频口。',
    '续航与充电数据以具体配置和实测条件为准，实际使用会因负载和环境有差异。',
  ].join('\n'),
  cta: '想换机的可以到店实际掂一掂，感受会更直观。',
  tags: ['备课日常', '教学办公', '华为PC'],
  image_plan: [],
};

const captions = ['整机外观', '屏幕细节', '键盘手感', '接口侧面', '写实场景'];
// image_plan 必须与 loaded 对齐：卡片分页按 image_plan 计算，导出图按 loaded 取。
article.image_plan = captions.map((c, i) => ({ image_id: `im_${i + 1}`, caption: c, position: i === 0 ? 'cover' : 'body' }));
const loaded = captions.map((c, n) => ({
  img: { caption: `配图${n + 1}：${c}`, position: n === 0 ? 'cover' : 'body' },
  bytes: new Uint8Array([137, 80, 78, 71, n + 1]),
  mime: 'image/png',
}));

const cardCount = (html) => (html.match(/<section class="card /g) || []).length;

for (const id of Object.keys(PLATFORM_LAYOUTS)) {
  const spec = platformSpec(id);
  const html = buildPublishHtml({ article, loaded, spec, generatedTime: '2026/10/21 23:30:00' });
  const notes = [];
  if (html.includes('class="deck"')) notes.push(`卡片流 ${cardCount(html)} 张`);
  if (html.includes('class="page"')) notes.push('单页海报 620×820');
  if (html.includes('class="plat-warn"')) notes.push('带篇幅提示');
  if (html.includes('class="cover"') && id === 'xhs') notes.push('封面卡');
  if (!notes.length) notes.push('长文/单块版式');
  console.log(`${id.padEnd(9)} ${spec.layout.padEnd(8)} ${notes.join(' / ')}`);
}

// 专项断言
const xhs = buildPublishHtml({ article, loaded, spec: platformSpec('xhs'), generatedTime: '' });
const ok = [];
if (xhs.includes('class="deck"')) ok.push('横向滑动容器');
if (cardCount(xhs) >= 6) ok.push(`卡片数=${cardCount(xhs)}`);
if (xhs.includes('scroll-snap-type:x mandatory')) ok.push('翻页吸附');
if (xhs.includes('class="idx"')) ok.push('页码');
if (!xhs.includes('class="gallery"')) ok.push('已移除长竖列');
console.log('\n小红书检查：' + ok.join(' / '));
