import SourceText from './SourceText.jsx';
import {publicationText, inlinePlainText, parseHeading} from '../publication.js';
import {planXhsDeck} from '../card-deck.js';
import {buildArticleFlow} from '../article-flow.js';
import {momentText} from '../publish-html.js';

// 图片出处折叠区：预览与卡片流共用，保证来源信息不被卡片布局省略。
function ImageEvidence({ image, job, generatedTime }) {
  return (
    <details className="result-details">
      <summary>图片出处</summary>
      <p>{image.file}</p>
      <p>所属型号：{job.summary.product}</p>
      <p>ima条目：{image.file}</p>
      <p>ima获取时间：{generatedTime}</p>
      <p>{image.description}</p>
      {image.pageUrl && <a href={image.pageUrl} target="_blank" rel="noreferrer">原页面 ↗</a>}
      {image.sourceUrl && <a href={image.sourceUrl} target="_blank" rel="noreferrer">原图 ↗</a>}
    </details>
  );
}

export default function ArticlePreview({ job, result, platformKind, generatedTime }) {
  const article = result.article;
  const images = article.image_plan || [];

  // 小红书：一屏一卡、左右翻页
  if (platformKind === 'card') {
    const { cards, sources } = planXhsDeck(article);
    const total = cards.length;
    return (
      <>
        <div className="xhs-hint">左右滑动查看 {total} 张卡片 · 一屏一张</div>
        <div className="xhs-deck">
          {cards.map((card, i) => {
            const badge = <span className="xhs-idx">{i + 1}/{total}</span>;
            if (card.type === 'cover') {
              const image = card.imageIndex >= 0 ? images[card.imageIndex] : null;
              return (
                <section className={`xhs-card cover${image ? '' : ' noimg'}`} key={i}>
                  {image && <img className="xhs-cover-img" src={image.url} alt={image.description || image.file} />}
                  <div className="xhs-shade" />
                  <div className="xhs-cover-text">{publicationText(article.title)}</div>
                  {badge}
                </section>
              );
            }
            if (card.type === 'image') {
              const image = images[card.imageIndex];
              return (
                <section className="xhs-card media" key={i}>
                  <img className="xhs-shot" src={image.url} alt={image.description || image.file} loading="lazy" />
                  <div className="xhs-cap">
                    <strong>{publicationText(image.caption)}</strong>
                    <span>{image.position} · {image.purpose}</span>
                    <ImageEvidence image={image} job={job} generatedTime={generatedTime} />
                  </div>
                  {badge}
                </section>
              );
            }
            if (card.type === 'text') {
              return (
                <section className="xhs-card text" key={i}>
                  <div className="xhs-body"><SourceText text={publicationText(card.text)} /></div>
                  {badge}
                </section>
              );
            }
            return (
              <section className="xhs-card end" key={i}>
                <div className="xhs-cta">{publicationText(article.cta)}</div>
                <div className="xhs-pills">
                  {(article.tags || []).map((tag, j) => <span key={j}>#{tag.replace(/^#/, '')}</span>)}
                </div>
                {badge}
              </section>
            );
          })}
        </div>
        {sources.length > 0 && (
          <div className="xhs-src">
            <b>事实来源（内部对照，不计入发布正文）</b>
            {sources.map((s, i) => <p key={i}>{publicationText(s)}</p>)}
          </div>
        )}
        {(article.title_options || []).length > 0 && (
          <details className="result-details">
            <summary>备选标题</summary>
            {(article.title_options || []).map((t, i) => <p key={i}>{publicationText(t)}</p>)}
          </details>
        )}
      </>
    );
  }

  // 销售朋友圈：卡内只放前 150 字，剩余全文点「展开全文」看，与导出一致
  if (platformKind === 'moment') {
    const { shown, full, expanded, length } = momentText(article);
    const shots = images.slice(0, 9);
    const gridClass = shots.length === 1 ? 'n1' : shots.length === 2 ? 'n2' : shots.length === 3 ? 'n3' : 'n4';
    const notes = [];
    if (shots.length) notes.push(`配图 ${shots.length} 张 · 取自知识库原图`);
    if (expanded) notes.push(`卡内按朋友圈篇幅展示 ${shown.length} 字，点「展开全文」看完整文案`);
    return (
      <div className="moment-wrap">
        <div className="moment-post">
          {expanded ? (
            <details className="moment-more">
              <summary>
                <span className="moment-text">{shown}</span>
                <span className="moment-lbl-open">展开全文（共 {length} 字）</span>
                <span className="moment-lbl-close">收起</span>
              </summary>
              <div className="moment-full">{full}</div>
            </details>
          ) : (
            <span className="moment-text">{shown}</span>
          )}
          {shots.length > 0 && (
            <div className={`moment-grid ${gridClass}`}>
              {shots.map((image, i) => (
                <img key={i} src={image.url} alt={image.description || image.file} loading="lazy" />
              ))}
            </div>
          )}
        </div>
        {notes.length > 0 && <p className="moment-note">{notes.join('；')}</p>}
      </div>
    );
  }

  // 其他平台：沿用原有长文/短文案版式
  return (
    <article className={`generated-article layout-${platformKind}`}>
      <div className="article-platform">{job.summary.platform}</div>
      <h2>{inlinePlainText(article.title)}</h2>
      {(article.title_options || []).length > 0 && (
        <details className="result-details">
          <summary>备选标题</summary>
          {(article.title_options || []).map((t, i) => <p key={i}>{inlinePlainText(t)}</p>)}
        </details>
      )}
      <p className="article-lead">{inlinePlainText(article.lead)}</p>
      <div className="article-flow">
        {(() => {
          const blocks = buildArticleFlow(article);
          return blocks.map((block, i) => {
            if (block.type === 'para') {
              const text = inlinePlainText(block.text);
              const heading = parseHeading(text);
              return heading
                ? <h3 className="article-heading" key={`p${i}`}>{heading}</h3>
                : <p className="article-para" key={`p${i}`}>{text}</p>;
            }
            const image = images[block.imageIndex];
            if (!image) return null;
            return (
              <figure className="article-figure" key={`f${i}`}>
                <img src={image.url} alt={image.description || image.file} loading="lazy" />
                <figcaption>
                  <p>{image.provenance?.confirmed ? '产品图 · 来源 ima' : '产品图'}</p>
                  <strong>{publicationText(image.caption)}</strong>
                  <span>{image.position} · {image.purpose}</span>
                  <ImageEvidence image={image} job={job} generatedTime={generatedTime} />
                </figcaption>
              </figure>
            );
          });
        })()}
      </div>
      <p className="article-cta">{inlinePlainText(article.cta)}</p>
      <div className="article-tags">
        {(article.tags || []).map((tag, i) => <span key={i}>#{tag.replace(/^#/, '')}</span>)}
      </div>
    </article>
  );
}
