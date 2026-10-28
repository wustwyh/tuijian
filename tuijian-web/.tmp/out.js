import { useState } from "react";
import SourceText from "./SourceText.jsx";
import { buildArticleFlow } from "../article-flow.js";
import { planXhsDeck } from "../card-deck.js";
import { inlinePlainText, publicationText, parseHeading } from "../publication.js";
import { momentText } from "../publish-html.js";
import { layoutSpecOf } from "../layout-specs.js";
import { ChromeTop, ChromeBottom, ChromeStyle } from "./PlatformChrome.jsx";
import { chromeInfo } from "../platform-chrome.js";
import "./platform-layout.css";
function ImageEvidence({ image, job, generatedTime }) {
  const evidence = image.evidence || {};
  const urls = Array.isArray(evidence.urls) ? evidence.urls : [];
  const rows = [
    ["\u6587\u4EF6", image.file],
    ["\u4F4D\u7F6E", [image.position, image.purpose].filter(Boolean).join(" \xB7 ")],
    ["\u6765\u6E90", evidence.source || image.provenance?.source || (image.provenance?.confirmed ? "\u77E5\u8BC6\u5E93\u539F\u56FE" : "\u5F85\u786E\u8BA4")],
    ["\u5339\u914D", evidence.match || image.description],
    ["\u65E5\u671F", evidence.date || generatedTime],
    ["\u4EFB\u52A1", job?.id?.slice(0, 8)]
  ].filter(([, v]) => v);
  return /* @__PURE__ */ React.createElement("details", { className: "ap-evidence" }, /* @__PURE__ */ React.createElement("summary", null, "\u6765\u6E90\u4E0E\u6838\u9A8C"), rows.map(([k, v]) => /* @__PURE__ */ React.createElement("p", { key: k }, k, "\uFF1A", String(v))), urls.map((url, i) => /* @__PURE__ */ React.createElement("a", { key: i, href: url, target: "_blank", rel: "noreferrer" }, "\u6765\u6E90 ", i + 1, " \u2197")));
}
function Hit({ edit, block, as: Tag = "div", className = "", children, ...rest }) {
  if (!edit) return /* @__PURE__ */ React.createElement(Tag, { className, ...rest }, children);
  const active = edit.selected && edit.selected.kind === block.kind && edit.selected.imageIndex === block.imageIndex && edit.selected.text === block.text;
  return /* @__PURE__ */ React.createElement(
    Tag,
    {
      className: `edit-hit ${className}${active ? " is-selected" : ""}`.trim(),
      role: "button",
      tabIndex: 0,
      "aria-label": `\u4FEE\u6539\u8FD9\u4E00\u6BB5\uFF1A${String(block.text || "").slice(0, 20)}`,
      onClick: (e) => {
        e.stopPropagation();
        edit.onPick(block);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          edit.onPick(block);
        }
      },
      ...rest
    },
    children
  );
}
export default function ArticlePreview({ job, result, platformKind, generatedTime, edit }) {
  const article = result.article;
  const images = article.image_plan || [];
  const [deckIndex, setDeckIndex] = useState(0);
  const spec = layoutSpecOf(platformKind);
  const info = chromeInfo({ platform: job?.summary?.platform, product: job?.summary?.product, audience: job?.summary?.audience, time: generatedTime });
  const style = {
    "--ap-w": `${spec.width}px`,
    "--ap-img": `${spec.imgMax || spec.width}px`,
    "--ap-img-h": `${spec.imgMaxH || 360}px`,
    "--ap-r": `${spec.radius || 0}px`,
    "--ap-t": `${spec.title || 22}px`,
    "--ap-b": `${spec.body || 15.5}px`
  };
  if (platformKind === "card") {
    const { cards, sources } = planXhsDeck(article);
    const total = cards.length;
    const go = (step) => {
      setDeckIndex((i) => Math.min(total - 1, Math.max(0, i + step)));
      edit?.onFlip?.();
    };
    return /* @__PURE__ */ React.createElement("div", { className: `pf pf-${platformKind}`, style: { "--pf-w": `${spec.width}px` } }, /* @__PURE__ */ React.createElement(ChromeStyle, null), /* @__PURE__ */ React.createElement(ChromeTop, { kind: platformKind, info }), /* @__PURE__ */ React.createElement("div", { className: "xhs-hint" }, total, " \u5F20\u5361\u7247 \xB7 \u7528\u5361\u7247\u4E24\u4FA7\u7684\u5DE6\u53F3\u6309\u94AE\u7FFB\u9875\uFF0C\u4E5F\u53EF\u4EE5\u6309\u952E\u76D8 \u2190 \u2192"), /* @__PURE__ */ React.createElement("div", { className: `xhs-deck${edit ? " is-editing" : ""}` }, cards.map((card, i) => {
      const badge = /* @__PURE__ */ React.createElement("span", { className: "xhs-idx" }, i + 1, "/", total);
      const active = i === deckIndex ? " is-active" : "";
      if (card.type === "cover") {
        const image = card.imageIndex >= 0 ? images[card.imageIndex] : null;
        return /* @__PURE__ */ React.createElement("section", { className: `xhs-card cover${image ? "" : " noimg"}${active}`, key: i }, image && /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "image", imageIndex: card.imageIndex, text: publicationText(image.caption) }, as: "span", className: "xhs-cover-img" }, /* @__PURE__ */ React.createElement("img", { className: "xhs-cover-img", src: image.url, alt: image.description || image.file })), /* @__PURE__ */ React.createElement("div", { className: "xhs-shade" }), /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "title", text: publicationText(article.title) }, as: "div", className: "xhs-cover-text" }, publicationText(article.title)), badge);
      }
      if (card.type === "image") {
        const image = images[card.imageIndex];
        return /* @__PURE__ */ React.createElement("section", { className: `xhs-card media${active}`, key: i }, /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "image", imageIndex: card.imageIndex, text: publicationText(image.caption) }, as: "span", className: "xhs-shot" }, /* @__PURE__ */ React.createElement("img", { className: "xhs-shot", src: image.url, alt: image.description || image.file, loading: "lazy" })), /* @__PURE__ */ React.createElement("div", { className: "xhs-cap" }, /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "caption", imageIndex: card.imageIndex, text: publicationText(image.caption) }, as: "strong" }, publicationText(image.caption)), /* @__PURE__ */ React.createElement("span", null, image.position, " \xB7 ", image.purpose), /* @__PURE__ */ React.createElement(ImageEvidence, { image, job, generatedTime })), badge);
      }
      if (card.type === "text") {
        return /* @__PURE__ */ React.createElement("section", { className: `xhs-card text${active}`, key: i }, /* @__PURE__ */ React.createElement("div", { className: "xhs-body" }, edit ? /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: card.from === "lead" ? "lead" : "para", text: card.paraText || card.text, segment: card.text }, as: "div" }, /* @__PURE__ */ React.createElement(SourceText, { text: publicationText(card.text) })) : /* @__PURE__ */ React.createElement(SourceText, { text: publicationText(card.text) })), badge);
      }
      return /* @__PURE__ */ React.createElement("section", { className: `xhs-card end${active}`, key: i }, /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "cta", text: publicationText(article.cta) }, as: "div", className: "xhs-cta" }, publicationText(article.cta)), /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "tags", text: (article.tags || []).join(" ") }, as: "div", className: "xhs-pills" }, (article.tags || []).map((tag, j) => /* @__PURE__ */ React.createElement("span", { key: j }, "#", tag.replace(/^#/, "")))), badge);
    })), sources.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "xhs-src" }, /* @__PURE__ */ React.createElement("b", null, "\u4E8B\u5B9E\u6765\u6E90\uFF08\u5185\u90E8\u5BF9\u7167\uFF0C\u4E0D\u8BA1\u5165\u53D1\u5E03\u6B63\u6587\uFF09"), sources.map((s, i) => /* @__PURE__ */ React.createElement("p", { key: i }, publicationText(s)))), (article.title_options || []).length > 0 && /* @__PURE__ */ React.createElement("details", { className: "result-details" }, /* @__PURE__ */ React.createElement("summary", null, "\u5907\u9009\u6807\u9898"), (article.title_options || []).map((t, i) => /* @__PURE__ */ React.createElement("p", { key: i }, publicationText(t)))), /* @__PURE__ */ React.createElement(ChromeBottom, { kind: platformKind, info }));
  }
  if (platformKind === "moment") {
    const { shown, full, expanded, length } = momentText(article);
    const shots = images.slice(0, 9);
    const gridClass = shots.length === 1 ? "n1" : shots.length === 2 ? "n2" : shots.length === 3 ? "n3" : "n4";
    const notes = [];
    if (shots.length) notes.push(`\u914D\u56FE ${shots.length} \u5F20 \xB7 \u53D6\u81EA\u77E5\u8BC6\u5E93\u539F\u56FE`);
    return /* @__PURE__ */ React.createElement("div", { className: `pf pf-${platformKind}`, style: { "--pf-w": `${spec.width}px` } }, /* @__PURE__ */ React.createElement(ChromeStyle, null), /* @__PURE__ */ React.createElement(ChromeTop, { kind: platformKind, info }), /* @__PURE__ */ React.createElement("div", { className: "moment-post" }, edit ? /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "article", text: publicationText(article.body).slice(0, 40) }, as: "div", className: "moment-text is-full" }, full) : expanded ? /* @__PURE__ */ React.createElement("details", { className: "moment-more" }, /* @__PURE__ */ React.createElement("summary", null, /* @__PURE__ */ React.createElement("span", { className: "moment-text" }, shown), /* @__PURE__ */ React.createElement("span", { className: "moment-lbl-open" }, "\u5C55\u5F00\u5168\u6587\uFF08\u5171 ", length, " \u5B57\uFF09"), /* @__PURE__ */ React.createElement("span", { className: "moment-lbl-close" }, "\u6536\u8D77")), /* @__PURE__ */ React.createElement("div", { className: "moment-full" }, full)) : /* @__PURE__ */ React.createElement("div", { className: "moment-text" }, full), shots.length > 0 && /* @__PURE__ */ React.createElement("div", { className: `moment-grid ${gridClass}` }, shots.map((image, i) => /* @__PURE__ */ React.createElement(Hit, { key: i, edit, block: { kind: "image", imageIndex: i, text: publicationText(image.caption) }, as: "span", className: "moment-shot" }, /* @__PURE__ */ React.createElement("img", { src: image.url, alt: image.description || image.file, loading: "lazy" }))))), notes.length > 0 && /* @__PURE__ */ React.createElement("p", { className: "moment-note" }, notes.join("\uFF1B")), edit && /* @__PURE__ */ React.createElement("div", { className: "edit-extra-targets" }, /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "cta", text: publicationText(article.cta) }, as: "p", className: "edit-extra-item" }, "\u6539\u7ED3\u5C3E\u884C\u52A8\u5F15\u5BFC")), /* @__PURE__ */ React.createElement(ChromeBottom, { kind: platformKind, info }));
  }
  const blocks = buildArticleFlow(article);
  return /* @__PURE__ */ React.createElement("div", { className: `pf pf-${platformKind}`, style: { "--pf-w": `${spec.width}px` } }, /* @__PURE__ */ React.createElement(ChromeStyle, null), /* @__PURE__ */ React.createElement(ChromeTop, { kind: platformKind, info }), /* @__PURE__ */ React.createElement("div", { className: "pf-body" }, /* @__PURE__ */ React.createElement("article", { className: `generated-article layout-${platformKind}${spec.font === "serif" ? " font-serif" : ""}${edit ? " is-editing" : ""}`, style }, /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "title", text: inlinePlainText(article.title) }, as: "h2" }, inlinePlainText(article.title)), (article.title_options || []).length > 0 && /* @__PURE__ */ React.createElement("details", { className: "result-details" }, /* @__PURE__ */ React.createElement("summary", null, "\u5907\u9009\u6807\u9898"), (article.title_options || []).map((t, i) => /* @__PURE__ */ React.createElement("p", { key: i }, inlinePlainText(t)))), /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "lead", text: inlinePlainText(article.lead) }, as: "p", className: "article-lead" }, inlinePlainText(article.lead)), /* @__PURE__ */ React.createElement("div", { className: "article-flow" }, blocks.map((block, i) => {
    if (block.type === "para") {
      const text = inlinePlainText(block.text);
      const heading = parseHeading(text);
      const kind = heading ? "heading" : "para";
      const inner = heading || text;
      return /* @__PURE__ */ React.createElement(Hit, { key: `p${i}`, edit, block: { kind, text: inner }, as: heading ? "h3" : "p", className: heading ? "article-heading" : "article-para" }, inner);
    }
    const image = images[block.imageIndex];
    if (!image) return null;
    return /* @__PURE__ */ React.createElement("figure", { key: `f${i}`, className: `article-figure fig-${spec.fig === "none" ? "center" : spec.fig}` }, /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "image", imageIndex: block.imageIndex, text: publicationText(image.caption) }, as: "span", className: "article-shot" }, /* @__PURE__ */ React.createElement("img", { src: image.url, alt: image.description || image.file, loading: "lazy" })), /* @__PURE__ */ React.createElement("figcaption", null, /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "caption", imageIndex: block.imageIndex, text: publicationText(image.caption) }, as: "span", className: "article-caption" }, publicationText(image.caption)), /* @__PURE__ */ React.createElement(ImageEvidence, { image, job, generatedTime })));
  })), /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "cta", text: inlinePlainText(article.cta) }, as: "p", className: "article-cta" }, inlinePlainText(article.cta)), /* @__PURE__ */ React.createElement(Hit, { edit, block: { kind: "tags", text: (article.tags || []).join(" ") }, as: "div", className: "article-tags" }, (article.tags || []).map((tag, i) => /* @__PURE__ */ React.createElement("span", { key: i }, "#", tag.replace(/^#/, "")))))), /* @__PURE__ */ React.createElement(ChromeBottom, { kind: platformKind, info }));
}
