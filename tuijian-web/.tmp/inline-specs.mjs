import {readFileSync, writeFileSync} from 'node:fs';
import {LAYOUT_SPECS as S} from '../src/layout-specs.js';

const file = 'src/publish-html.js';
let src = readFileSync(file, 'utf8');

const figCssText = (spec, align) => `figure{margin:20px 0;display:flex;flex-direction:column;gap:8px}
figure img{display:block;margin:0 auto;width:auto;max-width:min(100%,${spec.imgMax}px);max-height:${spec.imgMaxH}px;height:auto;object-fit:contain;border-radius:${spec.radius}px;background:#f7f4f6}
figcaption{font-size:12.5px;color:#8b7d84;line-height:1.7;text-align:${align}}`;

// ${figCss(S.article, 'center')} → 具体 CSS
src = src.replace(/\$\{figCss\(S\.(\w+), '(\w+)'\)\}/g, (_, kind, align) => figCssText(S[kind], align));
// ${S.article.width} → 具体数字
src = src.replace(/\$\{S\.(\w+)\.(\w+)\}/g, (m, kind, key) => {
  const value = S[kind]?.[key];
  if (value === undefined) throw new Error('未知规格：' + m);
  return String(value);
});
if (/\$\{S\./.test(src) || /figCss\(/.test(src)) throw new Error('还有没替换的规格引用');
writeFileSync(file, src);
console.log('规格已内联');
