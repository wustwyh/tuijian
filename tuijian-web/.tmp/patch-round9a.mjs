import {readFileSync, writeFileSync} from "node:fs";

// ---------- 1) 删掉 B 站 ----------
let pl = readFileSync("src/platform-layout.js", "utf8");
pl = pl.replace(/\n  bilibili: \{[\s\S]*?\n  \},\n/, "\n");
pl = pl.replace("  [/哔哩|B站|bilibili/i, 'bilibili'],\n", "");
writeFileSync("src/platform-layout.js", pl);

let co = readFileSync("server/compose-options.mjs", "utf8");
co = co.replace("  '09': ['bilibili', 'article', '视频简介与专栏长文'],\n", "");
writeFileSync("server/compose-options.mjs", co);

let test = readFileSync("server/platform-layout.test.mjs", "utf8");
test = test.replace("  assert.equal(platformSpec({ name: 'B站' }).id, 'bilibili');\n", "");
writeFileSync("server/platform-layout.test.mjs", test);

let gc = readFileSync("server/generation-context.mjs", "utf8");
gc = gc.replace(/bilibili:'[^']*',?/g, "").replace(/\s*\/\/\s*B站[^\n]*\n/g, "\n");
writeFileSync("server/generation-context.mjs", gc);

let css = readFileSync("src/chrome-css.js", "utf8");
css = css.replace("/* B站 */\n.pf-article.pf-bili{--pf-accent:#00aeec;--pf-accent-weak:#e9f8fd;--pf-radius:8px}\n", "");
writeFileSync("src/chrome-css.js", css);

// ---------- 2) 用户名统一改成「推鉴」 ----------
let pc = readFileSync("src/platform-chrome.js", "utf8");
pc = pc.replace(
  `export function chromeInfo({platform, product, audience, time}) {
  return {
    platform: platform || '平台',
    product: product || '产品',
    audience: audience || '目标客户',
    time: time || '',
    initial: String(product || '产')[0],
  };
}`,
  `// 账号名固定叫「推鉴」，不再拿产品名当用户名；产品信息只出现在副标题里。
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
}`
);
pc = pc.replace(
  `const ID = (info, extra = '') => \`<div class="pf-id"><span class="pf-name">\${info.product}</span><span class="pf-sub">\${info.platform}\${extra}</span></div>\`;`,
  `const ID = (info, extra = '', sub = '') => \`<div class="pf-id"><span class="pf-name">\${info.name}</span><span class="pf-sub">\${sub || info.platform}\${extra}</span></div>\`;`
);
// 公众号不要「关注」
pc = pc.replace(
  `    case 'article':
      return A('pf-top', \`\${avatar(info)}\${ID(info, \` · \${info.time}\`)}<span class="pf-follow">关注</span><span class="pf-dots">···</span>\`);`,
  `    case 'article':
      return A('pf-top', \`\${avatar(info)}\${ID(info, '', \`\${info.product} · \${info.time}\`)}<span class="pf-dots">···</span>\`);`
);
// 其他平台的副标题带上产品/人群，账号名仍是推鉴
pc = pc.replace(
  `    case 'qa':
      return \`<div class="pf-tabs"><span class="on">回答</span><span>文章</span><span>想法</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, ' · 作者')}<span class="pf-badge">优秀回答者</span><span class="pf-follow">关注</span>\`)}\`;`,
  `    case 'qa':
      return \`<div class="pf-tabs"><span class="on">回答</span><span>文章</span><span>想法</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, '', \`\${info.product} · 官方回答\`)}<span class="pf-follow">关注</span>\`)}\`;`
);
pc = pc.replace(
  `    case 'news':
      return \`<div class="pf-crumb">首页　&gt;　产品资讯　&gt;　<b>正文</b></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, '')}<span class="pf-badge">官方资讯</span>\`)}\`;`,
  `    case 'news':
      return \`<div class="pf-crumb">首页　&gt;　产品资讯　&gt;　<b>正文</b></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, '', \`\${info.product} · 官方资讯\`)}<span class="pf-badge">官方</span>\`)}\`;`
);
pc = pc.replace(
  `    case 'doc':
      return \`<div class="pf-crumb">企业采购　&gt;　<b>方案正文</b></div>\${A('pf-top', \`\${avatar(info)}\${ID(info, \` · \${info.time}\`)}<span class="pf-badge">内部评审</span>\`)}\`;`,
  `    case 'doc':
      return \`<div class="pf-crumb">企业采购　&gt;　<b>方案正文</b></div>\${A('pf-top', \`\${avatar(info)}\${ID(info, '', \`\${info.product} · \${info.time}\`)}<span class="pf-badge">内部评审</span>\`)}\`;`
);
pc = pc.replace(
  `    case 'feed':
      return \`<div class="pf-tabs"><span class="on">关注</span><span>推荐</span><span>热门</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, \` · \${info.time}\`)}<span class="pf-follow">关注</span>\`)}\`;`,
  `    case 'feed':
      return \`<div class="pf-tabs"><span class="on">关注</span><span>推荐</span><span>热门</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, '', \`\${info.time}\`)}<span class="pf-follow">关注</span>\`)}\`;`
);
pc = pc.replace(
  `    case 'card':
      return \`<div class="pf-crumb"><b>发现</b>　关注　附近　<span style="margin-left:auto">🔍</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, ' · 笔记作者')}<span class="pf-follow">关注</span>\`)}\`;`,
  `    case 'card':
      return \`<div class="pf-crumb"><b>发现</b>　关注　附近　<span style="margin-left:auto">🔍</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, '', \`\${info.time}\`)}<span class="pf-follow">关注</span>\`)}\`;`
);
pc = pc.replace(
  `    case 'moment':
      return A('pf-top', \`\${avatar(info)}\${ID(info, '')}\`);`,
  `    case 'moment':
      return A('pf-top', \`\${avatar(info)}\${ID(info, '', \`\${info.time}\`)}\`);`
);
writeFileSync("src/platform-chrome.js", pc);

// ---------- 3) 朋友圈截断：不再出现「……后面的多余文字」，改稿态直接全文 ----------
let pub = readFileSync("src/publish-html.js", "utf8");
pub = pub.replace(
  `  const ctaShown = cta ? clampText(cta, 45) : '';
  // 留出换成换行的 1 个字符，保证卡内文本严格不超过 limit。
  const room = Math.max(60, limit - (ctaShown ? ctaShown.length + 1 : 0));
  const cut = body.length > room;
  const head = cut ? \`\${body.slice(0, room - 1)}…\` : body;
  const shown = [head, ctaShown].filter(Boolean).join('\\n');
  const full = [body, cta].filter(Boolean).join('\\n');
  return {
    shown,
    full,
    expanded: shown !== full,
    trimmed: cut,
    length: full.length,
  };`,
  `  const full = [body, cta].filter(Boolean).join('\\n');
  const cut = full.length > limit;
  // 折叠时只在末尾放一个省略号，省略号后面不许再有半个字的尾巴。
  const shown = cut
    ? \`\${full.slice(0, limit - 1).replace(/[\\s，、；：,.;:]+$/, '')}…\`
    : full;
  return {
    shown,
    full,
    expanded: cut,
    trimmed: cut,
    length: full.length,
  };`
);
writeFileSync("src/publish-html.js", pub);
console.log("done");
