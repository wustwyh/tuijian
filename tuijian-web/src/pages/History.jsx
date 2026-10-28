import {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, Clock3, FileText, Image as ImageIcon, Layers, Sparkles, Users, X, SlidersHorizontal} from 'lucide-react';
import './result.css';
import './history.css';

const STATUS = {planning:'整理资料中',generating:'正在创作',reviewing:'独立核验中',revising:'定向修订中',succeeded:'已完成',failed:'未完成'};
const RUNNING = ['planning', 'generating', 'reviewing', 'revising'];
const badgeOf = status => (status === 'failed' ? 'rejected' : status === 'succeeded' ? 'passed' : 'pending');
const platformOf = row => row.summary.platformId || row.summary.platform || '';
const shortPlatform = row => (row.summary.platform || '').replace('长图文', '').replace('企业采购方案', '采购方案');

const FILTERS = [
  {id: 'all', label: '全部'},
  {id: 'done', label: '已完成'},
  {id: 'running', label: '进行中'},
  {id: 'failed', label: '未完成'},
];

// 从记录里汇总出可筛的选项，按出现次数从多到少排
function optionsOf(rows, pick) {
  const counts = new Map();
  for (const row of rows) {
    const value = pick(row);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh')).map(([value, count]) => ({value, count}));
}

export default function History() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('');

  async function load() {
    setError('');
    try {
      const r = await fetch('/api/generations', {cache: 'no-store'});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '读取失败');
      setRows(d.generations || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    all: rows.length,
    done: rows.filter(r => r.status === 'succeeded').length,
    running: rows.filter(r => RUNNING.includes(r.status)).length,
    failed: rows.filter(r => r.status === 'failed').length,
  }), [rows]);

  const products = useMemo(() => optionsOf(rows, r => r.summary.product), [rows]);
  const audiences = useMemo(() => optionsOf(rows, r => r.summary.audience), [rows]);
  const platforms = useMemo(() => optionsOf(rows, r => r.summary.platform), [rows]);

  const shown = useMemo(() => {
    let list = rows;
    if (filter === 'done') list = list.filter(r => r.status === 'succeeded');
    if (filter === 'running') list = list.filter(r => RUNNING.includes(r.status));
    if (filter === 'failed') list = list.filter(r => r.status === 'failed');
    if (product) list = list.filter(r => r.summary.product === product);
    if (audience) list = list.filter(r => r.summary.audience === audience);
    if (platform) list = list.filter(r => r.summary.platform === platform);
    return list;
  }, [rows, filter, product, audience, platform]);

  const narrowed = Boolean(product || audience || platform);
  const clearAll = () => { setProduct(''); setAudience(''); setPlatform(''); };

  return (
    <div className="history-page">
      <div className="history-head">
        <div>
          <span className="history-eyebrow">HISTORY · 创作档案</span>
          <h1>历史记录</h1>
          <p>点开任意一条就能回到当时的现场。</p>
        </div>
        <Link className="btn-primary history-new" to="/create/product"><Sparkles size={16} />新建一次创作</Link>
      </div>

      <div className="history-stats">
        {[
          {key: 'all', label: '全部记录', icon: <Layers size={16} />},
          {key: 'done', label: '已完成', icon: <FileText size={16} />},
          {key: 'running', label: '进行中', icon: <Clock3 size={16} />},
          {key: 'failed', label: '未完成', icon: <Users size={16} />},
        ].map(item => (
          <button
            type="button"
            key={item.key}
            className={`history-stat${filter === item.key ? ' is-active' : ''}`}
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
          >
            <span className="history-stat-icon">{item.icon}</span>
            <span className="history-stat-num">{stats[item.key]}</span>
            <span className="history-stat-label">{item.label}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="result-error">{error}<button className="btn-ghost" onClick={load}>重试</button></p>}

      {loading && (
        <div className="history-grid" aria-hidden="true">
          {[0, 1, 2].map(i => <div className="history-card is-skeleton" key={i}><span /><span /><span /></div>)}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <section className="history-empty">
          <div className="history-empty-art"><ImageIcon size={26} /></div>
          <h2>还没有生成记录</h2>
          <p>选好产品、客户和平台，第一次创作的完整过程会出现在这里。</p>
          <Link className="btn-primary" to="/create/product">开始创作</Link>
        </section>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="history-toolbar">
            <div className="history-filters" role="tablist" aria-label="按状态筛选">
              {FILTERS.map(f => (
                <button type="button" key={f.id} role="tab" aria-selected={filter === f.id}
                  className={`history-filter${filter === f.id ? ' is-active' : ''}`}
                  onClick={() => setFilter(f.id)}>
                  {f.label}<b>{stats[f.id]}</b>
                </button>
              ))}
            </div>
            <span className="history-total">共 {shown.length} 条</span>
          </div>

          <div className="history-scope">
            <span className="history-scope-title"><SlidersHorizontal size={14} />按条件筛</span>
            <label className="history-select">
              <span>产品</span>
              <select value={product} onChange={e => setProduct(e.target.value)}>
                <option value="">全部产品（{products.length}）</option>
                {products.map(o => <option key={o.value} value={o.value}>{o.value}（{o.count}）</option>)}
              </select>
            </label>
            <label className="history-select">
              <span>客户</span>
              <select value={audience} onChange={e => setAudience(e.target.value)}>
                <option value="">全部客户（{audiences.length}）</option>
                {audiences.map(o => <option key={o.value} value={o.value}>{o.value}（{o.count}）</option>)}
              </select>
            </label>
            <label className="history-select">
              <span>平台</span>
              <select value={platform} onChange={e => setPlatform(e.target.value)}>
                <option value="">全部平台（{platforms.length}）</option>
                {platforms.map(o => <option key={o.value} value={o.value}>{o.value}（{o.count}）</option>)}
              </select>
            </label>
            {narrowed && <button type="button" className="history-clear" onClick={clearAll}><X size={13} />清除条件</button>}
          </div>
        </>
      )}

      {!loading && !error && rows.length > 0 && shown.length === 0 && (
        <p className="history-blank">这个条件下还没有记录，换个筛选看看。</p>
      )}

      {!loading && !error && shown.length > 0 && (
        <div className="history-grid">
          {shown.map(row => (
            <Link to={`/result/${row.id}`} className="history-card" key={row.id} data-platform={platformOf(row)}>
              <div className="history-card-top">
                <span className="history-platform">{shortPlatform(row)}</span>
                <span className={`result-badge ${badgeOf(row.status)}`}>{STATUS[row.status] || row.status}</span>
              </div>
              <h2 className="history-card-title">{row.summary.product}</h2>
              <div className="history-card-tags">
                <span>{row.summary.audience}</span>
                <span>{row.summary.task}{row.summary.format ? ` · ${row.summary.format}` : ''}</span>
                <span>{row.summary.materialCount} 份素材</span>
              </div>
              <div className="history-card-foot">
                <span className="history-time">{new Date(row.createdAt).toLocaleString('zh-CN', {hour12: false})}</span>
                <span className="history-open">查看结果<ArrowRight size={14} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
