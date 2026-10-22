// 平台结构定义：前端导出版式、结果页预览、服务端提示词与硬检查共用这一份。
// 数据依据赛题手册第 4 页「平台场景」表：
//   公众号 标题/导语/分段正文/结尾行动引导，2–4 图
//   小红书 口语化标题/短段落/使用场景/话题标签，3–6 图，不得伪造个人体验
//   门店朋友圈 短文案、一个核心卖点、咨询或到店引导，1–3 图
//   门店海报 主标题/副标题/≤3 卖点/活动说明，1 张主视觉
// 其余平台手册未给硬指标，按宽松区间约束。

export const PLATFORM_LAYOUTS = {
  wechat: {
    label: '公众号长图文',
    layout: 'article',
    titleMax: 30,
    bodyMin: 300,
    bodyMax: 2500,
    imageMin: 2,
    imageMax: 4,
    tags: 'optional',
    rules: [
      '标题稳重不夸张，导语不超过 120 字，正文分段并给出结尾行动引导',
      '配图 2–4 张，每张都要说明用途与插入位置',
    ],
  },
  news: {
    label: '新闻稿',
    layout: 'news',
    titleMax: 40,
    bodyMin: 300,
    bodyMax: 2000,
    imageMin: 1,
    imageMax: 3,
    tags: 'forbidden',
    rules: [
      '以事实导语开头，交代谁、何时、何事，再展开信息主体',
      '不使用第一人称推销口吻，不带话题标签',
    ],
  },
  zhihu: {
    label: '知乎',
    layout: 'qa',
    titleMax: 50,
    bodyMin: 400,
    bodyMax: 3000,
    imageMin: 2,
    imageMax: 6,
    tags: 'optional',
    rules: [
      '以用户真实问题作标题，先给结论再给证据',
      '正文分小标题推进，配图 2–6 张',
    ],
  },
  xhs: {
    label: '小红书',
    layout: 'card',
    titleMax: 20,
    bodyMin: 150,
    bodyMax: 900,
    imageMin: 3,
    imageMax: 6,
    tags: 'required',
    rules: [
      '标题口语化、带身份感，正文短段落多空行，讲具体生活场景',
      '配图 3–6 张，必须带话题标签',
      '不得写没有发生过的个人体验（如「我用了三个月」）',
    ],
  },
  weibo: {
    label: '微博',
    layout: 'feed',
    titleMax: 24,
    bodyMin: 60,
    bodyMax: 500,
    imageMin: 1,
    imageMax: 4,
    tags: 'required',
    rules: [
      '短文案，正文一口气写完不分小标题',
      '话题标签放在开头或结尾，配图 1–4 张',
    ],
  },
  store: {
    label: '门店海报',
    layout: 'poster',
    titleMax: 12,
    bodyMin: 30,
    bodyMax: 400,
    imageMin: 1,
    imageMax: 1,
    tags: 'forbidden',
    rules: [
      '主标题不超过 12 字，副标题不超过 20 字',
      '卖点最多 3 条，每条不超过 15 字，只留 1 张主视觉',
      '不要输出成段正文或长句说明，正文整体不超过 120 字',
      '不得拉伸图片或替换为相近型号',
    ],
  },
  moments: {
    label: '销售朋友圈',
    layout: 'moment',
    titleMax: 0,
    bodyMin: 80,
    bodyMax: 150,
    imageMin: 1,
    imageMax: 3,
    tags: 'forbidden',
    rules: [
      '全文 80–150 字，只讲一个核心卖点',
      '结尾给到店或咨询引导，配图 1–3 张，不使用标题和话题标签',
      '必须压缩为一段口语化短文案，不要分成多段、不要用小标题',
    ],
  },
  business: {
    label: '企业采购方案',
    layout: 'doc',
    titleMax: 40,
    bodyMin: 600,
    bodyMax: 3500,
    imageMin: 1,
    imageMax: 4,
    tags: 'forbidden',
    rules: [
      '按「需求 → 候选 → 验证 → 方案」四段推进，可用编号与要点',
      '不承诺知识库未出现的价格、服务与政策',
    ],
  },
};

const BY_NAME = [
  [/公众号/, 'wechat'],
  [/新闻/, 'news'],
  [/知乎/, 'zhihu'],
  [/小红书/, 'xhs'],
  [/微博/, 'weibo'],
  [/海报|长图/, 'store'],
  [/朋友圈/, 'moments'],
  [/采购/, 'business'],
];

// 允许传平台 id，也允许传中文平台名；识别不出时返回 null，不抛错，调用方据此走通用逻辑。
export function platformSpec(platform) {
  if (!platform) return null;
  const key = typeof platform === 'string' ? platform : platform.id || platform.name || '';
  if (PLATFORM_LAYOUTS[key]) return { id: key, ...PLATFORM_LAYOUTS[key] };
  const text = String(platform?.name || key || '');
  for (const [pattern, id] of BY_NAME) if (pattern.test(text)) return { id, ...PLATFORM_LAYOUTS[id] };
  return null;
}

// 服务端提示词用：把结构约束压成一段硬性要求。
export function platformRulesText(platform) {
  const spec = platformSpec(platform);
  if (!spec) return '';
  const lines = [`【${spec.label}硬性结构】`, ...spec.rules.map((rule) => `- ${rule}`)];
  if (spec.tags === 'required') lines.push('- 必须在 tags 中给出至少 1 个话题标签');
  if (spec.tags === 'forbidden') lines.push('- 不要输出话题标签');
  if (spec.titleMax === 0) lines.push('- 不要输出标题，正文即全部文案');
  else if (spec.titleMax) lines.push(`- 标题不超过 ${spec.titleMax} 字`);
  lines.push(`- 配图 ${spec.imageMin}–${spec.imageMax} 张；候选图不足时按实际数量输出并说明`);
  // 模型曾把配图直接写进正文（![主视觉](image_id:…)），发布出来就是一串乱码。
  lines.push('- 正文里不要写任何图片语法或图片编号（如 ![图注](image_id:…)、image_id:…），配图只通过 image_plan 的字段表达');
  if (spec.id === 'moments') lines.push(`- 正文长度必须在 ${spec.bodyMin}–${spec.bodyMax} 字之间，超出即判为不合格`);
  if (spec.id === 'store') lines.push('- 正文按「短卖点」写，单条不超过 15 字，不要写成完整段落');
  // 画幅有限的平台（海报 620×820、朋友圈单卡）写超了会溢出，这里给出总字数红线。
  if (spec.bodyMax <= 160) lines.push(`- 正文加行动引导合计不得超过 ${spec.bodyMax} 字，这是硬性上限，超出会被要求重写`);
  return lines.join('\n');
}
