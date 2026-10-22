import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import './result.css';
const status={planning:'整理资料中',generating:'正在创作',reviewing:'独立核验中',revising:'定向修订中',succeeded:'已完成',failed:'未完成'};
export default function History(){
  const [rows,setRows]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  async function load(){try{const r=await fetch('/api/generations',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'读取失败');setRows(d.generations);setError('');}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);
  return <><div className="page-head"><h1>历史记录</h1><p>保留本次卡片、素材原文、四段结果和实际提示词，点击即可重新打开。</p></div>{error&&<p role="alert" className="result-error">{error}<button className="btn-ghost" onClick={load}>重试</button></p>}{loading?<p role="status">正在读取记录…</p>:!rows.length?<section className="result-section"><h2>还没有生成记录</h2><p>选择产品、客户和平台后，开始你的第一次图文创作。</p><Link className="btn-primary" to="/create/product">开始创作</Link></section>:<div className="history-records">{rows.map(row=><Link to={`/result/${row.id}`} className="history-record" key={row.id}><div><h2>{row.summary.product}</h2><p>{row.summary.audience} · {row.summary.platform} · {row.summary.task} · {row.summary.materialCount} 份素材</p><small>{new Date(row.createdAt).toLocaleString('zh-CN')}</small></div><span className={`result-badge ${row.status==='failed'?'rejected':row.status==='succeeded'?'passed':'pending'}`}>{status[row.status]} →</span></Link>)}</div>}</>;
}
