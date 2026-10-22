import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {Copy,Download,ArrowLeft,AlertCircle,RotateCcw,MessageSquare,Eye} from 'lucide-react';
import SourceText from './SourceText.jsx';
import GenerationProgress from './GenerationProgress.jsx';
import WritingPackage from './WritingPackage.jsx';
import Section from './Section.jsx';
import ArticleEditor from './ArticleEditor.jsx';
import ArticlePreview from './ArticlePreview.jsx';
import PublishPreview from './PublishPreview.jsx';
import {resultText} from '../resultText.js';
import {publicationText,articleText} from '../publication.js';
import {generationError} from '../generationError.js';
import {downloadPublishHtml,downloadPublishZip} from '../export.js';
import {platformSpec} from '../platform-layout.js';
import {layoutKindOf} from '../publish-html.js';
import './platform-layout.css';
import './result.css';
const labels={passed:'通过',pending:'待确认',rejected:'已拦截',conflict:'资料冲突'};
export default function Result(){
  const {id}=useParams(),[job,setJob]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0),[notice,setNotice]=useState('');
  const navigate=useNavigate(),retryLock=useRef(false),[retrying,setRetrying]=useState(false),[retryError,setRetryError]=useState(''),[exporting,setExporting]=useState(false),[active,setActive]=useState('');
  const navigationTarget=useRef(null),[confirming,setConfirming]=useState(false),[editingArticle,setEditingArticle]=useState(false),[approvingArticle,setApprovingArticle]=useState(false),[previewOpen,setPreviewOpen]=useState(false);
  useEffect(()=>{setRetryError('');setNotice('');},[id]);
  useEffect(()=>{if(id==='demo')return;const controller=new AbortController();let timer;setJob(null);setError('');
    async function load(){try{const r=await fetch(`/api/generations/${encodeURIComponent(id)}`,{cache:'no-store',signal:controller.signal});let data;try{data=await r.json();}catch{throw new Error('服务器返回异常，请重新读取任务');}if(!r.ok)throw Object.assign(new Error(data.error||'读取结果失败'),{retryable:r.status>=500});setJob(data);setError('');if(['planning','generating','reviewing','revising'].includes(data.status))timer=setTimeout(load,2000);}catch(e){if(e.name!=='AbortError'){setError(e instanceof TypeError?'网络连接失败，请检查网络后重新读取':e.message);if(e.retryable!==false)timer=setTimeout(load,3000);}}}
    load();return()=>{controller.abort();clearTimeout(timer);};
  },[id,reload]);
  const pending=job&&['planning','generating','reviewing','revising'].includes(job.status),result=job?.result,complete=job?.status==='succeeded',v=complete?result.verification:null;
  const blocked=v&&['rejected','conflict'].includes(v.overall_status);
  const generatedAt=result?.completedAt||job?.createdAt;
  const generatedTime=generatedAt?new Date(generatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未记录';
  // 结果页预览按平台版式呈现，与导出的 HTML 保持一致。
  const platformKind=layoutKindOf(platformSpec(job?.summary?.platformId||job?.summary?.platform));
  const failure=generationError(job?.error,job?.result?.failure?.code);
  const failed=job?.status==='failed';
  const failureStage=({selecting:'筛选资料',planning:'整理写作任务包',writing:'创作正文',generating:'创作正文',reviewing:'核验正文与配图',revising:'定向修订'})[result?.progress?.stage]||result?.failure?.stage||'准备资料';
  const toc=[];
  if(job&&!failed)toc.push({id:'r-progress',label:'生成进度'});
  if(failed)toc.push({id:'r-failure',label:'失败诊断'});
  if(result?.writingPackage)toc.push({id:'r-package',label:'写作任务包'});
  if(result?.conversation?.length>0)toc.push({id:'r-conversation',label:'审核与修订'});
  if(complete){
    toc.push({id:'r-scene',label:'场景判断',no:'01'},{id:'r-basis',label:'知识库依据',no:'02'},{id:'r-article',label:'图文软文',no:'03'},{id:'r-review',label:'核验结果',no:'04'});
    if(job.input?.materials?.length)toc.push({id:'r-materials',label:'使用素材'});
    if(result.trace)toc.push({id:'r-trace',label:'模型调用记录'});
  }
  const tocKey=toc.map(t=>t.id).join(',');
  useEffect(()=>{if(!tocKey)return;let settle;const onScroll=()=>{if(navigationTarget.current){clearTimeout(settle);settle=setTimeout(()=>{navigationTarget.current=null;},180);return;}const anchor=(document.querySelector('.result-sticky')?.getBoundingClientRect().bottom||150)+24;let current=toc[0]?.id;for(const t of toc){const el=document.getElementById(t.id);if(el&&el.getBoundingClientRect().top<=anchor)current=t.id;}if(window.scrollY>0&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4)current=toc.at(-1)?.id;setActive(current);};const cancel=()=>{navigationTarget.current=null;};window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('wheel',cancel,{passive:true});window.addEventListener('touchstart',cancel,{passive:true});window.addEventListener('keydown',cancel);onScroll();return()=>{clearTimeout(settle);window.removeEventListener('scroll',onScroll);window.removeEventListener('wheel',cancel);window.removeEventListener('touchstart',cancel);window.removeEventListener('keydown',cancel);};},[tocKey]);
  const confirmed=complete&&result.editorial?.status==='approved';
  const statusInfo=confirmed?{t:'已确认',c:'passed'}:failed?{t:'生成失败',c:'failed'}:complete?(blocked?{t:'已拦截',c:'blocked'}:v.reviewed===false?{t:'生成完成',c:'done'}:v.overall_status==='pending'?{t:'待确认',c:'pending'}:v.overall_status==='passed'?{t:'核验通过',c:'passed'}:{t:'生成完成',c:'done'}):job?{t:'生成中',c:'running'}:{t:'读取中',c:'running'};
  if(id==='demo')return <><div className="page-head"><h1>开始真实创作</h1><p>演示结果已替换为真实生成，请重新选择卡片发起任务。</p></div><Link className="btn-primary" to="/create/product">前往营销图文</Link></>;
  async function retry(){if(retryLock.current)return;retryLock.current=true;setRetrying(true);setRetryError('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/retry`,{method:'POST'});let data;try{data=await response.json();}catch{throw new Error('服务器返回异常，请稍后重试');}if(!response.ok)throw new Error(data.error||'重试未能开始');if(typeof data.id!=='string')throw new Error('服务器未返回任务编号，请重新读取');navigate(`/result/${data.id}`);}catch(e){setRetryError(e instanceof TypeError?'网络连接失败，请检查网络后重试':e.message);}finally{retryLock.current=false;setRetrying(false);}}
  async function copy(){try{await navigator.clipboard.writeText(articleText(result.article));setNotice('发布文案已复制，不含内部引用编号');}catch{setNotice('复制不可用，请使用下载保存');}}
  function download(){const url=URL.createObjectURL(new Blob([resultText(job)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${job.summary.product}-${id.slice(0,8)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function exportHtml(){if(exporting)return;setExporting(true);setNotice('');try{await downloadPublishHtml(job);setNotice('图文 HTML 已生成，可打开后复制文字、另存图片');}catch(e){setNotice(e.message||'图文导出失败');}finally{setExporting(false);}}
  async function exportZip(){if(exporting)return;setExporting(true);setNotice('');try{await downloadPublishZip(job);setNotice('图文 ZIP 已生成，含发布文案与按顺序命名的原图');}catch(e){setNotice(e.message||'图文导出失败');}finally{setExporting(false);}}
  function jump(id){const el=document.getElementById(id);if(el){navigationTarget.current=id;setActive(id);el.scrollIntoView({behavior:'smooth',block:'start'});}}
  async function confirmImages(){if(confirming)return;setConfirming(true);setNotice('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/confirm-images`,{method:'POST'});const data=await response.json();if(!response.ok)throw new Error(data.error||'确认失败');setJob(data);setNotice(data.result.verification.overall_status==='passed'?'图片确认已保存，本条记录核验通过。':'图片确认已保存，其他待确认事项请继续检查核验结果。');}catch(e){setNotice(e.message||'确认失败，请重试');}finally{setConfirming(false);}}
  async function approveArticle(){if(approvingArticle)return;setApprovingArticle(true);setNotice('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:result.editorial?.revision||0})});const data=await response.json();if(!response.ok)throw new Error(data.error||'审核未完成');setJob(data);setNotice('人工审核已完成，定稿状态已保存。');}catch(e){setNotice(e.message||'审核失败，请重试');}finally{setApprovingArticle(false);}}
  return <div className="result-page">
    <div className="result-layout">
      <div className="result-main">
        <div className="result-sticky"><div className="result-sticky-inner">
      <div className="result-sticky-main">
        <span className="result-sticky-title">{job?job.summary.product:'正在读取生成任务…'}</span>
        {job&&<>
          <span className="result-sticky-sep"/>
          <span className="result-sticky-chip">客户 <b>{job.summary.audience}</b></span>
          <span className="result-sticky-chip">平台 <b>{job.summary.platform}</b></span>
          <span className="result-sticky-chip">任务 <b>{job.summary.task} · {job.summary.format}</b></span>
          <span className="result-sticky-chip">素材 <b>{job.summary.materialCount}</b> 份</span>
        </>}
      </div>
      <div className="result-sticky-right">
        <span className={`result-sticky-status ${statusInfo.c}`}>{statusInfo.t}</span>
        {!failed&&<Link className="btn-ghost" to="/create/topic"><ArrowLeft size={14}/>返回调整</Link>}
      </div>
    </div></div>
        {job&&<p className="result-meta-line">{new Date(job.createdAt).toLocaleString('zh-CN')} · 任务编号 {id.slice(0,8)}</p>}
        {error&&<div className="result-error" role="alert">{error}<button className="btn-ghost" onClick={()=>setReload(n=>n+1)}>重新读取</button></div>}
        <div id="r-progress">{job&&!failed&&<GenerationProgress key={id} status={job.status} error={job.error} connectionError={error} verification={v} confirmed={confirmed} progress={result?.progress}/>}</div>
        {failed&&<section id="r-failure" className="generation-failure" aria-labelledby="generation-failure-title">
          <div className="generation-failure-heading"><span className="generation-failure-icon"><AlertCircle size={28}/></span><div><h2 id="generation-failure-title">本次创作未完成</h2><p>{failureStage?`停在「${failureStage}」阶段`:'生成过程中出现问题'} · 原记录已保留</p></div></div>
          <div className="generation-failure-reason" role="alert"><h3>{failure.title}</h3><p>{failure.hint}</p></div>
          <div className="generation-failure-footer"><div className="result-actions"><button className="btn-primary" onClick={retry} disabled={retrying}><RotateCcw size={16}/>{retrying?'正在重新生成…':'重试生成'}</button><Link className="btn-ghost" to="/create/topic"><ArrowLeft size={16}/>返回调整</Link></div><p>重试将按原选择重新生成；已完成内容可在下方查看。</p></div>
          {retryError&&<p className="generation-retry-error" role="alert">{retryError}</p>}
          <details className="generation-failure-details"><summary>查看失败诊断 · {result?.trace?.length||0} 次模型调用</summary><p className="generation-diagnostic-summary">失败阶段：{result?.failure?.stage||'准备资料'}<br/>失败原因：{job.error}</p>{result?.trace?.map((call,i)=><details className="generation-diagnostic-call" key={`${call.name}-${call.attempt}-${i}`}><summary>{call.name} · 第 {call.attempt} 次调用{call.formatError?' · 输出未通过校验':''}</summary><p><strong>校验/解析结果：</strong>{call.formatError||'本次输出未记录校验错误'}</p><p><strong>原始模型输出</strong></p><pre>{call.rawOutput||call.invalidOutput||'该次调用未保存原始输出（例如请求未收到模型响应）。'}</pre></details>)}<small>任务编号：{id}</small></details>
        </section>}
        <div id="r-package"><WritingPackage plan={result?.writingPackage} selection={result?.selection} generatedTime={generatedTime}/></div>
        {result?.conversation?.length>0&&<Section id="r-conversation" icon={<MessageSquare size={15}/>} title="审核与修订对话">{result.conversation.map((turn,i)=><div className="result-details" key={i}><strong>{({planner:'资料整理模型',writer:'创作模型',reviewer:'核验模型',system:'流程'})[turn.role]} · {turn.round===0?'初稿':`第${turn.round}次修订`}</strong><p>{turn.message}</p>{turn.issues?.length>0&&<ul>{turn.issues.map((issue,j)=><li key={j}><strong>{issue.claim}</strong>：{issue.reason}</li>)}</ul>}{turn.pending_questions?.length>0&&<ul>{turn.pending_questions.map((q,j)=><li key={j}>{q}</li>)}</ul>}{turn.article&&<details><summary>查看本轮正文</summary><SourceText text={articleText(turn.article)}/></details>}</div>)}</Section>}
        {pending&&<section className="result-wait"><span className="result-spinner"/><div><h2>{({planning:'正在整理资料与写作任务',generating:'正在依据任务包创作正文',reviewing:'正在独立核验成稿',revising:'正在按反馈定向修订'})[job.status]}</h2><p>核验结果会如实显示通过、待确认或拦截。</p></div></section>}
        {complete&&<><div className="result-outcome"><div><span className={`result-badge ${confirmed?'passed':v.reviewed===false?'passed':v.overall_status}`}>{confirmed?'已确认':v.reviewed===false?'生成完成':labels[v.overall_status]}</span><p>{confirmed?'图文已确认，可复制或下载。':v.reviewed===false?'文案已就绪，可复制或下载。':blocked?'成稿含有未通过项，已拦截正文展示，请查看第四段后调整重试。':v.overall_status==='pending'?'已完成资料对照，仍有需确认事项；发布前请检查第四段。':'已完成本轮资料对照，请按实际SKU与适用条件使用。'}</p></div><div className="result-actions"><button className="btn-ghost" disabled={blocked} onClick={copy}><Copy size={16}/>复制发布文案</button><button className="btn-primary" onClick={download}><Download size={16}/>下载完整结果（四部分）</button><button className="btn-primary" disabled={blocked} onClick={()=>setPreviewOpen(true)}><Eye size={16}/>预览发布稿</button><button className="btn-primary" disabled={blocked||exporting} onClick={exportHtml}><Download size={16}/>图文HTML</button><button className="btn-primary" disabled={blocked||exporting} onClick={exportZip}><Download size={16}/>图文ZIP</button></div></div>{notice&&<p role="status" className="product-notice">{notice}</p>}
        <Section id="r-scene" no="01" title="场景判断"><div className="scene-grid"><div><small>目标客户{result.scene.inferred?' · 系统推断':''}</small><strong>{result.scene.persona}</strong></div><div><small>发布平台</small><strong>{job.summary.platform}</strong></div><div><small>使用场景</small><strong>{result.scene.usage_scenarios.join('、')}</strong></div><div><small>主要问题</small><strong>{result.scene.main_problem}</strong></div></div><p>{result.scene.core_conflict}</p><p className="knowledge-note">{result.scene.reasoning}</p>{result.scene.questions.length>0&&<details className="result-details"><summary>待确认的问题 · {result.scene.questions.length} 项</summary><ul>{result.scene.questions.map((q,i)=><li key={i}>{q}</li>)}</ul></details>}</Section>
        <Section id="r-basis" no="02" title="知识库依据"><p className="knowledge-note">下列片段直接保留知识库原文，资料日期不代表当日联网核验。</p><div className="fact-list">{result.basis.map(f=><details key={f.fact_id} className="result-details"><summary><span className="fact-id">{f.fact_id}</span>{f.group} · {f.source_title}</summary><p className="document-source">{f.model_name} · {f.version} · 资料日期：{f.recorded_date}</p><p className="document-source">{f.source}</p><SourceText text={f.original_snippet}/>{f.urls.map((url,i)=><a className="fact-link" key={i} href={url} target="_blank" rel="noreferrer">原始来源 {i+1} ↗</a>)}</details>)}</div></Section>
        <Section id="r-article" no="03" title="图文软文" action={!blocked?<button type="button" className="btn-ghost section-action-btn" onClick={()=>setPreviewOpen(true)}><Eye size={14}/>预览发布稿</button>:null}>{blocked?<p className="result-error">草稿未通过核验。为避免误用，正文已拦截；下载记录可保留核验说明和出处。</p>:<><ArticleEditor job={job} onEditing={setEditingArticle} onSaved={data=>{setJob(data);setNotice('修改已保存，请预览后点击确认。');}}/><ArticlePreview job={job} result={result} platformKind={platformKind} generatedTime={generatedTime}/></>}</Section>
        <Section id="r-review" no="04" title="核验结果"><div className="article-confirm-actions"><button type="button" className="btn-primary" disabled={editingArticle||approvingArticle||confirmed} onClick={approveArticle}>{approvingArticle?'确认中…':confirmed?'已确认':'确认'}</button></div><p className="knowledge-note">核验范围：本地资料支持、清单归属、合规与平台要求。未联网确认最新政策，未进行实机或像素级验收；图片按可信描述选取。</p>{v.reviewed===false&&<p className="knowledge-note">审核历史与修改意见见上方修订对话。</p>}{v.checks.some(ch=>ch.type==='image'&&ch.status==='pending')&&<div className="image-confirm-box"><div><strong>确认图片来源</strong><p>我确认本次配图来自已下载的 ima 本地资料，且与所选产品型号相符。</p></div><button type="button" className="btn-primary" disabled={confirming} onClick={confirmImages}>{confirming?'正在保存…':'确认图片并更新核验状态'}</button></div>}{v.imageSourceConfirmedAt&&<p className="image-confirmed-note">图片来源已确认 · {new Date(v.imageSourceConfirmedAt).toLocaleString('zh-CN')}</p>}<div className="verification-list">{v.checks.map((ch,i)=><div className="verification-row" key={i}><span className={`result-badge ${ch.status}`}>{labels[ch.status]}</span><div><strong>{({fact:'产品事实',image:'图片型号',compliance:'合规',platform:'平台适配'})[ch.type]}{ch.fact_id?` · ${ch.fact_id}`:''}</strong><p>{ch.claim}</p><small>{ch.action==='revise'?'修改建议：':ch.action==='confirm'?'待确认：':''}{ch.reason}</small></div></div>)}</div>{v.pending_questions.length>0&&<div className="verification-questions"><h3>待确认信息</h3><ul>{v.pending_questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}</Section>
        <details id="r-materials" className="result-section"><summary>本次使用素材 · {job.input.materials.length} 份</summary>{job.input.materials.map(m=><details key={m.material.id} className="result-details"><summary>{m.material.category} · {m.material.name}</summary><p className="document-source">{m.material.source}</p><SourceText text={m.content}/></details>)}</details></>}
        {result?.trace&&<details id="r-trace" className="result-section prompt-records"><summary>模型调用记录 · {result.trace.length} 次调用</summary><p className="knowledge-note">记录实际提示词、原始模型输出及校验原因。</p>{result.trace.map((call,i)=><details key={i} className="result-details"><summary>{i+1}. {call.name} · 第 {call.attempt} 次 · {call.model}</summary><p className="knowledge-note">输入：{call.inputCharacters??'—'} 字符；输出：{call.outputCharacters??'—'} 字符；耗时：{call.durationMs!=null?(call.durationMs/1000).toFixed(1)+'秒':'—'}</p>{call.messages.map((m,j)=><div key={j}><h4>{m.role}</h4><pre>{m.content}</pre></div>)}{call.formatError&&<p className="product-error">{call.formatError}</p>}<h4>原始模型输出</h4><p className="knowledge-note">{call.validationStatus==='passed'?'格式校验通过':call.formatError?'格式校验失败':'未记录校验结果'}{call.finishReason?` · finish_reason: ${call.finishReason}`:''}</p><pre>{call.rawOutput||call.invalidOutput||'该次调用未保存原始输出（旧记录或未收到模型响应）。'}</pre></details>)}</details>}
      </div>

      <nav className="result-rail" aria-label="本页导航">
        <div className="result-rail-title">本页导航</div>
        <ul>{toc.map(t=><li key={t.id}><button type="button" className={active===t.id?'is-active':''} onClick={()=>jump(t.id)}>{t.no&&<span className="result-rail-no">{t.no}</span>}<span>{t.label}</span></button></li>)}</ul>
      </nav>
    </div>
    {previewOpen&&job?.result?.article&&<PublishPreview job={job} onClose={()=>setPreviewOpen(false)}/>}
  </div>;
}
