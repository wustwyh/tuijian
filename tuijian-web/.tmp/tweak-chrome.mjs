import {readFileSync, writeFileSync} from "node:fs";
const f = "src/platform-chrome.js";
let s = readFileSync(f, "utf8");

s = s.replace(
  `    case 'article':
      return A('pf-top', \`\${avatar(info)}\${ID(info, \` · \${info.time}\`)}<span class="pf-follow">关注</span>\`);`,
  `    case 'article':
      return A('pf-top', \`\${avatar(info)}\${ID(info, \` · \${info.time}\`)}<span class="pf-follow">关注</span><span class="pf-dots">···</span>\`);`
);

s = s.replace(
  `    case 'feed':
      return A('pf-top', \`\${avatar(info)}\${ID(info, \` · \${info.time}\`)}<span class="pf-follow">关注</span>\`);`,
  `    case 'feed':
      return \`<div class="pf-tabs"><span class="on">关注</span><span>推荐</span><span>热门</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, \` · \${info.time}\`)}<span class="pf-follow">关注</span>\`)}\`;`
);

s = s.replace(
  `    case 'qa':
      return \`<div class="pf-tabs"><span class="on">回答</span><span>文章</span><span>想法</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, ' · 作者')}<span class="pf-follow">关注</span>\`)}\`;`,
  `    case 'qa':
      return \`<div class="pf-tabs"><span class="on">回答</span><span>文章</span><span>想法</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, ' · 作者')}<span class="pf-badge">优秀回答者</span><span class="pf-follow">关注</span>\`)}\`;`
);

s = s.replace(
  `    case 'card':
      return A('pf-top', \`\${avatar(info)}\${ID(info, ' · 笔记作者')}<span class="pf-follow">关注</span>\`);`,
  `    case 'card':
      return \`<div class="pf-crumb"><b>发现</b>　关注　附近　<span style="margin-left:auto">🔍</span></div>
\${A('pf-top', \`\${avatar(info)}\${ID(info, ' · 笔记作者')}<span class="pf-follow">关注</span>\`)}\`;`
);

writeFileSync(f, s);
console.log("chrome tweaked");
