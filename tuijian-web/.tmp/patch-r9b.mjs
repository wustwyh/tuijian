import {readFileSync, writeFileSync} from "node:fs";

// 预览也按 layout-specs 的宽度走，别再用默认 680
let ap = readFileSync("src/pages/ArticlePreview.jsx", "utf8");
ap = ap.split("<div className={`pf pf-${platformKind}`}>").join("<div className={`pf pf-${platformKind}`} style={{'--pf-w': `${spec.width}px`}}>");
writeFileSync("src/pages/ArticlePreview.jsx", ap);

let css = readFileSync("src/pages/platform-layout.css", "utf8");
css = css.replace(".xhs-card{display:none;width:min(100%,360px);", ".xhs-card{display:none;width:min(100%,340px);");
writeFileSync("src/pages/platform-layout.css", css);

let wb = readFileSync("src/pages/article-workbench.css", "utf8");
wb = wb.replace(".wb-frame.is-mobile .wb-render-inner{max-width:390px;padding:18px 16px 40px}", ".wb-frame.is-mobile .wb-render-inner{max-width:390px;padding:12px 12px 40px}");
writeFileSync("src/pages/article-workbench.css", wb);
console.log("ok");
