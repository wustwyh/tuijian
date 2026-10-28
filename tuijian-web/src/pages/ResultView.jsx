import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Copy,Download,ArrowLeft,ArrowUp,AlertCircle,RotateCcw,LayoutTemplate,Eye,ChevronDown,MoreHorizontal,CheckCircle2} from 'lucide-react';
import SourceText from './SourceText.jsx';
import GenerationProgress from './GenerationProgress.jsx';
import WritingPackage from './WritingPackage.jsx';
import ArticlePreview from './ArticlePreview.jsx';
import {articleText} from '../publication.js';
import './result.css';
import './result-slim.css';

const LABELS = {passed:'通过',pending:'待确认',rejected:'已拦截',conflict:'资料冲突'};
const CHECK_NAME = {fact:'产品事实',image:'图片型号',compliance:'合规',platform:'平台适配'};
const ROLE = {planner:'资料整理',writer:'创作',reviewer:'核验',system:'流程'};

// 折叠块：默认收起，标题右侧带一个数量
function Fold({id,title,count,open,children}){
  return <details id={id} className="rs-fold" open={open}>
    <summary><ChevronDown size={15} className="rs-fold-arrow"/><span>{title}</span>{count!=null&&<b>{count}</b>}</summary>
    <div className="rs-fold-body">{children}</div>
  </details>;
}

function TopBar({p}){
  const s = p.job?.summary;
  return <div className="rs-top">
    <Link className="rs-back" to="/create/topic"><ArrowLeft size={15}/>返回调整</Link>
    <div className="rs-top-main">
      <strong>{s ? s.product : '正在读取…'}</strong>
      <span className={'result-badge '+p.statusInfo.c}>{p.statusInfo.t}</span>
      {s && <span className="rs-chip"><em>平台</em>{s.platform}</span>}
      {s && <span className="rs-chip"><em>客户</em>{s.audience}</span>}
    </div>
    <div className="rs-top-actions">
      {p.complete&&!p.blocked&&<button type="button" className="rs-main-btn" onClick={p.openWorkbench}><LayoutTemplate size={15}/>打开工作台</button>}
      {p.complete&&!p.blocked&&!p.confirmed&&<button type="button" className="rs-confirm-btn" disabled={p.approvingArticle||p.workbenchOpen} onClick={p.approveArticle}>{p.approvingArticle?'确认中…':'确认定稿'}</button>}
      {(p.complete||p.failed)&&<details className="rs-more">
        <summary aria-label="更多操作"><MoreHorizontal size={16}/></summary>
        <div className="rs-more-menu">
          {p.complete&&<button type="button" disabled={p.blocked} onClick={p.copy}><Copy size={14}/>复制发布文案</button>}
          {p.complete&&<button type="button" onClick={p.download}><Download size={14}/>下载完整结果（.md）</button>}
          {p.complete&&<button type="button" disabled={p.blocked||p.exporting} onClick={p.exportHtml}><Eye size={14}/>导出图文 HTML</button>}
          {p.complete&&<button type="button" disabled={p.blocked||p.exporting} onClick={p.exportZip}><Download size={14}/>导出图文 ZIP</button>}
          <button type="button" onClick={p.reload}><RotateCcw size={14}/>重新读取</button>
        </div>
      </details>}
    </div>
  </div>;
}

function Hero({p}){
  const line = p.blocked
    ? '有未通过项，正文已暂时收起，进工作台可以逐段修。'
    : p.v.reviewed===false
      ? '文案已就绪，可直接使用。'
      : p.issueCount>0 ? '已完成对照，还有 ' + p.issueCount + ' 项要确认或修改。' : '已完成本轮资料对照，可以直接用。';
  return <section className="rs-card rs-hero">
    <div className="rs-hero-text">
      <span className={'result-badge '+(p.confirmed?'passed':p.v.reviewed===false?'passed':p.v.overall_status)}>
        {p.confirmed?'已确认':p.v.reviewed===false?'生成完成':LABELS[p.v.overall_status]}
      </span>
      <p>{line}</p>
    </div>
    <div className="rs-figures">
      <span><b>{p.result.basis.length}</b>条依据</span>
      <span><b>{p.result.article.image_plan.length}</b>张配图</span>
      <span><b>{p.stats.passed}</b>项通过</span>
      {p.issueCount>0&&<span className="is-warn"><b>{p.issueCount}</b>项待处理</span>}
    </div>
  </section>;
}

// 03 只放「结果本身」：标题、导语、结构、配图清单。平台的真实排版在工作台里看。
function ArticleCard({p}){
  const article = p.result.article;
  const body = String(article.body || '');
  const images = article.image_plan || [];
  const [zoom, setZoom] = useState(null);
  const heads = body.split(/\r?\n+/).map(t => t.trim()).filter(Boolean)
    .map(t => t.replace(/^#{1,6}\s+/, '')).filter((t, i, arr) => /^[一二三四五六七八九十\d]+[、.]/.test(t) || t.length <= 18);
  const chars = body.replace(/\s/g, '').length;
  return <section id="r-article" className="rs-card rs-article">
    <header className="rs-card-head">
      <h2>图文软文</h2>
      {!p.blocked&&<button type="button" className="rs-text-btn" onClick={p.openWorkbench}>在工作台里看发布效果<LayoutTemplate size={13}/></button>}
    </header>
    {p.blocked
      ? <p className="rs-note">正文已隐藏，避免误用。进工作台可以逐段修，改完会自动重新核验。</p>
      : <>
        <h3 className="rs-title">{article.title}</h3>
        {article.lead && <p className="rs-lead">{article.lead}</p>}
        <div className="rs-struct">
          <span>正文 <b>{chars}</b> 字</span>
          <span>配图 <b>{images.length}</b> 张</span>
          <span>话题 <b>{(article.tags || []).length}</b> 个</span>
          <span>分节 <b>{heads.length}</b> 段</span>
        </div>
        {heads.length > 0 && <ul className="rs-outline">
          {heads.slice(0, 6).map((t, i) => <li key={i}>{t}</li>)}
        </ul>}
        {images.length > 0 && <div className="rs-thumbs">
          {images.slice(0, 6).map((img, i) => <figure key={i}>
            <button type="button" className="rs-thumb" onClick={() => setZoom(img)} title="点开看这张图的详细信息">
              <img src={img.url} alt={img.description || img.file}/>
            </button>
            <figcaption>{img.position || '配图'}</figcaption>
          </figure>)}
        </div>}
        {zoom && <ImageDetail image={zoom} generatedTime={p.generatedTime} job={p.job} onClose={() => setZoom(null)}/>}
        {article.cta && <p className="rs-cta"><em>结尾</em>{article.cta}</p>}
        <button type="button" className="rs-article-cta" onClick={p.openWorkbench}>
          <LayoutTemplate size={15}/>打开工作台 · 预览发布效果并逐段改
        </button>
      </>}
  </section>;
}

// 点配图看这张图的详细信息：文件、用途、型号归属、ima 资料与导出时间、原图与来源页。
function ImageDetail({image, generatedTime, job, onClose}){
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const ima = image.ima || {};
  const rows = [
    ['文件', image.file],
    ['图注', image.caption],
    ['用在哪', [image.position, image.purpose].filter(Boolean).join(' · ')],
    ['型号', ima.productId || image.productId],
    ['归属依据', image.ownership],
    ['索引', (image.indexes || [])[0]],
    ['ima 资料', ima.entryId || ima.mediaId ? [ima.entryId, ima.mediaId].filter(Boolean).join(' · ') : '本地 ima 资料库（未记录条目编号）'],
    ['ima 导出时间', ima.fetchedAt || '本地 ima 资料库，无导出时间记录'],
    ['本次生成', generatedTime],
    ['任务', job?.id ? job.id.slice(0, 8) : ''],
  ].filter(([, v]) => v);
  return <div className="rs-img-mask" role="dialog" aria-modal="true" aria-label="配图详情" onClick={onClose}>
    <div className="rs-img-card" onClick={(e) => e.stopPropagation()}>
      <header className="rs-img-head">
        <strong>配图详情</strong>
        <button type="button" onClick={onClose} aria-label="关闭">✕</button>
      </header>
      <div className="rs-img-body">
        <img className="rs-img-big" src={image.url} alt={image.description || image.file}/>
        <div className="rs-img-rows">
          {rows.map(([k, v]) => <p key={k}><em>{k}</em><span>{String(v)}</span></p>)}
          <div className="rs-img-links">
            {image.sourceUrl && <a href={image.sourceUrl} target="_blank" rel="noreferrer">原图地址 ↗</a>}
            {image.pageUrl && <a href={image.pageUrl} target="_blank" rel="noreferrer">来源页 ↗</a>}
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function ReviewCard({p}){
  const imagePending = p.v.checks.some(ch=>ch.type==='image'&&ch.status==='pending');
  return <section id="r-review" className="rs-card rs-review">
    <header className="rs-card-head">
      <h2>核验</h2>
      <button type="button" className="rs-toggle" aria-expanded={p.openChecks} onClick={()=>p.setChecksOpen(!p.openChecks)}>
        {p.stats.passed} 通过{p.issueCount>0?' · '+p.issueCount+' 待处理':''}
        <ChevronDown size={15} className={p.openChecks?'is-open':''}/>
      </button>
    </header>
    {imagePending&&<div className="rs-confirm-row">
      <span>配图来自本地 ima 资料，与型号相符</span>
      <button type="button" className="btn-ghost rs-btn-sm" disabled={p.confirming} onClick={p.confirmImages}>{p.confirming?'保存中…':'确认配图'}</button>
    </div>}
    {p.openChecks&&<>
      {p.issueCount===0&&<p className="rs-ok"><CheckCircle2 size={15}/>全部检查项通过。</p>}
      <div className="verification-list">
        {p.v.checks.map((ch,i)=><div className="verification-row" key={i}>
          <span className={'result-badge '+ch.status}>{LABELS[ch.status]}</span>
          <div>
            <strong>{CHECK_NAME[ch.type]||'检查'}{ch.fact_id?' · '+ch.fact_id:''}</strong>
            <p>{ch.claim}</p>
            <small>{ch.reason}</small>
            {ch.action==='revise'&&<button type="button" className="fix-action" onClick={()=>p.fixThis(ch,i)}>按这条改</button>}
          </div>
        </div>)}
      </div>
      {p.v.pending_questions.length>0&&<div className="verification-questions">
        <h3>待确认（{p.v.pending_questions.length}）</h3>
        <ul>{p.v.pending_questions.map((q,i)=><li key={i}>{q}</li>)}</ul>
      </div>}
    </>}
  </section>;
}

function ConversationTurn({turn}){
  const label = ROLE[turn.role] || '流程';
  const round = turn.round===0 ? '初稿' : '第' + turn.round + '次修订';
  return <div className="rs-turn">
    <strong>{label} · {round}</strong>
    <p>{turn.message}</p>
    {turn.issues?.length>0&&<ul>{turn.issues.map((issue,j)=><li key={j}><b>{issue.claim}</b>：{issue.reason}</li>)}</ul>}
    {turn.article&&<details className="rs-sub"><summary>本轮正文</summary><SourceText text={articleText(turn.article)}/></details>}
  </div>;
}

function Process({p}){
  const {job,result,generatedTime} = p;
  return <section className="rs-process">
    <h2>过程材料</h2>
    <Fold id="r-scene" title="场景判断" count={result.scene.usage_scenarios.length+' 个场景'}>
      <div className="rs-kv"><span>目标客户</span><b>{result.scene.persona}{result.scene.inferred?'（推断）':''}</b></div>
      <div className="rs-kv"><span>使用场景</span><b>{result.scene.usage_scenarios.join('、')}</b></div>
      <div className="rs-kv"><span>主要问题</span><b>{result.scene.main_problem}</b></div>
      <p className="rs-note">{result.scene.core_conflict}</p>
      {result.scene.questions.length>0&&<div className="rs-list"><h3>待确认</h3><ul>{result.scene.questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}
    </Fold>

    <Fold id="r-basis" title="知识库依据" count={result.basis.length+' 条'}>
      <div className="fact-list">
        {result.basis.map(f=><details key={f.fact_id} className="result-details">
          <summary><span className="fact-id">{f.fact_id}</span>{f.group} · {f.source_title}</summary>
          <p className="document-source">{f.model_name} · {f.version} · 资料日期：{f.recorded_date}</p>
          <p className="document-source">{f.source}</p>
          <SourceText text={f.original_snippet}/>
          {f.urls.map((url,i)=><a className="fact-link" key={i} href={url} target="_blank" rel="noreferrer">原始来源 {i+1} ↗</a>)}
        </details>)}
      </div>
    </Fold>

    {result.writingPackage&&<Fold id="r-package" title="写作任务包">
      <WritingPackage plan={result.writingPackage} selection={result.selection} generatedTime={generatedTime}/>
    </Fold>}

    {result.conversation?.length>0&&<Fold id="r-conversation" title="审核与修订" count={result.conversation.length+' 轮'}>
      {result.conversation.map((turn,i)=><ConversationTurn key={i} turn={turn}/>)}
    </Fold>}

    {job.input.materials.length>0&&<Fold id="r-materials" title="使用素材" count={job.input.materials.length+' 份'}>
      {job.input.materials.map(m=><details key={m.material.id} className="rs-sub">
        <summary>{m.material.category} · {m.material.name}</summary>
        <p className="rs-note">{m.material.source}</p>
        <SourceText text={m.content}/>
      </details>)}
    </Fold>}

    {result.trace&&<Fold id="r-trace" title="模型调用记录" count={result.trace.length+' 次'}>
      {result.trace.map((call,i)=><details key={i} className="rs-sub">
        <summary>{i+1}. {call.name} · {call.model}</summary>
        <p className="rs-note">输入 {call.inputCharacters ?? '—'} 字符 · 输出 {call.outputCharacters ?? '—'} 字符 · 用时 {call.durationMs!=null ? (call.durationMs/1000).toFixed(1)+' 秒' : '—'}</p>
        {call.messages.map((m,j)=><div key={j}><h4>{m.role}</h4><pre>{m.content}</pre></div>)}
        <h4>原始输出</h4>
        <pre>{call.rawOutput||call.invalidOutput||'该次调用未保存原始输出'}</pre>
      </details>)}
    </Fold>}
  </section>;
}

function Failure({p}){
  return <section id="r-failure" className="rs-card rs-fail">
    <div className="rs-fail-head"><AlertCircle size={20}/><div><h2>本次创作未完成</h2><p>停在「{p.failureStage}」 · 记录已保留</p></div></div>
    <p className="rs-fail-reason"><strong>{p.failure.title}</strong> {p.failure.hint}</p>
    {p.retryError&&<p className="generation-retry-error" role="alert">{p.retryError}</p>}
    <div className="rs-fail-actions">
      <button className="btn-primary" onClick={p.retry} disabled={p.retrying}><RotateCcw size={15}/>{p.retrying?'正在重新生成…':'重试生成'}</button>
      <Link className="btn-ghost" to="/create/topic">返回调整</Link>
    </div>
    <Fold title="失败诊断" count={p.result?.trace?.length ? p.result.trace.length+' 次调用' : null}>
      <p className="rs-note">失败阶段：{p.result?.failure?.stage||'准备资料'}｜原因：{p.job.error}</p>
      {p.result?.trace?.map((call,i)=><details className="rs-sub" key={i}>
        <summary>{call.name} · 第 {call.attempt} 次{call.formatError?' · 未通过校验':''}</summary>
        <p className="rs-note">{call.formatError||'未记录校验错误'}</p>
        <pre>{call.rawOutput||call.invalidOutput||'该次调用未保存原始输出'}</pre>
      </details>)}
    </Fold>
  </section>;
}

const TOC = [
  {id: 'r-scene', no: '01', label: '场景判断'},
  {id: 'r-basis', no: '02', label: '知识库依据'},
  {id: 'r-article', no: '03', label: '图文软文'},
  {id: 'r-review', no: '04', label: '核验结果'},
];

// 右侧导航：点一下先展开对应的折叠块，再滚过去。
function Rail({p}){
  const [active, setActive] = useState('');
  useEffect(() => {
    const onScroll = () => {
      let current = '';
      for (const item of TOC) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 180) current = item.id;
      }
      setActive(current);
    };
    onScroll();
    document.addEventListener('scroll', onScroll, {capture: true, passive: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => { document.removeEventListener('scroll', onScroll, {capture: true}); window.removeEventListener('scroll', onScroll); };
  }, []);
  const jump = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const fold = el.closest('details');
    if (fold) fold.open = true;
    else if (el.tagName === 'DETAILS') el.open = true;
    el.scrollIntoView({behavior: 'smooth', block: 'start'});
  };
  return <nav className="rs-rail" aria-label="本页导航">
    <div className="rs-rail-title">本页</div>
    <ul>{TOC.map(item => <li key={item.id}>
      <button type="button" className={active === item.id ? 'is-on' : ''} onClick={() => jump(item.id)}>
        <span>{item.no}</span>{item.label}
      </button>
    </li>)}</ul>
    <button type="button" className="rs-rail-top" onClick={backTop}>
      <ArrowUp size={14}/>回到最上面
    </button>
  </nav>;
}

// 页面可能在 window 里滚，也可能在内部容器里滚：两种情况都算上。
const scrollOffset = () => {
  const values = [window.scrollY || 0, document.scrollingElement?.scrollTop || 0];
  for (const el of document.querySelectorAll('main, .main-scroll, .app-main')) values.push(el.scrollTop || 0);
  return Math.max(...values);
};

const backTop = () => {
  for (const el of document.querySelectorAll('main, .main-scroll, .app-main')) el.scrollTo({top: 0, behavior: 'smooth'});
  window.scrollTo({top: 0, behavior: 'smooth'});
};

// 滚过一段后出现的回到顶部按钮
function BackTop(){
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(scrollOffset() > 200);
    onScroll();
    document.addEventListener('scroll', onScroll, {capture: true, passive: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => { document.removeEventListener('scroll', onScroll, {capture: true}); window.removeEventListener('scroll', onScroll); };
  }, []);
  if (!show) return null;
  return <button type="button" className="rs-backtop" onClick={backTop} aria-label="回到最上面">
    <ArrowUp size={16}/>
  </button>;
}

export default function ResultView({p}){
  const {job,pending,failed,complete} = p;
  return <div className="result-page rs">
    <TopBar p={p}/>
    {job&&<p className="rs-meta">{job.summary.task}{job.summary.format?' · '+job.summary.format:''} · 素材 {job.summary.materialCount} 份 · {new Date(job.createdAt).toLocaleString('zh-CN',{hour12:false})}</p>}
    {p.error&&<div className="result-error" role="alert">{p.error}<button className="btn-ghost" onClick={p.reload}>重新读取</button></div>}
    {p.notice&&<p role="status" className="product-notice rs-notice">{p.notice}</p>}

    <div className="rs-layout">
      <div className="rs-main">
        {pending&&<div id="r-progress">
          <GenerationProgress status={job.status} error={job.error} connectionError={p.error} verification={p.v} confirmed={p.confirmed} progress={p.result?.progress}/>
        </div>}

        {failed&&<Failure p={p}/>}
        {failed&&p.result?.writingPackage&&<Fold id="r-package" title="写作任务包">
          <WritingPackage plan={p.result.writingPackage} selection={p.result.selection} generatedTime={p.generatedTime}/>
        </Fold>}

        {pending&&<section className="result-wait"><span className="result-spinner"/><div>
          <h2>{({planning:'正在整理资料',generating:'正在创作正文',reviewing:'正在核验成稿',revising:'正在按反馈修订'})[job.status]}</h2>
          <p>完成后会自动打开工作台。</p>
        </div></section>}

        {complete&&<>
          <Hero p={p}/>
          <ArticleCard p={p}/>
          <ReviewCard p={p}/>
          <Process p={p}/>
        </>}
      </div>
      {complete&&<Rail p={p}/>}
    </div>
    {complete&&<BackTop/>}
  </div>;
}
