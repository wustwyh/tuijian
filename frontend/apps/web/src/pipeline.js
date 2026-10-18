import React, { useEffect, useState } from 'react';
import { h, button, badge, blank, notice, Section, Field } from './ui.js';
import { posterSvg } from './poster.js';
import { demoProducts } from './demo-products.js';
import { channels, channelOptions, creativeImages } from './marketing-options.js';
import { StrategyEditor, defaultStrategy } from './StrategyEditor.js';

const menu = [['products', '01', '产品总览'], ['research', '02', '客群调研'], ['leads', '↗', '客户跟进'], ['strategy', '03', '营销策略'], ['studio', '04', '内容工坊']];
const products = demoProducts;
const emptyPersona = { name: '等待客群分析', scene: '等待使用场景分析', need: '选择产品后分析客户需求', angle: '等待内容切入建议', concern: '等待产品资料核验' };
const personas = [
  { name: '准备开学的大学生', scene: '课堂笔记与资料整理', need: '学习资料分散，想找到适合自己的整理方式', angle: '从一次课堂资料整理开始', concern: '常用软件是否适用，需要逐项核验' },
  { name: '经常移动办公的职场人', scene: '差旅会议与日常办公', need: '在不同地点之间保持工作节奏', angle: '从一场移动办公体验开始', concern: '实际续航、软件与设备协同能力待核验' },
  { name: '注重表达的内容创作者', scene: '创作、展示与内容整理', need: '把灵感、资料和展示组织起来', angle: '从自己的创作流程开始', concern: '具体创作软件与性能需求待核验' },
];
const initialLeads = [{ id: 'demo-a', name: '客户 A', needs: '课堂笔记、资料整理', stage: '有兴趣', next: '确认常用软件并邀请到店体验', time: '', timeline: ['记录了资料整理需求'], content: [] }, { id: 'demo-b', name: '客户 B', needs: '移动办公、会议展示', stage: '初识', next: '了解日常办公场景', time: '', timeline: [], content: [] }];
const stages = ['读取产品依据', '推荐目标人群', '形成营销策略', '编排平台内容', '核验与导出'];

// Formal adapters deliberately return an explicit unavailable state until each real service is connected.
// These are frontend seams, not claims that corresponding HTTP endpoints exist.
export const pipelineAdapter = {
  async listProducts() { return { status: 'unavailable', products: [], reason: '暂无可选产品，请稍后刷新。' }; },
  async startPlan() { return { status: 'unavailable', reason: '生成服务暂时不可用，请稍后重试。' }; },
  async listCustomers() { return { status: 'unavailable', customers: [], reason: '暂无客户记录' }; },
};

function Heading({ step, title, text }) {
  return h('header', { className: 'page-heading' }, h('div', null, h('p', { className: 'eyebrow' }, step), h('h1', null, title), h('p', { className: 'muted' }, text)));
}
function Next({ children, onClick }) { return button(children, onClick, { className: 'primary' }); }

function Products({ run, start, history, openHistory, preferences, setPreferences, products = [] }) {
  const [selected, select] = useState(products[0] || null); const [query, search] = useState(''); const [category, filter] = useState('全部');
  const visible = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) && (category === '全部' || p.category === category));
  return h(React.Fragment, null,
    h(Heading, { step: 'PRODUCT → AUDIENCE → STRATEGY → CREATIVE', title: '选好产品，其余交给管线。', text: '零必填简报，一键串联人群、策略、内容与核验。你随时可以调整方向。' }),
    h('div', { className: 'pipeline-layout' },
      h(Section, { title: '产品与版本' }, h('div', { className: 'pipeline-toolbar' }, h('input', { 'aria-label': '搜索产品', placeholder: '搜索产品型号', value: query, onChange: e => search(e.target.value) }), h('select', { 'aria-label': '产品分类', value: category, onChange: e => filter(e.target.value) }, ...['全部', '轻薄本', '高性能轻薄本'].map(v => h('option', { key: v }, v)))),
        h('div', { className: 'product-grid' }, ...visible.map(p => h('button', { className: `product-card ${selected?.id === p.id ? 'selected' : ''}`, key: p.id, 'aria-pressed': selected?.id === p.id, onClick: () => select(p) },
          h('div', { className: 'product-visual' }, (p.image_url || p.image) ? h('img', { src: p.image_url || p.image, alt: p.name, style: { width: '100%', height: '190px', objectFit: 'contain' } }) : h('span', { className: 'no-product-image' }, '暂无产品图片')),
          h('div', { className: 'product-card-copy' }, badge(p.category), h('h3', null, p.name), h('p', null, p.note), badge(selected?.id === p.id ? '已选择' : '选择型号'))))), !visible.length && blank('暂无可选产品', '产品目录正在准备中，请稍后刷新。')),
      h(Section, { title: '生成偏好 · 可直接跳过' },
        h(Field, { name: 'pipeline-platform', label: '内容平台', value: preferences.platform, options: channelOptions, onChange: v => setPreferences(p => ({ ...p, platform: v })) }),
        h(Field, { name: 'pipeline-goal', label: '目标动作', value: preferences.goal, options: { '到店体验': '到店体验', '咨询了解': '咨询了解', '预约体验': '预约体验' }, onChange: v => setPreferences(p => ({ ...p, goal: v })) }),
        h('details', null, h('summary', null, '更多设置（可选）'), h(Field, { name: 'pipeline-hint', label: '补充人群或场景', value: preferences.hint, onChange: v => setPreferences(p => ({ ...p, hint: v })) })),
        h('p', { className: 'muted' }, '系统将推荐人群并继续执行；推荐不代表你已确认事实。'),
        button(run?.status === 'running' ? '正在生成方案…' : '一键生成营销方案 →', () => start(selected), { className: 'primary full', disabled: !selected || run?.status === 'running' }))),
    h(Section, { title: '方案记录' }, history.length ? history.map(item => button(`${item.product.name} · ${item.platform === 'xiaohongshu' ? '小红书' : '公众号'} · 重新运行 →`, () => openHistory(item), { key: item.id, className: 'history-row' })) : h('p', { className: 'muted' }, '暂无运行记录。')));
}

function Research({ persona, setPersona, next, hint }) {
  return h(React.Fragment, null, h(Heading, { step: 'A / AUDIENCE RESEARCH', title: '先找到想听你说的人。', text: '围绕使用场景、购买动机与顾虑，找到合适的沟通方向。' }),
    hint && notice(`本次补充偏好：${hint}`),
    h('div', { className: 'research-grid' }, ...personas.map((p, i) => h('article', { key: p.name, className: `research-card ${persona === i ? 'selected' : ''}` },
      h('div', { className: 'list-heading' }, badge(`PERSONA 0${i + 1}`), badge(persona === i ? '当前采用' : '候选', 'pending')), h('h2', null, p.name), h('p', null, p.scene), h('h4', null, '需求假设'), h('p', null, p.need), h('h4', null, '内容切入'), h('p', null, p.angle), h('h4', null, '顾虑 / 待核验'), h('p', null, p.concern),
      button(persona === i ? '已采用 · 可随时调整' : '采用这个人群', () => setPersona(i), { 'aria-pressed': persona === i })))),
    !personas.length && blank('尚未生成客群画像', '选择产品并生成营销方案后，这里将展示客群推荐。'),
    h(Section, { title: '推荐依据与证据' }, h('p', null, '选择产品后，将在这里展示推荐理由与事实依据。'), badge('等待产品资料', 'pending'), h('p', { className: 'muted' }, '查看来源条目、适用型号、读取时间与待验证项。')),
    h(Next, { onClick: next }, '查看同一方案的营销策略 →'));
}

function Strategy({ product, persona, customer, next, goal }) {
  const p = personas[persona] || emptyPersona;
  return h(React.Fragment, null, h(Heading, { step: 'C / MARKETING STRATEGY', title: '让表达围绕一个真实需求。', text: '人群与客户上下文沿同一方案传递，调整上游后，下游草稿和核验会失效。' }),
    h('div', { className: 'strategy-context' }, badge(product?.name || '尚未选择产品'), badge(p.name), badge(`目标：${goal}`), customer && badge(`关联：${customer.name}`)),
    h('div', { className: 'pipeline-layout' }, h(Section, { title: '策略摘要' }, h('div', { className: 'strategy-hero' }, h('p', { className: 'eyebrow' }, 'CORE TENSION'), h('h2', null, p.need), h('p', null, p.angle)), h('h3', null, '价值表达与证明'), h('p', null, '从日常使用场景邀请体验；产品性能、兼容性、价格等主张须等待线上证据。'), h('h3', null, '客户需求输入'), h('p', null, customer?.needs || '未关联客户，可独立生成营销方案。')),
      h(Section, { title: '执行计划' }, h('ol', null, h('li', null, `触达：${p.name}`), h('li', null, `场景：${p.scene}`), h('li', null, `行动：${goal}`)), notice('风险：不作未验证规格、价格或效果承诺。'), h(Next, { onClick: next }, '进入内容工坊 →'))));
}

function Customers({ leads, setLeads, selected, select, useCustomer }) {
  const [name, setName] = useState(''); const [note, setNote] = useState(''); const [message, setMessage] = useState(''); const lead = leads.find(l => l.id === selected) || leads[0];
  const update = values => setLeads(all => all.map(l => l.id === lead.id ? { ...l, ...values } : l));
  function add(e) { e.preventDefault(); const id = `customer-${Date.now()}`; setLeads(all => [...all, { id, name: name.trim(), needs: '', stage: '初识', next: '', time: '', timeline: [], content: [] }]); select(id); setName(''); setMessage('客户已加入本次会话，尚未保存到服务器。'); }
  return h(React.Fragment, null, h(Heading, { step: 'B / CUSTOMER FOLLOW-UP', title: '让每次沟通，都有下一步。', text: '记录客户需求与沟通进度，安排下一步行动。' }),
    message && notice(message), h('div', { className: 'lead-layout' }, h(Section, { title: '客户列表' }, h('form', { onSubmit: add, className: 'pipeline-toolbar' }, h('input', { 'aria-label': '客户名称', placeholder: '输入客户名称', required: true, maxLength: 50, value: name, onChange: e => setName(e.target.value) }), h('button', { type: 'submit' }, '新增')),
      ...leads.map(l => button(h(React.Fragment, null, h('strong', null, l.name), h('small', null, `${l.stage} · ${l.needs || '需求待补充'}`)), () => { select(l.id); setMessage(''); setNote(''); }, { key: l.id, className: `lead-row ${lead.id === l.id ? 'selected' : ''}` }))),
      lead ? h(Section, { title: lead.name }, h(Field, { name: 'customer-needs', label: '需求标签 / 场景', value: lead.needs, onChange: v => update({ needs: v }) }), h(Field, { name: 'customer-stage', label: '意向阶段', value: lead.stage, options: { '初识': '初识', '有兴趣': '有兴趣', '比较中': '比较中', '待跟进': '待跟进', '已完成': '已完成' }, onChange: v => update({ stage: v }) }), h(Field, { name: 'customer-next', label: '下一步动作', value: lead.next, onChange: v => update({ next: v }) }),
        h('div', { className: 'field' }, h('label', { htmlFor: 'customer-time' }, '下次跟进时间'), h('input', { id: 'customer-time', type: 'datetime-local', value: lead.time, onChange: e => update({ time: e.target.value }) })),
        h(Field, { name: 'customer-note', label: '本次跟进记录', value: note, multiline: true, onChange: setNote }), button('记录本次跟进', () => { update({ timeline: [...lead.timeline, `${new Date().toLocaleTimeString('zh-CN')} · ${note}`] }); setNote(''); setMessage('跟进已加入本次会话，尚未保存到服务器。'); }, { disabled: !note.trim() }),
        h('h3', { className: 'timeline-title' }, '跟进时间线'), ...lead.timeline.map((t, i) => h('p', { key: i, className: 'timeline-item' }, t)), !lead.timeline.length && h('p', { className: 'muted' }, '暂无记录'),
        h('h3', null, '关联内容'), ...lead.content.map((c, i) => h('p', { key: i }, c)), !lead.content.length && h('p', { className: 'muted' }, '可在内容工坊关联草稿。'), h(Next, { onClick: () => useCustomer(lead) }, '带入客户需求，查看策略 →')) : h(Section, { title: '客户详情' }, blank('暂无客户记录', '添加客户后，在这里记录需求与下一步安排。'))));
}

function Studio({ draft, setDraft, product, persona, selectedLead, leads, selectLead, link, verification, verify, stale, setStale }) {
  const [feedback, setFeedback] = useState(''); const [revisions, setRevisions] = useState([]); const [msg, setMsg] = useState('');
  const image = creativeImages.find(i => i.id === draft.imageId) || creativeImages.find(i => i.productId === product?.id) || creativeImages[0];
  const [imageData, setImageData] = useState(null); const [imageError, setImageError] = useState('');
  useEffect(() => {
    let active = true; const abort = new AbortController(); setImageData(null); setImageError('');
    fetch(image.src, { signal: abort.signal }).then(r => { if (!r.ok) throw new Error('产品图片暂时无法读取'); return r.blob(); }).then(blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); })).then(data => { if (active) setImageData({ id: image.id, data }); }).catch(e => { if (active && e.name !== 'AbortError') setImageError('图片加载失败，请切换素材后重试。'); });
    return () => { active = false; abort.abort(); };
  }, [image.id, image.src]);
  const selectedImageData = imageData?.id === image.id ? imageData.data : null;
  function change(key, value) { setDraft(d => ({ ...d, [key]: value })); setStale(true); setMsg(''); }
  const channel = channels[draft.platform] || channels.xiaohongshu;
  const svg = posterSvg({ ...draft, product: image.product, imageData: selectedImageData });
  function download() { const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = '营销海报.svg'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMsg('已导出草稿 SVG，内容仍需核验。'); }
  return h(React.Fragment, null, h(Heading, { step: 'D / CONTENT STUDIO', title: '从文字，到可以看见的创意。', text: `当前人群：${(personas[persona]?.name || emptyPersona.name)}。选择平台与图片，实时查看内容效果。` }),
    h('div', { className: 'channel-grid', role: 'group', 'aria-label': '营销平台' }, ...Object.entries(channels).map(([key, c]) => button(h(React.Fragment, null, h('span', { className: `channel-icon ${key}` }, c.icon), h('strong', null, c.name), h('small', null, c.description)), () => change('platform', key), { key, className: `channel-card ${draft.platform === key ? 'selected' : ''}`, 'aria-pressed': draft.platform === key }))),
    h('div', { className: 'studio-layout' }, h('div', null, h(Section, { title: '编辑内容' },
      h(Field, { name: 'studio-platform', label: '内容平台', value: draft.platform, options: channelOptions, onChange: v => change('platform', v) }),
      h(Field, { name: 'studio-template', label: '版式模板', value: draft.template, options: { editorial: '深绿编辑风', warm: '暖色体验卡' }, onChange: v => change('template', v) }),
      h(Field, { name: 'studio-title', label: '标题', value: draft.title, onChange: v => change('title', v) }), h(Field, { name: 'studio-body', label: channel.bodyLabel, multiline: true, value: draft.body, onChange: v => change('body', v) }), h(Field, { name: `studio-extra-${draft.platform}`, label: channel.extraLabel, value: draft.extras?.[draft.platform] ?? channel.extra, onChange: v => change('extras', { ...draft.extras, [draft.platform]: v }) }), h(Field, { name: 'studio-cta', label: '行动引导', value: draft.cta, onChange: v => change('cta', v) })),
      h(Section, { title: '产品图片' }, h('div', { className: 'creative-image-grid', role: 'group', 'aria-label': '产品图片素材' }, ...creativeImages.map(item => button(h(React.Fragment, null, h('img', { src: item.src, alt: item.name }), h('span', null, item.name)), () => change('imageId', item.id), { key: item.id, className: image.id === item.id ? 'selected' : '', 'aria-pressed': image.id === item.id }))), imageError && notice(imageError, 'error')),
      h(Section, { title: '反馈与修订' }, h(Field, { name: 'studio-feedback', label: '告诉我们希望如何调整', value: feedback, multiline: true, onChange: setFeedback }), button('记录修订意见', () => { setRevisions(r => [...r, feedback]); setFeedback(''); setMsg('修订意见已记录在本次会话，尚未提交。'); }, { disabled: !feedback.trim() }), ...revisions.map((r, i) => h('p', { key: i, className: 'timeline-item' }, `反馈 ${i + 1}：${r}`)))),
      h('div', null, h('div', { className: 'preview-toolbar' }, badge(`${channel.name} · 排版预览`), badge(channel.shape)),
        h('img', { className: 'poster-canvas', alt: '营销海报，文案编辑后实时更新', src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` }),
        draft.platform === 'wechat_official' && h(Section, { title: '文章阅读预览' }, h('h2', null, draft.title), h('p', { className: 'muted' }, draft.extras?.wechat_official ?? channels.wechat_official.extra), h('p', { className: 'draft-body' }, draft.body), h('p', null, draft.cta)),
        draft.platform === 'wechat_moments' && h(Section, { title: '朋友圈动态预览' }, h('strong', null, '华为 PC · 产品顾问'), h('p', { className: 'draft-body' }, draft.body), h('div', { className: 'moments-image-grid' }, ...creativeImages.filter(i => i.productId === image.productId).map(i => h('img', { key: i.id, src: i.src, alt: i.name }))), h('p', null, draft.extras?.wechat_moments ?? channels.wechat_moments.extra), h('small', { className: 'muted' }, '刚刚 · 赞 · 评论')),
        h(Section, { title: '证据、图片与核验' }, h('p', null, `当前素材：${image.product} · 官方产品图。`), notice(verification && !stale ? '格式检查完成；事实来源仍待核验。' : '事实来源与内容准确性请在发布前检查。'), button('检查内容格式', verify), h('details', null, h('summary', null, '查看来源与缺失项'), h('p', null, '产品图片来自华为官方产品页面，规格与价格以实际产品资料为准。'))),
        h(Section, { title: '导出与客户关联' }, button('下载草稿 SVG', download, { className: 'primary', disabled: !selectedImageData }), h('p', { className: 'muted' }, '当前为待核验草稿。'), h(Field, { name: 'link-customer', label: '关联客户', value: selectedLead, options: Object.fromEntries(leads.map(l => [l.id, l.name])), onChange: selectLead }), button('关联到客户跟进', () => { link(); setMsg('当前草稿已加入本次会话的客户跟进。'); }), msg && notice(msg)))));
}

export function PipelinePreview({ formal = false, initial = 'products' }) {
  const [screen, setScreen] = useState(initial); const [product, setProduct] = useState(null); const [persona, choosePersona] = useState(0); const [selectionSource, setSource] = useState('系统推荐');
  const [preferences, setPreferences] = useState({ platform: 'xiaohongshu', goal: '到店体验', hint: '' }); const [run, setRun] = useState(null); const [history, setHistory] = useState([]); const [stale, setStale] = useState(true); const [verification, setVerification] = useState(false);
  const [strategyOptions, setStrategyOptions] = useState(defaultStrategy);
  const [leads, setLeads] = useState(initialLeads); const [selectedLead, selectLead] = useState('demo-a'); const [customer, setCustomer] = useState(null);
  const [draft, setDraft] = useState({ platform: 'xiaohongshu', template: 'editorial', title: '把灵感，整理成自己的节奏。', body: '从课堂笔记到日常资料，先找到适合自己的使用方式。\n带上你的常用软件与需求，来一次真实体验。', cta: '预约到店，聊聊你的使用场景' });
  const [catalogState, setCatalogState] = useState({ status: 'loading', products: [] });
  useEffect(() => { pipelineAdapter.listProducts().then(setCatalogState).catch(e => setCatalogState({ status: 'failed', reason: e.message })); }, [formal]);
  useEffect(() => {
    if (run?.status !== 'running') return;
    const timer = setTimeout(() => setRun(r => r.step >= 4 ? { ...r, status: 'complete' } : { ...r, step: r.step + 1 }), 500);
    return () => clearTimeout(timer);
  }, [run]);

  function start(p) {
    setProduct(p); choosePersona(0); setSource('系统推荐'); setVerification(false); setStale(true);
    setStrategyOptions(s => ({ ...s, platform: preferences.platform, goal: preferences.goal }));
    setDraft(d => ({ ...d, imageId: creativeImages.find(i => i.productId === p.id)?.id || creativeImages[0].id, platform: preferences.platform, title: personas[0].angle, body: `${personas[0].need}。\n${preferences.hint || '用真实使用场景开启一次产品体验。'}\n产品事实和图片等待资料核验。`, cta: `欢迎${preferences.goal}` }));
    const item = { id: Date.now(), product: p, ...preferences }; setHistory(all => [...all, item]); setRun({ status: 'running', step: 0 }); setScreen('research');
  }
  function selectPersona(i) { choosePersona(i); setSource('用户选择（非事实确认）'); setStale(true); setDraft(d => ({ ...d, title: personas[i].angle, body: `${personas[i].need}。\n${personas[i].concern}。\n欢迎带着自己的需求到店体验。` })); }
  const content = screen === 'products' ? h(Products, { products, run, start, history, openHistory: item => { setPreferences({ platform: item.platform, goal: item.goal, hint: item.hint }); start(item.product); }, preferences, setPreferences }) :
    screen === 'research' ? h(Research, { persona, setPersona: selectPersona, next: () => setScreen('strategy'), hint: preferences.hint }) :
    screen === 'leads' ? h(Customers, { leads, setLeads, selected: selectedLead, select: selectLead, useCustomer: lead => { setCustomer(lead); setStale(true); setScreen('strategy'); } }) :
    screen === 'strategy' ? h(StrategyEditor, { product, persona: personas[persona], customer, value: strategyOptions, onChange: setStrategyOptions, onAudience: () => setScreen('research'), onApply: value => { setDraft(d => ({ ...d, title: value.message, platform: value.platform, body: `${personas[persona].need}。\n${personas[persona].angle}。\n${value.directionLabel} · ${value.tone}${customer ? `\n客户需求：${customer.needs}` : ''}`, cta: `欢迎${value.goal}` })); setPreferences(p => ({ ...p, platform: value.platform, goal: value.goal })); setStale(true); setScreen('studio'); } }) :
    h(Studio, { draft, setDraft, product, persona, leads, selectedLead, selectLead, stale, setStale, verification, verify: () => { setVerification(true); setStale(false); }, link: () => setLeads(all => all.map(l => l.id === selectedLead ? { ...l, content: [...l.content, `${draft.title}（草稿）`] } : l)) });
  return h('div', { className: 'pipeline-shell' },
    h('aside', { className: 'pipeline-nav' }, h('a', { className: 'wordmark', href: '#/products' }, h('span', { className: 'brand-symbol' }, 'H'), '营销工作台'), h('p', { className: 'nav-label' }, 'YOUR MARKETING FLOW'), h('nav', { 'aria-label': '营销管线' }, ...menu.map(([key, num, label]) => button(h(React.Fragment, null, h('span', null, num), label), () => setScreen(key), { key, className: screen === key ? 'active' : '', 'aria-current': screen === key ? 'page' : undefined }))),
      h('div', { className: 'pipeline-nav-foot' }, h('p', null, '华为 PC · 营销工作台'), h('a', { href: '#/tasks' }, '任务记录 →'), h('a', { href: '#/login', className: 'preview-link' }, '账号管理 →'))),
    h('main', { className: 'pipeline-workspace' }, run && h('section', { className: 'pipeline-progress', 'aria-label': '方案管线状态' }, h('div', { className: 'list-heading' }, h('strong', null, product.name), badge(run.status === 'running' ? '正在生成' : run.status === 'failed' ? '生成未完成' : '生成完成', 'pending')),
        h('div', { className: 'pipeline-steps' }, ...stages.map((s, i) => h('span', { key: s, className: i <= run.step && run.status !== 'failed' ? 'done' : '' }, `${i + 1}. ${s}`))),
        h('small', null, selectionSource), run.status === 'running' && button('中断本次生成', () => setRun(r => ({ ...r, status: 'failed', reason: '本次生成已中断，可从当前阶段继续。' })), { className: 'quiet' }), run.status === 'failed' && h(React.Fragment, null, notice(run.reason || '生成暂未完成，请稍后重试。', 'error'), button('重试当前阶段', () => setRun(r => ({ ...r, status: 'running' }))))), content));
}
