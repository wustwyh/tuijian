// 发布视图隐藏内部依据标记，原始成稿及对应关系仍保留在生成记录中。
export const publicationText=text=>(text||'').replace(/\[f_\d+(?:[\s,，、;；]+f_\d+)*\]/g,'');

// 模型偶尔把配图直接写进正文：![主视觉](image_id:6afe9082…)。
// 图片插在哪由 image_plan 的 position 决定，正文里这种占位一律不发布，否则读者会看到一串乱码。
export const stripImageMarkdown=text=>String(text??'')
  .replace(/!\[[^\]]*\]\([^)]*\)/g,'')
  .replace(/image_id\s*[:：]\s*[0-9a-z]{8,}/gi,'');

// 行内写作标记（**加粗**、`代码`）只是成稿里的强调习惯，发布视图一律按纯文本呈现：
// 否则导出稿里会露出星号，预览（SourceText 已去掉）与导出就会长得不一样。
export const inlinePlainText=text=>stripImageMarkdown(publicationText(String(text??'')))
  .replace(/\*\*([^*]+)\*\*/g,'$1')
  .replace(/`([^`]+)`/g,'$1')
  .replace(/\*\*/g,'');

export function articleText(article){
  return [article.title,article.lead,article.body,article.cta,article.tags.map(tag=>'#'+tag.replace(/^#+/,'')).join(' ')].map(publicationText).filter(Boolean).join('\n\n');
}

// 成稿常用 markdown 标题（## 一、先说你的纠结…）分节。发布时井号不能印出来：
// 预览与导出都把它当小标题渲染，标题文本单独返回；不是标题就返回 null。
export const parseHeading=text=>{
  const match=/^\s*#{1,6}\s+(.+?)\s*#*\s*$/.exec(String(text??''));
  return match?inlinePlainText(match[1]).trim():null;
};

