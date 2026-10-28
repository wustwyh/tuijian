import {useState} from 'react';
import SourceText from './SourceText.jsx';
import {buildArticleFlow} from '../article-flow.js';
import {planXhsDeck} from '../card-deck.js';
import {inlinePlainText, publicationText, parseHeading} from '../publication.js';
import {momentText} from '../publish-html.js';
import {layoutSpecOf} from '../layout-specs.js';
import {ChromeTop, ChromeBottom, ChromeStyle} from './PlatformChrome.jsx';
import {chromeInfo} from '../platform-chrome.js';
import './platform-layout.css';

// 图片核验信息：只在「来源与核验」里展开，不占正文观感。
function ImageEvidence({ image, job, generatedTime }) {
  const evidence = image.evidence || {};
  const urls = Array.isArray(evidence.urls) ? evidence.urls : [];
  const rows = [
    ['文件', image.file],
    ['位置', [image.position, image.purpose].filter(Boolean).join(' · ')],
    ['来源', evidence.source || image.provenance?.source || (image.provenance?.confirmed ? '知识库原图' : '待确认')],
    ['匹配', evidence.match || image.description],
    ['日期', evidence.date || generatedTime],
    ['任务', job?.id?.slice(0, 8)],
  ].filter(([, v]) => v);
  return (
    <details className="ap-evidence">
      <summary>来源与核验</summary>
      {rows.map(([k, v]) => <p key={k}>{k}：{String(v)}</p>)}
      {urls.map((url, i) => <a key={i} href={url} target="_blank" rel="noreferrer">来源 {i + 1} ↗</a>)}
    </details>
  );
}

// 可点块：编辑态下把一个区域变成可点选的改稿目标。
function Hit({ edit, block, as: Tag = 'div', className = '', children, ...rest }) {
  if (!edit) return <Tag className={className} {...rest}>{children}</Tag>;
  const active = edit.selected && edit.selected.kind === block.kind && edit.selected.imageIndex === block.imageIndex && edit.selected.text === block.text;
  return (
    <Tag
      className={`edit-hit ${className}${active ? ' is-selected' : ''}`.trim()}
      role="button"
      tabIndex={0}
      aria-label={`修改这一段：${String(block.text || '').slice(0, 20)}`}
      onClick={(e) => { e.stopPropagation(); edit.onPick(block); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edit.onPick(block); } }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default function ArticlePreview({ job, result, platformKind, generatedTime, edit }) {
  const article = result.article;
  const images = article.image_plan || [];
  const [deckIndex, setDeckIndex] = useState(0);
  const spec = layoutSpecOf(platformKind);
  const info = chromeInfo({ platform: job?.summary?.platform, product: job?.summary?.product, audience: job?.summary?.audience, time: generatedTime });
  const style = {
    '--ap-w': `${spec.width}px`,
    '--ap-img': `${spec.imgMax || spec.width}px`,
    '--ap-img-h': `${spec.imgMaxH || 360}px`,
    '--ap-r': `${spec.radius || 0}px`,
    '--ap-t': `${spec.title || 22}px`,
    '--ap-b': `${spec.body || 15.5}px`,
  };

  // 小红书：桌面上是三列卡片墙，窄屏一屏一卡 + 左右按钮翻页（不靠滑动）
  if (platformKind === 'card') {
    const { cards, sources } = planXhsDeck(article);
    const total = cards.length;
    const go = (step) => {
      setDeckIndex((i) => Math.min(total - 1, Math.max(0, i + step)));
      // 换卡片就把上一处选中清掉，避免高亮跟着跑到别的卡片上
      edit?.onFlip?.();
    };
    return (
      <div className={`pf pf-${platformKind}`} style={{'--pf-w': `${spec.width}px`}}>
        <ChromeStyle/>
        <ChromeTop kind={platformKind} info={info}/>
        <div className="xhs-hint">{total} 张卡片 · 用卡片两侧的左右按钮翻页，也可以按键盘 ← →</div>
        <div className={`xhs-deck${edit ? ' is-editing' : ''}`}>
          {cards.map((card, i) => {
            const badge = <span className="xhs-idx">{i + 1}/{total}</span>;
            const active = i === deckIndex ? ' is-active' : '';
            if (card.type === 'cover') {
              const image = card.imageIndex >= 0 ? images[card.imageIndex] : null;
              return (
                <section className={`xhs-card cover${image ? '' : ' noimg'}${active}`} key={i}>
                  {image && <Hit edit={edit} block={{kind: 'image', imageIndex: card.imageIndex, text: publicationText(image.caption)}} as="span" className="xhs-cover-img"><img className="xhs-cover-img" src={image.url} alt={image.description || image.file}/></Hit>}
                  <div className="xhs-shade" />
                  <Hit edit={edit} block={{kind: 'title', text: publicationText(article.title)}} as="div" className="xhs-cover-text">{publicationText(article.title)}</Hit>
                  {badge}
                </section>
              );
            }
            if (card.type === 'image') {
              const image = images[card.imageIndex];
              return (
                <section className={`xhs-card media${active}`} key={i}>
                  <Hit edit={edit} block={{kind: 'image', imageIndex: card.imageIndex, text: publicationText(image.caption)}} as="span" className="xhs-shot"><img className="xhs-shot" src={image.url} alt={image.description || image.file} loading="lazy" /></Hit>
                  <div className="xhs-cap">
                    <Hit edit={edit} block={{kind: 'caption', imageIndex: card.imageIndex, text: publicationText(image.caption)}} as="strong">{publicationText(image.caption)}</Hit>
                    <span>{image.position} · {image.purpose}</span>
                    <ImageEvidence image={image} job={job} generatedTime={generatedTime} />
                  </div>
                  {badge}
                </section>
              );
            }
            if (card.type === 'text') {
              return (
                <section className={`xhs-card text${active}`} key={i}>
                  <div className="xhs-body">
                    {edit
                      ? <Hit edit={edit} block={{kind: card.from === 'lead' ? 'lead' : 'para', text: card.paraCount > 1 ? card.text : (card.paraText || card.text), segment: card.text, paraCount: card.paraCount}} as="div"><SourceText text={publicationText(card.text)} /></Hit>
                      : <SourceText text={publicationText(card.text)} />}
                  </div>
                  {badge}
                </section>
              );
            }
            return (
              <section className={`xhs-card end${active}`} key={i}>
                <Hit edit={edit} block={{kind: 'cta', text: publicationText(article.cta)}} as="div" className="xhs-cta">{publicationText(article.cta)}</Hit>
                <Hit edit={edit} block={{kind: 'tags', text: (article.tags || []).join(' ')}} as="div" className="xhs-pills">
                  {(article.tags || []).map((tag, j) => <span key={j}>#{tag.replace(/^#/, '')}</span>)}
                </Hit>
                {badge}
              </section>
            );
          })}
          {total > 1 && (
            <div className="xhs-nav">
              <button type="button" className="is-prev" onClick={() => go(-1)} disabled={deckIndex === 0} aria-label="上一张">‹</button>
              <button type="button" className="is-next" onClick={() => go(1)} disabled={deckIndex === total - 1} aria-label="下一张">›</button>
              <span className="xhs-count">{deckIndex + 1} / {total}</span>
            </div>
          )}
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
        <ChromeBottom kind={platformKind} info={info}/>
      </div>
    );
  }

  // 销售朋友圈：卡内只放前 150 字，剩余全文点「展开全文」看，与导出一致
  if (platformKind === 'moment') {
    const { shown, full, expanded, length } = momentText(article);
    const shots = images.slice(0, 9);
    const gridClass = shots.length === 1 ? 'n1' : shots.length === 2 ? 'n2' : shots.length === 3 ? 'n3' : 'n4';
    const notes = [];
    if (shots.length) notes.push(`配图 ${shots.length} 张 · 取自知识库原图`);

    return (
      <div className={`pf pf-${platformKind}`} style={{'--pf-w': `${spec.width}px`}}>
        <ChromeStyle/>
        <ChromeTop kind={platformKind} info={info}/>
        <div className="moment-post">
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
          )}
          {shots.length > 0 && (
            <div className={`moment-grid ${gridClass}`}>
              {shots.map((image, i) => (
                <Hit key={i} edit={edit} block={{kind: 'image', imageIndex: i, text: publicationText(image.caption)}} as="span" className="moment-shot"><img src={image.url} alt={image.description || image.file} loading="lazy" /></Hit>
              ))}
            </div>
          )}
        </div>
        {notes.length > 0 && <p className="moment-note">{notes.join('；')}</p>}
        <ChromeBottom kind={platformKind} info={info}/>
      </div>
    );
  }

  // 其他平台：沿用长文/短文案版式，编辑态下每块都可点
  const blocks = buildArticleFlow(article);
  return (
    <div className={`pf pf-${platformKind}`} style={{'--pf-w': `${spec.width}px`}}>
      <ChromeStyle/>
      <ChromeTop kind={platformKind} info={info}/>
      <div className="pf-body">
    <article className={`generated-article layout-${platformKind}${spec.font === 'serif' ? ' font-serif' : ''}${edit ? ' is-editing' : ''}`} style={style}>
      <Hit edit={edit} block={{kind: 'title', text: inlinePlainText(article.title)}} as="h2">{inlinePlainText(article.title)}</Hit>
      {(article.title_options || []).length > 0 && (
        <details className="result-details">
          <summary>备选标题</summary>
          {(article.title_options || []).map((t, i) => <p key={i}>{inlinePlainText(t)}</p>)}
        </details>
      )}
      <Hit edit={edit} block={{kind: 'lead', text: inlinePlainText(article.lead)}} as="p" className="article-lead">{inlinePlainText(article.lead)}</Hit>
      <div className="article-flow">
        {blocks.map((block, i) => {
          if (block.type === 'para') {
            const text = inlinePlainText(block.text);
            const heading = parseHeading(text);
            const kind = heading ? 'heading' : 'para';
            const inner = heading || text;
            return (
              <Hit key={`p${i}`} edit={edit} block={{kind, text: inner}} as={heading ? 'h3' : 'p'} className={heading ? 'article-heading' : 'article-para'}>
                {inner}
              </Hit>
            );
          }
          const image = images[block.imageIndex];
          if (!image) return null;
          return (
            <figure key={`f${i}`} className={`article-figure fig-${spec.fig === 'none' ? 'center' : spec.fig}`}>
              <Hit edit={edit} block={{kind: 'image', imageIndex: block.imageIndex, text: publicationText(image.caption)}} as="span" className="article-shot">
                <img src={image.url} alt={image.description || image.file} loading="lazy" />
              </Hit>
              <figcaption>
                <Hit edit={edit} block={{kind: 'caption', imageIndex: block.imageIndex, text: publicationText(image.caption)}} as="span" className="article-caption">{publicationText(image.caption)}</Hit>
                <ImageEvidence image={image} job={job} generatedTime={generatedTime} />
              </figcaption>
            </figure>
          );
        })}
      </div>
      <Hit edit={edit} block={{kind: 'cta', text: inlinePlainText(article.cta)}} as="p" className="article-cta">{inlinePlainText(article.cta)}</Hit>
      <Hit edit={edit} block={{kind: 'tags', text: (article.tags || []).join(' ')}} as="div" className="article-tags">
        {(article.tags || []).map((tag, i) => <span key={i}>#{tag.replace(/^#/, '')}</span>)}
      </Hit>
    </article>
      </div>
      <ChromeBottom kind={platformKind} info={info}/>
    </div>
  );
}
