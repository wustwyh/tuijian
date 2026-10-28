// 各平台电脑版版式的唯一数字来源：预览（ArticlePreview）与导出（publish-html）都读这里，
// 不许两边各写一套。
// width     正栏宽度（px）
// imgMax    正文配图最大宽度（px），0 表示走网格逻辑
// imgMaxH   正文配图最大高度（px），避免竖图占满一屏
// radius    图片圆角
// title     标题字号
// body      正文字号
// fig       图注对齐：center | left
export const LAYOUT_SPECS = {
  // 公众号：正文 620 栏，图片满栏但限高，图注居中
  article: {width: 620, imgMax: 560, imgMaxH: 360, radius: 8, title: 22, body: 15.5, fig: 'center', font: 'sans' },
  // 新闻稿：报纸式窄栏，图片比正文窄、靠左带引线图注
  news: {width: 700, imgMax: 440, imgMaxH: 300, radius: 2, title: 26, body: 15.5, fig: 'left', font: 'serif' },
  // 知乎：问答栏，图片居中限宽
  qa: {width: 680, imgMax: 520, imgMaxH: 340, radius: 6, title: 22, body: 15.5, fig: 'center', font: 'sans' },
  // 微博：信息流短文案，配图走九宫格，不放大图
  feed: {width: 540, imgMax: 0, imgMaxH: 0, grid: 3, title: 0, body: 15, fig: 'none', font: 'sans' },
  // 门店海报：主视觉就该大
  poster: {width: 620, imgMax: 620, imgMaxH: 318, radius: 0, title: 42, body: 17, fig: 'left', font: 'sans' },
  // 朋友圈：桌面上就是一张 390 宽的卡，九宫格小图
  moment: {width: 380, imgMax: 0, imgMaxH: 0, grid: 3, title: 0, body: 15, fig: 'none', font: 'sans' },
  // 采购方案：文档栏，图小、居中带边框
  doc: {width: 760, imgMax: 420, imgMaxH: 300, radius: 4, title: 24, body: 15, fig: 'center', font: 'sans' },
  // 小红书：桌面三列卡片墙；手机上单卡 + 左右按钮翻页
  card: {width: 1080, imgMax: 0, imgMaxH: 0, cols: 3, title: 23, body: 15, fig: 'none', font: 'sans' },
};

export const layoutSpecOf = (kind) => LAYOUT_SPECS[kind] || LAYOUT_SPECS.article;
