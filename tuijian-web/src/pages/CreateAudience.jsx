import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import {useState} from 'react';
import './management.css';
import { useCompose } from '../compose.jsx';
import { CheckMark, StepHead } from './parts.jsx';

function AudienceCard({ a, recommended }) {
  const c = useCompose();
  const on = c.state.audienceId === a.id;
  return (
    <button
      type="button"
      className={`aud${on ? ' is-on' : ''}${recommended ? ' is-rec' : ''}`}
      aria-pressed={on}
      onClick={() => c.set({ audienceId: on ? null : a.id })}
    >
      <span className="aud-name">{a.name}</span>
      <span className="aud-who">{a.who}</span>
      <span className="aud-label">典型痛点</span>
      {a.pain_points.slice(0, 3).map((p) => (
        <span key={p} className="aud-pain">{p}</span>
      ))}
      {on && <CheckMark />}
    </button>
  );
}

// ② 选客户：可不选；选了产品后顶部出现「为这台推荐」
export default function CreateAudience() {
  const c = useCompose();
  const rec=c.recommendations;
  const [group,setGroup]=useState('全部');
  const list=c.audiences.filter(a=>group==='全部'||a.group===group);
  const aiOn = c.state.audienceId === null;

  return (
    <>
      <StepHead
        no={2}
        title="选择客户"
        desc="文案会围绕这类客户的任务和痛点来写。也可以不选，交给 AI 判断。"
      />

      {c.product ? (
        rec.length > 0 && (
          <section className="block">
            <div className="block-head">
              <h2>为 {c.product.short} 推荐</h2>
              <span className="rec-note inferred">系统推荐 · 营销假设</span>
            </div>
            <div className="grid grid-aud">
              {rec.map((a) => (
                <AudienceCard key={a.id} a={a} recommended />
              ))}
            </div>
          </section>
        )
      ) : (
        <p className="hint">
          先选产品，这里会出现为它推荐的客户。<Link to="/create/product">去选产品</Link>
        </p>
      )}

      <section className="block">
        <div className="block-head">
          <h2>全部客户场景</h2>
          <span className="muted">{c.audiences.length} 类，来自客户场景库</span>
        </div>
        <div className="audience-tools"><div className="filter">{['全部','通用场景','行业与岗位','自建场景'].map(g=><button className="chip" key={g} aria-pressed={group===g} onClick={()=>setGroup(g)}>{g}</button>)}</div><Link to="/audiences">管理 / 添加客户</Link></div>
        {c.audiencesError&&<p role="alert" className="product-error">{c.audiencesError}<button className="btn-ghost" onClick={c.refreshAudiences}>重新加载</button></p>}
        {c.audiencesLoading&&<p role="status">正在读取 P8 客户资料…</p>}
        <div className="grid grid-aud">
          <button
            type="button"
            className={`aud aud-ai${aiOn ? ' is-on' : ''}`}
            aria-pressed={aiOn}
            onClick={() => c.set({ audienceId: null })}
          >
            <Sparkles size={22} aria-hidden="true" />
            <span className="aud-name">不指定，让 AI 判断</span>
            <span className="aud-who">AI 根据产品资料推断客户，结果里会标「系统推断」，可以换成你选的。</span>
            {c.product&&c.audienceAuto&&c.audience&&<span className="aud-effective">当前判断：{c.audience.name}</span>}
            {aiOn && <CheckMark />}
          </button>
          {list.map((a) => (
            <AudienceCard key={a.id} a={a} />
          ))}

        </div>
      </section>
    </>
  );
}
