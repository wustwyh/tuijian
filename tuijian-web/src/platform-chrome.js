// 平台外壳：每种平台头部/底部的结构与文案。
// 一套给导出 HTML（返回字符串），一套给 React 预览（返回元素），类名完全一致。
// 账号名固定叫「推鉴」，不再拿产品名当用户名；产品信息只出现在副标题里。
export const BRAND_NAME = '推鉴';

export function chromeInfo({platform, product, audience, time}) {
  return {
    platform: platform || '平台',
    product: product || '产品',
    audience: audience || '目标客户',
    time: time || '',
    name: BRAND_NAME,
    initial: BRAND_NAME[0],
  };
}

const A = (cls, inner) => `<div class="${cls}">${inner}</div>`;

const avatar = (info) => `<span class="pf-avatar">${info.initial}</span>`;

const acts = (list) => `<div class="pf-foot">${list.map(([icon, label]) => `<span class="pf-act"><i>${icon}</i>${label}</span>`).join('')}</div>`;

const ID = (info, extra = '', sub = '') => `<div class="pf-id"><span class="pf-name">${info.name}</span><span class="pf-sub">${sub || info.platform}${extra}</span></div>`;

export function chromeTopHtml(kind, info) {
  switch (kind) {
    case 'article':
      return A('pf-top', `${avatar(info)}${ID(info, '', `${info.product} · ${info.time}`)}<span class="pf-dots">···</span>`);
    case 'news':
      return `<div class="pf-crumb">首页　&gt;　产品资讯　&gt;　<b>正文</b></div>
${A('pf-top', `${avatar(info)}${ID(info, '', `${info.product} · 官方资讯`)}<span class="pf-badge">官方</span>`)}`;
    case 'qa':
      return `<div class="pf-tabs"><span class="on">回答</span><span>文章</span><span>想法</span></div>
${A('pf-top', `${avatar(info)}${ID(info, '', `${info.product} · 官方回答`)}<span class="pf-follow">关注</span>`)}`;
    case 'feed':
      return `<div class="pf-tabs"><span class="on">关注</span><span>推荐</span><span>热门</span></div>
${A('pf-top', `${avatar(info)}${ID(info, '', `${info.time}`)}<span class="pf-follow">关注</span>`)}`;
    case 'card':
      return `<div class="pf-crumb"><b>发现</b>　关注　附近　<span style="margin-left:auto">🔍</span></div>
${A('pf-top', `${avatar(info)}${ID(info, '', `${info.time}`)}<span class="pf-follow">关注</span>`)}`;
    case 'moment':
      return A('pf-top', `${avatar(info)}${ID(info, '', `${info.time}`)}`);
    case 'poster':
      return `<div class="pf-crumb">门店物料　&gt;　<b>长图</b></div>`;
    case 'doc':
      return `<div class="pf-crumb">企业采购　&gt;　<b>方案正文</b></div>${A('pf-top', `${avatar(info)}${ID(info, '', `${info.product} · ${info.time}`)}<span class="pf-badge">内部评审</span>`)}`;
    default:
      return `<div class="pf-tabs"><span class="on">图文</span><span>视频</span></div>${A('pf-top', `${avatar(info)}${ID(info, ` · ${info.time}`)}<span class="pf-follow">关注</span>`)}`;
  }
}

export function chromeBottomHtml(kind, info) {
  switch (kind) {
    case 'article':
      return acts([['👍', '赞'], ['👀', '在看'], ['↗', '分享']]);
    case 'news':
      return `<div class="pf-foot"><span class="pf-act">责任编辑：产品市场</span><span class="pf-act">来源：${info.product}</span></div>`;
    case 'qa':
      return acts([['▲', '赞同'], ['💬', '评论'], ['↗', '分享'], ['★', '收藏']]);
    case 'feed':
      return acts([['↻', '转发'], ['💬', '评论'], ['👍', '赞']]);
    case 'card':
      return `<div class="pf-foot"><span class="pf-act">♡ 点赞</span><span class="pf-act">☆ 收藏</span><span class="pf-act">💬 评论</span><span class="pf-act">↗ 分享</span></div>`;
    case 'moment':
      return `<div class="pf-foot"><span class="pf-act">${info.time}</span><span class="pf-act">♡ 赞</span><span class="pf-act">💬 评论</span></div>`;
    case 'poster':
      return `<div class="pf-foot"><span class="pf-act">到店咨询｜以门店实际配置为准</span></div>`;
    case 'doc':
      return `<div class="pf-foot"><span class="pf-act">仅供内部评估使用</span></div>`;
    default:
      return acts([['👍', '点赞'], ['★', '收藏'], ['💬', '评论']]);
  }
}
