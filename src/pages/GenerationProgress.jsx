import {FileCheck2,Users,Layers,Library,PenLine,ShieldCheck,Check,LoaderCircle,AlertCircle} from 'lucide-react';
import './generation-progress.css';
import {generationOutcome} from '../generationOutcome.js';
const steps=[
  {key:'selecting',title:'筛选相关资料',icon:FileCheck2,description:'按任务选择完整事实章节、写作参考与产品图片。'},
  {key:'planning',title:'整理写作任务包',icon:Library,description:'确定切入点、提纲、精选证据与表达边界。'},
  {key:'writing',title:'创作图文正文',icon:PenLine,description:'围绕任务包写作，并依据可信描述选择产品原图。'},
  {key:'reviewing',title:'核验正文与配图',icon:ShieldCheck,description:'对照原文、平台要求、图片描述与来源信息。'},
  {key:'revising',title:'按反馈定向修订',icon:Layers,description:'一次处理本轮全部可修改问题，保留正确内容。'},
];
export default function GenerationProgress({status,error,connectionError,verification,progress,confirmed=false}){
  const succeeded=status==='succeeded',failed=status==='failed',terminal=succeeded||failed;
  const stage=progress?.stage||({planning:'planning',generating:'writing',reviewing:'reviewing',revising:'revising'})[status]||'writing';
  const index=steps.findIndex(s=>s.key===stage),current=index<0?3:index;
  const outcome=confirmed&&succeeded?{state:'done',label:'已确认',detail:'图文已生成成功并完成确认，可复制或下载。'}:generationOutcome(status,verification,error);
  const state=outcome?.state||'working';
  const detail=outcome?outcome.detail:connectionError?'连接中，正在重试读取任务状态。':steps[current].description;
  return <section className={`creation-flow is-${state}`} aria-label="图文生成进度">
    <header className="creation-flow-head"><div><h2>从资料到成稿</h2><p>为本次选择组织一份有依据的图文</p></div></header>
    <div className="creation-flow-stage">
      {steps.map((step,index)=>{if(index!==current)return null;const Icon=step.icon,cardState=state;
        return <div key={step.title} className={`creation-step-card is-current is-${cardState}`}>
          <div className="creation-step-art"><div className="creation-step-orbit"/><div className="creation-step-icon"><Icon size={46} strokeWidth={1.45}/></div><span className="creation-step-mark">{cardState==='done'?<Check size={20}/>:['failed','pending'].includes(cardState)?<AlertCircle size={20}/>:<LoaderCircle size={20}/>}</span></div>
          <div className="creation-step-copy"><span className="creation-step-number">{terminal?'任务结果':`当前阶段 · ${index+1} / ${steps.length}`}{progress?.round>0?` · 第${progress.round}次修订`:''}</span><h3>{terminal?outcome.label:step.title}</h3><p>{detail}</p><div className="creation-step-status"><span className="creation-status-light"/>{outcome?outcome.label:connectionError?'连接中':'正在进行'}</div></div>
        </div>;
      })}
    </div>
    <ol className="creation-flow-dots" aria-label="实际生成阶段">{steps.map((step,index)=>{const skipped=succeeded&&index===4&&!progress?.round,done=!skipped&&(succeeded||index<current),blocked=failed&&index===current;return <li key={step.title} title={step.title} aria-label={`${step.title}：${skipped?'无需修订':blocked?'失败':done?'完成':index===current?'进行中':'等待'}`} aria-current={!terminal&&index===current?'step':undefined} className={blocked?'failed':done?'done':index===current&&!terminal?'active':''}><span>{done?<Check size={13}/>:blocked?'!':index+1}</span></li>;})}</ol>
    {outcome&&<p className="creation-flow-note" role="status">{outcome.label}；{outcome.detail}</p>}
  </section>;
}
