const Fold = ({id, title, count, children, open}) => <details id={id} open={open}><summary>{title}{count}</summary>{children}</details>;
const SourceText = () => null;
const WritingPackage = () => null;
const articleText = () => '';
const ROLE_LABEL = {};
function ConversationTurn({turn}) { return <div>{turn.message}</div>; }
export default function T({job, result, generatedTime}) {
  return <section className="rs-process">
        <h2>过程材料</h2>
        <Fold id="r-scene" title="场景判断" count={result.scene.usage_scenarios.length+' 个场景'}>
          <div className="rs-kv"><span>目标客户</span><b>{result.scene.persona}{result.scene.inferred?'（推断）':''}</b></div>
          <div className="rs-kv"><span>使用场景</span><b>{result.scene.usage_scenarios.join('、')}</b></div>
          <div className="rs-kv"><span>主要问题</span><b>{result.scene.main_problem}</b></div>
          <p className="rs-note">{result.scene.core_conflict}</p>
          {result.scene.questions.length>0&&<div className="rs-list"><h3>待确认</h3><ul>{result.scene.questions.map((q,i)=><li key={i}>{q}</li>)}</ul></div>}
        </Fold>

        <Fold id="r-basis" title="知识库依据" count={result.basis.length + ' 条'}>
          <div className="fact-list">{result.basis.map(f=><details key={f.fact_id} className="result-details"><summary><span className="fact-id">{f.fact_id}</span>{f.group} · {f.source_title}</summary><p className="document-source">{f.model_name} · {f.version} · 资料日期：{f.recorded_date}</p><p className="document-source">{f.source}</p><SourceText text={f.original_snippet}/>{f.urls.map((url,i)=><a className="fact-link" key={i} href={url} target="_blank" rel="noreferrer">原始来源 {i+1} ↗</a>)}</details>)}</div>
        </Fold>

        {result.writingPackage&&<Fold id="r-package" title="写作任务包"><WritingPackage plan={result.writingPackage} selection={result.selection} generatedTime={generatedTime}/></Fold>}

        {result.conversation?.length>0&&<Fold id="r-conversation" title="审核与修订" count={result.conversation.length + ' 轮'}>
          {result.conversation.map((turn,i)=><ConversationTurn key={i} turn={turn}/>)}
        </Fold>}

        {job.input.materials.length>0&&<Fold id="r-materials" title="使用素材" count={job.input.materials.length + ' 份'}>
          {job.input.materials.map(m=><details key={m.material.id} className="rs-sub"><summary>{m.material.category} · {m.material.name}</summary><p className="rs-note">{m.material.source}</p><SourceText text={m.content}/></details>)}
        </Fold>}

        {result.trace&&<Fold id="r-trace" title="模型调用记录" count={result.trace.length + ' 次'}>
          {result.trace.map((call,i)=><details key={i} className="rs-sub"><summary>{i+1}. {call.name} · {call.model}</summary><p className="rs-note">输入 {call.inputCharacters??'—'} 字符 · 输出 {call.outputCharacters??'—'} 字符</p></details>)}
        </Fold>}
      </section>;
}
