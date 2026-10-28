import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {Copy,Download,ArrowLeft,AlertCircle,RotateCcw,MessageSquare,LayoutTemplate,Eye,ChevronDown,MoreHorizontal,CheckCircle2} from 'lucide-react';
import SourceText from './SourceText.jsx';
import GenerationProgress from './GenerationProgress.jsx';
import WritingPackage from './WritingPackage.jsx';
import ArticleWorkbench from './ArticleWorkbench.jsx';
import ArticlePreview from './ArticlePreview.jsx';

import {resultText} from '../resultText.js';
import {articleText} from '../publication.js';
import {generationError} from '../generationError.js';
import {downloadPublishHtml,downloadPublishZip} from '../export.js';
import {platformSpec} from '../platform-layout.js';
import {layoutKindOf} from '../publish-html.js';
import './platform-layout.css';
import './result.css';
import './result-slim.css';
const labels={passed:'通过',pending:'待确认',rejected:'已拦截',conflict:'资料冲突'};

// 折叠块：默认收起，标题后面带数量，点一下才展开
function Fold({id,title,count,open:initialOpen=false,children}){
  return <details id={id} className="rs-fold" open={initialOpen}>
    <summary><ChevronDown size={15} className="rs-fold-arrow"/><span>{title}</span>{count!=null&&<b>{count}</b>}</summary>
    <div className="rs-fold-body">{children}</div>
  </details>;
}

const ROLE_LABEL = {planner:'资料整理',writer:'创作',reviewer:'核验',system:'流程'};

// 一轮审核/修订的对话记录
function ConversationTurn({turn}){
  const label = ROLE_LABEL[turn.role] || '流程';
  const round = turn.round === 0 ? '初稿' : '第' + turn.round + '次修订';
  return <div className="rs-turn">
    <strong>{label} · {round}</strong>
    <p>{turn.message}</p>
    {turn.issues?.length>0&&<ul>{turn.issues.map((issue,j)=><li key={j}><b>{issue.claim}</b>：{issue.reason}</li>)}</ul>}
    {turn.article&&<details className="rs-sub"><summary>本轮正文</summary><SourceText text={articleText(turn.article)}/></details>}































  async function retry(){if(retryLock.current)return;retryLock.current=true;setRetrying(true);setRetryError('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/retry`,{method:'POST'});let data;try{data=await response.json();}catch{throw new Error('服务器返回异常，请稍后重试');}if(!response.ok)throw new Error(data.error||'重试未能开始');if(typeof data.id!=='string')throw new Error('服务器未返回任务编号，请重新读取');navigate(`/result/${data.id}`);}catch(e){setRetryError(e instanceof TypeError?'网络连接失败，请检查网络后重试':e.message);}finally{retryLock.current=false;setRetrying(false);}}
  async function copy(){try{await navigator.clipboard.writeText(articleText(result.article));setNotice('发布文案已复制');}catch{setNotice('复制不可用，请下载保存');}}
  function download(){const url=URL.createObjectURL(new Blob([resultText(job)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${job.summary.product}-${id.slice(0,8)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function exportHtml(){if(exporting)return;setExporting(true);setNotice('');try{await downloadPublishHtml(job);setNotice('图文 HTML 已下载');}catch(e){setNotice(e.message||'导出失败');}finally{setExporting(false);}}
  async function exportZip(){if(exporting)return;setExporting(true);setNotice('');try{await downloadPublishZip(job);setNotice('图文 ZIP 已下载');}catch(e){setNotice(e.message||'导出失败');}finally{setExporting(false);}}
  async function confirmImages(){if(confirming)return;setConfirming(true);setNotice('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/confirm-images`,{method:'POST'});const data=await response.json();if(!response.ok)throw new Error(data.error||'确认失败');setJob(data);setNotice(data.result.verification.overall_status==='passed'?'图片来源已确认，本条记录核验通过。':'图片来源已确认。');}catch(e){setNotice(e.message||'确认失败，请重试');}finally{setConfirming(false);}}
  async function approveArticle(){if(approvingArticle)return;setApprovingArticle(true);setNotice('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:result.editorial?.revision||0})});const data=await response.json();if(!response.ok)throw new Error(data.error||'审核未完成');setJob(data);setNotice('已确认定稿。');}catch(e){setNotice(e.message||'审核失败，请重试');}finally{setApprovingArticle(false);}}

  return <div className="result-page rs">
    <div className="rs-top">
      <Link className="rs-back" to="/create/topic"><ArrowLeft size={15}/>返回调整</Link>
      <div className="rs-top-main">
        <strong>{job?job.summary.product:'正在读取…'}</strong>
        <span className={`result-badge ${statusInfo.c}`}>{statusInfo.t}</span>
      </div>
      <div className="rs-top-actions">
        {complete&&!blocked&&<button type="button" className="btn-primary rs-main-btn" onClick={()=>{setFixRequest(null);setWorkbenchOpen(true);}}><LayoutTemplate size={15}/>打开工作台</button>}
        {complete&&!confirmed&&!blocked&&<button type="button" className="btn-ghost rs-confirm-btn" disabled={approvingArticle||workbenchOpen} onClick={approveArticle}>{approvingArticle?'确认中…':'确认定稿'}</button>}
        <details className="rs-more">
          <summary aria-label="更多操作"><MoreHorizontal size={16}/></summary>
          <div className="rs-more-menu">
            {complete&&<button type="button" disabled={blocked} onClick={copy}><Copy size={14}/>复制发布文案</button>}
            {complete&&<button type="button" onClick={download}><Download size={14}/>下载完整结果（.md）</button>}
            {complete&&<button type="button" disabled={blocked||exporting} onClick={exportHtml}><Eye size={14}/>导出图文 HTML</button>}
            {complete&&<button type="button" disabled={blocked||exporting} onClick={exportZip}><Download size={14}/>导出图文 ZIP</button>}
            <button type="button" onClick={()=>setReload(n=>n+1)}><RotateCcw size={14}/>重新读取</button>
          </div>
        </details>
      </div>
    </div>

    {job&&<p className="rs-meta">{job.summary.platform} · {job.summary.audience} · {job.summary.task}{job.summary.format?` · ${job.summary.format}`:''} · 素材 {job.summary.materialCount} 份</p>}
    {error&&<div className="result-error" role="alert">{error}<button className="btn-ghost" onClick={()=>setReload(n=>n+1)}>重新读取</button></div>}
    {notice&&<p role="status" className="product-notice rs-notice">{notice}</p>}

    {pending&&<div id="r-progress"><GenerationProgress key={id} status={job.status} error={job.error} connectionError={error} verification={v} confirmed={confirmed} progress={result?.progress}/></div>}

    {failed&&<section id="r-failure" className="rs-card rs-fail">
      <div className="rs-fail-head"><AlertCircle size={20}/><div><h2>本次创作未完成</h2><p>停在「{failureStage}」 · 记录已保留</p></div></div>
      <p className="rs-fail-reason"><strong>{failure.title}</strong> {failure.hint}</p>
      {retryError&&<p className="generation-retry-error" role="alert">{retryError}</p>}
      <div className="rs-fail-actions">
        <button className="btn-primary" onClick={retry} disabled={retrying}><RotateCcw size={15}/>{retrying?'正在重新生成…':'重试生成'}</button>
        <Link className="btn-ghost" to="/create/topic">返回调整</Link>
      </div>
      <Fold title="失败诊断" count={result?.trace?.length?`${result.trace.length} 次调用`:null}>
        <p className="rs-note">失败阶段：{result?.failure?.stage||'准备资料'}｜原因：{job.error}</p>
        {result?.trace?.map((call,i)=><details className="rs-sub" key={i}><summary>{call.name} · 第 {call.attempt} 次{call.formatError?' · 未通过校验':''}</summary><p className="rs-note">{call.formatError||'未记录校验错误'}</p><pre>{call.rawOutput||call.invalidOutput||'该次调用未保存原始输出'}</pre></details>)}
      </Fold>
    </section>}

    {failed&&result?.writingPackage&&<Fold id="r-package" title="写作任务包"><WritingPackage plan={result.writingPackage} selection={result.selection} generatedTime={generatedTime}/></Fold>}

    {pending&&<section className="result-wait"><span className="result-spinner"/><div><h2>{({planning:'正在整理资料',generating:'正在创作正文',reviewing:'正在核验成稿',revising:'正在按反馈修订'})[job.status]}</h2><p>完成后会自动打开工作台。</p></div></section>}

    {complete&&<>
      <section className="rs-card rs-hero">
        <div className="rs-hero-text">
          <span className={`result-badge ${confirmed?'passed':v.reviewed===false?'passed':v.overall_status}`}>{confirmed?'已确认':v.reviewed===false?'生成完成':labels[v.overall_status]}</span>
          <p>{blocked?'有未通过项，正文已暂时收起，进工作台可以逐段修。':v.reviewed===false?'文案已就绪，可直接使用。':issueCount>0?`已完成对照，还有 ${issueCount} 项要确认或修改。`:'已完成本轮资料对照，可以直接用。'}</p>
        </div>
        <div className="rs-figures">
          <span><b>{result.basis.length}</b>条依据</span>
          <span><b>{result.article.image_plan.length}</b>张配图</span>
          <span><b>{stats.passed}</b>项通过</span>
          {issueCount>0&&<span className="is-warn"><b>{issueCount}</b>项待处理</span>}
        </div>
      </section>

      <section id="r-article" className="rs-card rs-article">
        <header className="rs-card-head">
          <h2>正文</h2>
          {!blocked&&<button type="button" className="btn-ghost rs-btn-sm" onClick={()=>{setFixRequest(null);setWorkbenchOpen(true);}}><LayoutTemplate size={14}/>工作台预览与改稿</button>}
        </header>
        {blocked
          ? <p className="rs-note">正文已隐藏，避免误用。进工作台可以逐段修，改完会自动重新核验。</p>
          : <ArticlePreview job={job} result={result} platformKind={platformKind} generatedTime={generatedTime}/>}
      </section>

      <section id="r-review" className="rs-card rs-review">
        <header className="rs-card-head">
          <h2>核验</h2>
          <button type="button" className="rs-toggle" aria-expanded={openChecks} onClick={()=>setChecksOpen(!openChecks)}>
            {stats.passed} 通过{issueCount>0?` · ${issueCount} 待处理`:''}<ChevronDown size={15} className={openChecks?'is-open':''}/>
          </button>
        </header>
        {v.checks.some(ch=>ch.type==='image'&&ch.status==='pending')&&<div className="rs-confirm-row"><span>配图来自本地 ima 资料，与型号相符</span><button type="button" className="btn-ghost rs-btn-sm" disabled={confirming} onClick={confirmImages}>{confirming?'保存中…':'确认配图'}</button></div>}
        {openChecks&&<>
          {issueCount===0&&<p className="rs-ok"><CheckCircle2 size={15}/>全部检查项通过。</p>}
          <div className="verification-list">{v.checks.map((ch,i)=><div className="verification-row" key={i}><span className={`result-badge ${ch.status}`}>{labels[ch.status]}</span><div><strong>{({fact:'产品事实',image:'图片型号',compliance:'合规',platform:'平台适配'})[ch.type]}{ch.fact_id?` · ${ch.fact_id}`:''}</strong><p>{ch.claim}</p><small>{ch.reason}</small>{ch.action==='revise'&&<button type="button" className="fix-action" onClick={()=>{setFixRequest({key:`${i}-${String(ch.claim).slice(0,8)}`,claim:ch.claim,reason:ch.reason});setWorkbenchOpen(true);}}>按这条改</button>}</div></div>)}</div>
          {v.pending_questions.length>0&&<div className="verification-questions"><h3>待确认（{v.pending_questions.length}）</h3><ul>{v.pending_questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}
        </>}
      </section>

      <section className="rs-process">
        <h2>过程材料</h2>
        <Fold id="r-scene" title="场景判断" count={result.scene.usage_scenarios.length+' 个场景'}>
          <div className="rs-kv"><span>目标客户</span><b>{result.scene.persona}{result.scene.inferred?'（推断）':''}</b></div>
          <div className="rs-kv"><span>使用场景</span><b>{result.scene.usage_scenarios.join('、')}</b></div>
          <div className="rs-kv"><span>主要问题</span><b>{result.scene.main_problem}</b></div>
          <p className="rs-note">{result.scene.core_conflict}</p>
          {result.scene.questions.length>0&&<div className="rs-list"><h3>待确认</h3><ul>{result.scene.questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}
        </Fold>

        <Fold id="r-basis" title="知识库依据" count={`${result.basis.length} 条`}>
          <div className="fact-list">{result.basis.map(f=><details key={f.fact_id} className="result-details"><summary><span className="fact-id">{f.fact_id}</span>{f.group} · {f.source_title}</summary><p className="document-source">{f.model_name} · {f.version} · 资料日期：{f.recorded_date}</p><p className="document-source">{f.source}</p><SourceText text={f.original_snippet}/>{f.urls.map((url,i)=><a className="fact-link" key={i} href={url} target="_blank" rel="noreferrer">原始来源 {i+1} ↗</a>)}</details>)}</div>
        </Fold>

        {result.writingPackage&&<Fold id="r-package" title="写作任务包"><WritingPackage plan={result.writingPackage} selection={result.selection} generatedTime={generatedTime}/></Fold>}

        {result.conversation?.length>0&&<Fold id="r-conversation" title="审核与修订" count={result.conversation.length + ' 轮'}>
          {result.conversation.map((turn,i)=><ConversationTurn key={i} turn={turn}/>)}
        </Fold>

        {job.input.materials.length>0&&<Fold id="r-materials" title="使用素材" count={`${job.input.materials.length} 份`}>
          {job.input.materials.map(m=><details key={m.material.id} className="rs-sub"><summary>{m.material.category} · {m.material.name}</summary><p className="rs-note">{m.material.source}</p><SourceText text={m.content}/></details>)}
        </Fold>}

        {result.trace&&<Fold id="r-trace" title="模型调用记录" count={`${result.trace.length} 次`}>
          {result.trace.map((call,i)=><details key={i} className="rs-sub"><summary>{i+1}. {call.name} · {call.model}</summary><p className="rs-note">输入 {call.inputCharacters??'—'} 字符 · 输出 {call.outputCharacters??'—'} 字符 · 用时 {call.durationMs!=null?(call.durationMs/1000).toFixed(1)+'秒':'—'}</p>{call.messages.map((m,j)=><div key={j}><h4>{m.role}</h4><pre>{m.content}</pre></div>)}<h4>原始输出</h4><pre>{call.rawOutput||call.invalidOutput||'该次调用未保存原始输出'}</pre></details>)}
        </Fold>}
      </section>
    </>}
    {workbenchOpen&&job?.result?.article&&<ArticleWorkbench job={job} platformKind={platformKind} generatedTime={generatedTime} suggestion={fixRequest} onClose={()=>{setWorkbenchOpen(false);setFixRequest(null);}} onSaved={data=>{setFixRequest(null);setJob(data);const ver=data.result?.verification;const label=ver?({passed:'核验通过',pending:'仍有待确认事项',rejected:'有未通过项',conflict:'资料冲突'})[ver.overall_status]||ver.overall_status:'未核验';setNotice('已保存并重新核验：'+label+'。');}}/>}
  </div>;
}
