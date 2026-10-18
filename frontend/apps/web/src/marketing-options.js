export const channels = {
  xiaohongshu: { name: '小红书', icon: '小', description: '封面吸引 · 场景分享 · 图文笔记', shape: '3:4 竖版封面', bodyLabel: '笔记正文', extraLabel: '话题标签', extra: '#华为笔记本 #学习日常 #到店体验' },
  wechat_official: { name: '微信公众号', icon: '微', description: '横版封面 · 深度文章 · 阅读转化', shape: '16:9 横版封面', bodyLabel: '文章正文', extraLabel: '文章摘要', extra: '从日常场景出发，了解适合自己的使用方式。' },
  wechat_moments: { name: '朋友圈', icon: '圈', description: '好友沟通 · 简短配文 · 九宫格配图', shape: '1:1 方形配图', bodyLabel: '朋友圈配文', extraLabel: '互动引导', extra: '你平时最常用电脑做什么？欢迎留言聊聊。' },
  store_poster: { name: '门店海报', icon: '店', description: '醒目标题 · 产品主视觉 · 到店行动', shape: '2:3 门店竖版', bodyLabel: '海报说明', extraLabel: '门店信息', extra: '欢迎到店咨询 · 营业时间 10:00—21:00' },
};
export const channelOptions = Object.fromEntries(Object.entries(channels).map(([key, v]) => [key, v.name]));
export const creativeImages = [
  { id: 'harmony-green', productId: 'sample-14', name: 'MateBook 14 · 原野绿', product: 'HUAWEI MateBook 14（鸿蒙版）', src: '/demo-products/matebook-14-harmony-green.png' },
  { id: 'harmony-pink', productId: 'sample-14', name: 'MateBook 14 · 樱语粉', product: 'HUAWEI MateBook 14（鸿蒙版）', src: '/demo-products/matebook-14-harmony-pink.png' },
  { id: 'x-blue', productId: 'sample-x', name: 'MateBook X Pro · 蓝色', product: 'HUAWEI MateBook X Pro 微绒典藏版', src: '/demo-products/matebook-x-pro-blue.png' },
  { id: 'gt-silver', productId: 'sample-gt', name: 'MateBook GT 14 · 银色', product: 'HUAWEI MateBook GT 14', src: '/demo-products/matebook-gt-14-silver.png' },
];
