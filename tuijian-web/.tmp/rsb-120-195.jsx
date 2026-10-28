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
  </div>;
}

export default function Result(){
  const {id}=useParams(),[job,setJob]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0),[notice,setNotice]=useState('');
  const navigate=useNavigate(),retryLock=useRef(false),[retrying,setRetrying]=useState(false),[retryError,setRetryError]=useState(''),[exporting,setExporting]=useState(false);
  const [confirming,setConfirming]=useState(false),[fixRequest,setFixRequest]=useState(null),[approvingArticle,setApprovingArticle]=useState(false),[workbenchOpen,setWorkbenchOpen]=useState(false);
  const [checksOpen,setChecksOpen]=useState(null);
  // 生成刚跑完时自动打开工作台（只开一次，且只在本次页面观察到「进行中 → 已完成」时开）
  const autoOpened=useRef(false),lastStatus=useRef(null);
  useEffect(()=>{setRetryError('');setNotice('');autoOpened.current=false;lastStatus.current=null;},[id]);
  useEffect(()=>{if(!job)return;const running=['planning','generating','reviewing','revising'];const wasRunning=running.includes(lastStatus.current);lastStatus.current=job.status;if(autoOpened.current||!wasRunning)return;if(job.status!=='succeeded'||!job.result?.article)return;if(['rejected','conflict'].includes(job.result.verification?.overall_status))return;autoOpened.current=true;setWorkbenchOpen(true);},[job]);
  useEffect(()=>{if(id==='demo')return;const controller=new AbortController();let timer;setJob(null);setError('');
    async function load(){try{const r=await fetch(`/api/generations/${encodeURIComponent(id)}`,{cache:'no-store',signal:controller.signal});let data;try{data=await r.json();}catch{throw new Error('服务器返回异常，请重新读取任务');}if(!r.ok)throw Object.assign(new Error(data.error||'读取结果失败'),{retryable:r.status>=500});setJob(data);setError('');if(['planning','generating','reviewing','revising'].includes(data.status))timer=setTimeout(load,2000);}catch(e){if(e.name!=='AbortError'){setError(e instanceof TypeError?'网络连接失败，请检查网络后重新读取':e.message);if(e.retryable!==false)timer=setTimeout(load,3000);}}}
    load();return()=>{controller.abort();clearTimeout(timer);};
  },[id,reload]);
  const pending=job&&['planning','generating','reviewing','revising'].includes(job.status),result=job?.result,complete=job?.status==='succeeded',v=complete?result.verification:null;
  const blocked=v&&['rejected','conflict'].includes(v.overall_status);
  const generatedAt=result?.completedAt||job?.createdAt;
  const generatedTime=generatedAt?new Date(generatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未记录';
  const platformKind=layoutKindOf(platformSpec(job?.summary?.platformId||job?.summary?.platform));
  const failure=generationError(job?.error,job?.result?.failure?.code);
  const failed=job?.status==='failed';
  const failureStage=({selecting:'筛选资料',planning:'整理写作任务包',writing:'创作正文',generating:'创作正文',reviewing:'核验正文与配图',revising:'定向修订'})[result?.progress?.stage]||result?.failure?.stage||'准备资料';
  const confirmed=complete&&result.editorial?.status==='approved';
  const statusInfo=confirmed?{t:'已确认',c:'passed'}:failed?{t:'生成失败',c:'failed'}:complete?(blocked?{t:'已拦截',c:'blocked'}:v.reviewed===false?{t:'生成完成',c:'done'}:v.overall_status==='pending'?{t:'待确认',c:'pending'}:v.overall_status==='passed'?{t:'核验通过',c:'passed'}:{t:'生成完成',c:'done'}):job?{t:'生成中',c:'running'}:{t:'读取中',c:'running'};
  const stats=complete?{passed:v.checks.filter(c=>c.status==='passed').length,pending:v.checks.filter(c=>c.status==='pending').length,rejected:v.checks.filter(c=>c.status==='rejected').length,conflict:v.checks.filter(c=>c.status==='conflict').length}:null;
  const issueCount=stats?stats.rejected+stats.conflict+stats.pending:0;
  const fixes=v?v.checks.filter(ch=>ch.action==='revise').length:0;
  const openChecks=checksOpen??Boolean(blocked||fixes>0);
  if(id==='demo')return <><div className="page-head"><h1>开始真实创作</h1><p>演示结果已替换为真实生成，请重新选择卡片发起任务。</p></div><Link className="btn-primary" to="/create/product">前往营销图文</Link></>;
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












































































}
