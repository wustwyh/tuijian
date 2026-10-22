import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ClipboardCheck, FileSearch, FileText, Focus, Layers3, Lightbulb, MousePointer2, PackageCheck, Pause, Play, RefreshCw, ShieldCheck, Sparkles, Target, UserRound, Users, WandSparkles, Workflow } from 'lucide-react';
import './workflows.css';

const workflows=[
  {id:'audience', number:'01', name:'客户场景推荐', kicker:'从产品能力出发', title:'先理解产品，再找到合适的客户', color:'coral', summary:'根据产品系列和客户场景配置，为销售提供可切换的目标人群建议。客户可以接受推荐，也可以自己选择。', source:'产品系列 × 客户场景规则', stages:[
    {title:'选择产品',caption:'确定一台具体机型',visual:'product',detail:'先用精确产品型号作为推荐起点，避免把不同产品特性套用到同一客户。'},
    {title:'比对适用场景',caption:'查询机型关联画像',visual:'match',detail:'系统读取该产品对应的建议场景，例如移动办公、学生学习或内容创作。推荐定位为营销假设，不伪装成用户调研。'},
    {title:'呈现推荐人群',caption:'说明人群与典型痛点',visual:'audience',detail:'页面展示推荐客户的实际场景和痛点，销售能看懂推荐理由，并可对照其他人群。'},
    {title:'销售确认或改选',caption:'保留人工决定权',visual:'confirm',detail:'销售选择客户，或不指定客户交给后续生成环节判断；结果会标注系统推断。'}
  ],loop:'规则命中的是营销假设，客户选择始终由销售确认'},
  {id:'materials',number:'02',name:'参考素材推荐',kicker:'相关性筛选，不直接替你勾选',title:'从本次组合中找出真正相关的素材',color:'teal',summary:'产品、客户、平台、选题共同决定关联分；不兼容素材排除后，按分值排序并兼顾资料类型。',source:'型号 / 场景 / 平台 / 任务 / 选题',stages:[
    {title:'读取创作组合',caption:'产品、人群、平台与选题',visual:'inputs',detail:'素材匹配使用当前产品、人群、平台、任务和已选选题作为上下文。'},
    {title:'识别素材关联',caption:'检查资料的适用对象',visual:'filters',detail:'来源路径推断每份资料关联的产品、人群、平台、任务与选题。明确关联到其他对象的素材会被判为不兼容。'},
    {title:'匹配并排序',caption:'相关分数与类型去重',visual:'rank',detail:'型号关联80分、平台60分、客户场景35分、任务和选题各25分、表达边界40分。按分数从高到低推荐，尽量各取一种素材类型。'},
    {title:'销售勾选采用',caption:'推荐不等于自动使用',visual:'select',detail:'推荐素材先展示理由但默认不勾选。销售可逐项勾选、“采用推荐”一键选择，也可以添加其他资料。'}
  ],loop:'先推荐给人看，只有勾选后的原文才进入本次创作'},
  {id:'discovery',number:'03',name:'多轮需求梳理',kicker:'一轮一问，逐步澄清',title:'让 AI 把没说清的要求问完整',color:'gold',summary:'产品、人群、平台等已有信息不会被重复询问；AI 每轮聚焦一个尚未覆盖的需求维度，并把答案整理成可执行的创作要求。',source:'最多7轮 · 5个需求维度 · 一份结构化摘要',stages:[
    {title:'锁定当前组合',caption:'产品、客户和平台先入上下文',visual:'context',detail:'开始梳理时会将已选产品、客户、平台、选题和素材组成会话上下文，并生成卡片签名。'},
    {title:'挑选待确认维度',caption:'从未覆盖的问题中选择',visual:'question',detail:'AI 从用户场景、首要目标、核心疑虑或卖点、行动与CTA、购买或内容阶段中挑选一个未问过的维度。'},
    {title:'回答后继续追问',caption:'每轮只解决一个问题',visual:'answer',detail:'用户选择、填写其他答案或暂不确定后，系统记录回答，再提出下一维度问题；最多七轮，也可在五个维度问完时提前结束。'},
    {title:'整理创作摘要',caption:'转成可执行的额外要求',visual:'summary',detail:'AI 将问答合成为场景、卖点取舍、适用条件、行动引导和语气要求，供成稿工作流使用；不据此编造产品事实。'}
  ],loop:'答案进入问答记录 → 下一个未覆盖维度 → 汇总成创作摘要'},
  {id:'writing',number:'04',name:'智能体成稿与核验',kicker:'先规划，再写作，最后独立核验',title:'让每一句推荐都经得起资料回查',color:'blue',summary:'资料筛选、任务规划、证据约束创作和独立审核串成一条流水线；有可修正问题时定向返工，最终保留完整过程记录。',source:'知识原文 × 平台模板 × 规则检查',stages:[
    {title:'准备证据和任务',caption:'完整原文装入，节选仅用于规划',visual:'evidence',detail:'系统按任务相关性整理完整事实片段和手选素材；规划阶段使用压缩节选，成稿阶段仍使用完整原文。'},
    {title:'制定营销写作计划',caption:'切入点、卖点、边界与图片',visual:'plan',detail:'规划模型选择有据卖点和可用图片，形成目标、平台结构、适用条件和待确认事项。'},
    {title:'生成销售文案',caption:'按平台模板写给潜在客户',visual:'draft',detail:'创作模型依据选定事实及完整原文组织场景、产品能力、客户收益和销售行动；事实句保留引用编号。'},
    {title:'核验并定向返修',caption:'事实、图片、合规、平台四类',visual:'review',detail:'独立核验逐句回查事实，同时检查图片型号与来源、违规宣传和平台表达。遇到可修改问题最多进行两轮定向修订。'},
    {title:'呈现结果与过程',caption:'保留核验状态和下载记录',visual:'result',detail:'输出场景判断、知识库依据、图文软文、核验结果，以及素材快照、提示词、模型调用记录和 HTML/ZIP 导出。'}
  ],loop:'可修改问题 → 定向修订 → 再次独立核验（最多两轮）'}
];

function StageVisual({type}){
  if(type==='product')return <div className="wf-visual wf-product"><div className="wf-product-screen"><span>MateBook</span><b>14</b><i/></div><div className="wf-product-base"/><span className="wf-corner"><PackageCheck size={15}/></span></div>;
  if(type==='match')return <div className="wf-visual wf-matcher"><span className="wf-match-product"><Layers3 size={16}/>MateBook</span><span className="wf-match-line"/><span className="wf-match-orbit"><Focus size={19}/></span><span className="wf-match-person"><UserRound size={16}/><i/><i/></span><small>场景画像匹配</small></div>;
  if(type==='audience')return <div className="wf-visual wf-people"><span className="wf-person-chip"><UserRound size={14}/>移动办公</span><span className="wf-person-chip selected"><UserRound size={14}/>学生学习<Check size={13}/></span><span className="wf-person-chip"><UserRound size={14}/>内容创作</span></div>;
  if(type==='confirm')return <div className="wf-visual wf-confirm"><div><Check size={16}/><span><b>推荐场景</b><small>可随时改选</small></span></div><span className="wf-human-stamp"><MousePointer2 size={16}/>销售确认</span></div>;
  if(type==='inputs')return <div className="wf-visual wf-inputs"><span><PackageCheck size={14}/>产品</span><span><Users size={14}/>人群</span><span><FileText size={14}/>平台</span><span><Target size={14}/>选题</span></div>;
  if(type==='filters')return <div className="wf-visual wf-filters"><div className="wf-filter-row good"><Check size={14}/><span>匹配当前组合</span><i/></div><div className="wf-filter-row good"><Check size={14}/><span>保留兼容资料</span><i/></div><div className="wf-filter-row off"><span>关联冲突</span><span className="wf-filter-off">排除</span></div></div>;
  if(type==='rank')return <div className="wf-visual wf-ranking"><div><span>型号关联</span><b style={{'--rank':'93%'}}>80</b></div><div><span>平台关联</span><b style={{'--rank':'72%'}}>60</b></div><div><span>场景匹配</span><b style={{'--rank':'48%'}}>35</b></div><small>相关规则加权排序</small></div>;
  if(type==='select')return <div className="wf-visual wf-select"><div className="wf-select-title"><span>推荐素材</span><small>手动采用</small></div><span className="wf-check-row on"><Check size={13}/>平台结构参考</span><span className="wf-check-row"><i/>案例写法参考</span><span className="wf-select-action">采用推荐 <ArrowRight size={13}/></span></div>;
  if(type==='context')return <div className="wf-visual wf-context"><div className="wf-context-ring"><span><WandSparkles size={23}/></span></div><b>本次创作组合</b><small>产品 · 客户 · 平台 · 素材</small></div>;
  if(type==='question')return <div className="wf-visual wf-question"><span className="wf-bubble ai"><Sparkles size={12}/>这次最想突出什么？</span><span className="wf-choice active">核心卖点 <Check size={12}/></span><span className="wf-choice">使用场景</span><small>本轮 · 目标与卖点</small></div>;
  if(type==='answer')return <div className="wf-visual wf-answer"><span className="wf-bubble ai">已记录：核心卖点</span><span className="wf-loop-line"><RefreshCw size={16}/><i/></span><span className="wf-bubble next">继续追问下一维度</span><small>一问一答，逐步收敛</small></div>;
  if(type==='summary')return <div className="wf-visual wf-summary"><div className="wf-summary-doc"><span><i/><b/></span><span><i/><b/></span><span><i/><b/></span><small>创作要求摘要</small></div><span className="wf-summary-check"><Check size={14}/></span></div>;
  if(type==='evidence')return <div className="wf-visual wf-evidence"><span className="wf-evidence-doc"><FileSearch size={17}/><i/><i/><i/></span><span className="wf-evidence-link"><span/>原文依据<b>f_01</b></span><small>完整原文 · 可回查</small></div>;
  if(type==='plan')return <div className="wf-visual wf-plan"><div><Target size={15}/><span>场景切入</span><Check size={13}/></div><div><Lightbulb size={15}/><span>核心卖点</span><Check size={13}/></div><div><ShieldCheck size={15}/><span>适用边界</span><Check size={13}/></div></div>;
  if(type==='draft')return <div className="wf-visual wf-draft"><div className="wf-draft-header"><b>图文软文</b><span>发布草稿</span></div><div className="wf-draft-photo"><i/><i/><i/></div><div className="wf-draft-lines"><b/><i/><i/><i/><span>[f_01]</span></div></div>;
  if(type==='review')return <div className="wf-visual wf-review"><span><Check size={13}/>事实引用 <b>有据</b></span><span><Check size={13}/>产品图片 <b>匹配</b></span><span className="wf-review-revise"><RefreshCw size={13}/>定向修订 <b>≤2轮</b></span><small>独立核验</small></div>;
  return <div className="wf-visual wf-result"><span className="wf-result-file"><FileText size={20}/><b>创作结果</b></span><span className="wf-result-pill"><ShieldCheck size={13}/>核验记录</span><span className="wf-result-pill"><ArrowUpRight size={13}/>HTML / ZIP</span></div>;
}

function WorkflowDiagram({flow,step,onSelect}){
  return <div className={`wf-diagram tone-${flow.color}`}>
    <div className="wf-diagram-toolbar"><div className="wf-origin"><span className="wf-origin-glyph"><Target size={16}/></span><span><small>触发信号</small><b>{flow.source}</b></span></div><span className="wf-diagram-tag"><Sparkles size={14}/>{flow.kicker}</span></div>
    <div className={`wf-stage-grid count-${flow.stages.length}`}>
      {flow.stages.map((stage,i)=><button type="button" key={stage.title} className={`wf-stage${i===step?' is-active':''}${i<step?' is-passed':''}`} aria-pressed={i===step} onClick={()=>onSelect(i)}>
        <span className="wf-stage-index">{String(i+1).padStart(2,'0')}</span><StageVisual type={stage.visual}/><span className="wf-stage-title">{stage.title}</span><span className="wf-stage-caption">{stage.caption}</span><span className="wf-stage-detail"><ArrowUpRight size={13}/>{i===step?'当前环节':'查看环节'}</span>
      </button>)}
    </div>
    <div className="wf-loop" aria-label="流程反馈"><span className="wf-loop-start"><ArrowDown size={14}/>結果回路</span><span className="wf-loop-track"><i/><i/><i/></span><span className="wf-loop-caption"><RefreshCw size={14}/>{flow.loop}</span></div>
    <div className="wf-detail-strip"><span className="wf-detail-icon"><Focus size={18}/></span><span className="wf-detail-copy"><small>第 {String(step+1).padStart(2,'0')} 环节 · {flow.stages[step].title}</small><span>{flow.stages[step].detail}</span></span><span className="wf-detail-check"><ClipboardCheck size={15}/>可追溯步骤</span></div>
  </div>;
}

export default function Workflows(){
  const [active,setActive]=useState('audience'),[step,setStep]=useState(0),[playing,setPlaying]=useState(false);
  const flow=workflows.find(item=>item.id===active)||workflows[0];
  useEffect(()=>{if(!playing)return;const timer=setTimeout(()=>{if(step>=flow.stages.length-1)setPlaying(false);else setStep(step+1);},2400);return()=>clearTimeout(timer);},[playing,flow,step]);
  const changeStep=next=>{setStep(Math.max(0,Math.min(flow.stages.length-1,next)));setPlaying(false);};
  return <div className="workflows-page">
    <header className="wf-hero"><div className="wf-hero-art" aria-hidden="true"><span className="wf-hero-core"><Sparkles size={27}/></span><i className="wf-orbit orbit-a"/><i className="wf-orbit orbit-b"/><i className="wf-orbit orbit-c"/><span className="wf-orbit-dot dot-a"/><span className="wf-orbit-dot dot-b"/><span className="wf-orbit-dot dot-c"/><span className="wf-hero-stamp">推鉴<br/><small>有据可循</small></span></div><div className="wf-hero-copy"><span className="wf-hero-kicker"><span/>四条关键链路 · 一套可追溯工作台</span><h1>AI 如何把一次选择，<br/>变成一篇有据的推荐</h1><p>从理解客户与资料，到厘清需求、生成文案、逐句核验。</p><div className="wf-hero-signals"><span><b>4</b>条协作链路</span><i/><span><b>5</b>个梳理维度</span><i/><span><b>2</b>轮定向修订</span></div></div></header>
    <section className="wf-exhibit" aria-labelledby="wf-exhibit-title"><div className="wf-section-heading"><div><span className="wf-section-orbit"><Workflow size={18}/></span><div><h2 id="wf-exhibit-title">关键 AI 工作流</h2><p>切换链路，查看每个节点如何完成、衔接和回查。</p></div></div><span className="wf-live"><i/>流程可逐步演示</span></div>
      <div className="wf-selector" role="tablist" aria-label="工作流选择">{workflows.map(item=><button key={item.id} type="button" role="tab" aria-selected={active===item.id} className={`wf-tab tone-${item.color}${active===item.id?' is-active':''}`} onClick={()=>{setStep(0);setPlaying(false);setActive(item.id);}}><span className="wf-tab-number">{item.number}</span><span className="wf-tab-copy"><b>{item.name}</b><small>{item.kicker}</small></span><ArrowUpRight size={15}/></button>)}</div>
      <article className={`wf-panel tone-${flow.color}`} role="tabpanel"><div className="wf-panel-heading"><div><span className="wf-panel-number">{flow.number}</span><span className="wf-panel-kicker">{flow.kicker}</span><h3>{flow.title}</h3><p>{flow.summary}</p></div><button type="button" className="wf-play" onClick={()=>setPlaying(value=>!value)}>{playing?<Pause size={16}/>:<Play size={16}/>}<span>{playing?'暂停演示':'逐步演示'}</span></button></div>
        <WorkflowDiagram flow={flow} step={step} onSelect={changeStep}/>
        <div className="wf-playback"><div className="wf-playback-progress" aria-label={`第 ${step+1} 步，共 ${flow.stages.length} 步`}>{flow.stages.map((stage,i)=><button key={stage.title} type="button" aria-label={`查看第${i+1}步：${stage.title}`} aria-current={step===i?'step':undefined} className={i===step?'is-current':i<step?'is-done':''} onClick={()=>changeStep(i)}><span/></button>)}</div><span className="wf-playback-label">{step+1} / {flow.stages.length}</span><div className="wf-playback-actions"><button type="button" aria-label="上一个环节" title="上一个环节" disabled={step===0} onClick={()=>changeStep(step-1)}><ArrowLeft size={17}/></button><button type="button" aria-label="下一个环节" title="下一个环节" disabled={step===flow.stages.length-1} onClick={()=>changeStep(step+1)}><ArrowRight size={17}/></button></div></div>
      </article>
    </section>
    <section className="wf-principles" aria-label="流程设计原则"><div className="wf-principle"><span className="wf-principle-icon"><FileSearch size={18}/></span><span><b>素材进入有门槛</b><small>命中关联规则，人工勾选后才参与</small></span></div><div className="wf-principle"><span className="wf-principle-icon"><ShieldCheck size={18}/></span><span><b>产品事实有出处</b><small>引用回到原文，核验状态如实展示</small></span></div><div className="wf-principle"><span className="wf-principle-icon"><RefreshCw size={18}/></span><span><b>可改写，不越边界</b><small>修订针对问题，产品证据始终保留</small></span></div></section>
  </div>;
}
