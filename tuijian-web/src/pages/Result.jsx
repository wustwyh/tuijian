import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import ResultView from './ResultView.jsx';
import ArticleWorkbench from './ArticleWorkbench.jsx';
import {resultText} from '../resultText.js';
import {articleText} from '../publication.js';
import {generationError} from '../generationError.js';
import {downloadPublishHtml,downloadPublishZip} from '../export.js';
import {platformSpec} from '../platform-layout.js';
import {layoutKindOf} from '../publish-html.js';
import './platform-layout.css';

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

  async function retry(){if(retryLock.current)return;retryLock.current=true;setRetrying(true);setRetryError('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/retry`,{method:'POST'});let data;try{data=await response.json();}catch{throw new Error('服务器返回异常，请稍后重试');}if(!response.ok)throw new Error(data.error||'重试未能开始');if(typeof data.id!=='string')throw new Error('服务器未返回任务编号，请重新读取');navigate(`/result/${data.id}`);}catch(e){setRetryError(e instanceof TypeError?'网络连接失败，请检查网络后重试':e.message);}finally{retryLock.current=false;setRetrying(false);}}
  async function copy(){try{await navigator.clipboard.writeText(articleText(result.article));setNotice('发布文案已复制');}catch{setNotice('复制不可用，请下载保存');}}
  function download(){const url=URL.createObjectURL(new Blob([resultText(job)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${job.summary.product}-${id.slice(0,8)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function exportHtml(){if(exporting)return;setExporting(true);setNotice('');try{await downloadPublishHtml(job);setNotice('图文 HTML 已下载');}catch(e){setNotice(e.message||'导出失败');}finally{setExporting(false);}}
  async function exportZip(){if(exporting)return;setExporting(true);setNotice('');try{await downloadPublishZip(job);setNotice('图文 ZIP 已下载');}catch(e){setNotice(e.message||'导出失败');}finally{setExporting(false);}}
  async function confirmImages(){if(confirming)return;setConfirming(true);setNotice('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/confirm-images`,{method:'POST'});const data=await response.json();if(!response.ok)throw new Error(data.error||'确认失败');setJob(data);setNotice(data.result.verification.overall_status==='passed'?'图片来源已确认，本条记录核验通过。':'图片来源已确认。');}catch(e){setNotice(e.message||'确认失败，请重试');}finally{setConfirming(false);}}
  async function approveArticle(){if(approvingArticle)return;setApprovingArticle(true);setNotice('');try{const response=await fetch(`/api/generations/${encodeURIComponent(id)}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:result.editorial?.revision||0})});const data=await response.json();if(!response.ok)throw new Error(data.error||'审核未完成');setJob(data);setNotice('已确认定稿。');}catch(e){setNotice(e.message||'审核失败，请重试');}finally{setApprovingArticle(false);}}
  function openWorkbench(){setFixRequest(null);setWorkbenchOpen(true);}
  function fixThis(ch,i){setFixRequest({key:`${i}-${String(ch.claim).slice(0,8)}`,claim:ch.claim,reason:ch.reason});setWorkbenchOpen(true);}

  if(id==='demo')return <><div className="page-head"><h1>开始真实创作</h1><p>演示结果已替换为真实生成，请重新选择卡片发起任务。</p></div><Link className="btn-primary" to="/create/product">前往营销图文</Link></>;

  return <>
    <ResultView p={{job,pending,complete,failed,result,v,stats,statusInfo,blocked,confirmed,issueCount,openChecks,setChecksOpen,confirming,approvingArticle,exporting,retrying,retryError,notice,error,failure,failureStage,generatedTime,platformKind,workbenchOpen,retry,copy,download,exportHtml,exportZip,confirmImages,approveArticle,openWorkbench,fixThis,reload:()=>setReload(n=>n+1)}}/>
    {workbenchOpen&&job?.result?.article&&<ArticleWorkbench job={job} platformKind={platformKind} generatedTime={generatedTime} suggestion={fixRequest} onClose={()=>{setWorkbenchOpen(false);setFixRequest(null);}} onSaved={data=>{setFixRequest(null);setJob(data);const ver=data.result?.verification;const label=ver?({passed:'核验通过',pending:'仍有待确认事项',rejected:'有未通过项',conflict:'资料冲突'})[ver.overall_status]||ver.overall_status:'未核验';setNotice('已保存并重新核验：'+label+'。');}}/>}
  </>;
}
