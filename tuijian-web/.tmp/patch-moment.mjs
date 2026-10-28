import {readFileSync, writeFileSync} from "node:fs";
const file = "src/pages/ArticlePreview.jsx";
let s = readFileSync(file, "utf8");

const oldBlock = `        <div className="moment-post">
          {expanded ? (
            <details className="moment-more">
              <summary>
                <Hit edit={edit} block={{kind: 'article', text: publicationText(article.body).slice(0, 40)}} as="span" className="moment-text">{shown}</Hit>
                <span className="moment-lbl-open">展开全文（共 {length} 字）</span>
                <span className="moment-lbl-close">收起</span>
              </summary>
              <div className="moment-full">{full}</div>
            </details>
          ) : (
            <Hit edit={edit} block={{kind: 'article', text: publicationText(article.body).slice(0, 40)}} as="span" className="moment-text">{shown}</Hit>
          )}`;

const newBlock = `        <div className="moment-post">
          {/* 改稿态直接给全文，不折叠也不让收起：折叠后的「…」和三两个字最容易被误改 */}
          {edit ? (
            <Hit edit={edit} block={{kind: 'article', text: publicationText(article.body).slice(0, 40)}} as="div" className="moment-text is-full">{full}</Hit>
          ) : expanded ? (
            <details className="moment-more">
              <summary>
                <span className="moment-text">{shown}</span>
                <span className="moment-lbl-open">展开全文（共 {length} 字）</span>
                <span className="moment-lbl-close">收起</span>
              </summary>
              <div className="moment-full">{full}</div>
            </details>
          ) : (
            <div className="moment-text">{full}</div>
          )}`;

if (!s.includes(oldBlock)) throw new Error("moment 块没找到");
s = s.replace(oldBlock, newBlock);
writeFileSync(file, s);
console.log("moment preview patched");
