import React, { useEffect, useRef, useState } from 'react';
import { formatTime, safeSource, tabs, taskInput, verificationLabel } from './model.js';
import { h, list, button, badge, blank, notice, textList, Section, InputFields } from './ui.js';
import { ContentPreview, ExportEntry } from './ContentPreview.js';

function Evidence({ api, taskId }) {
  const [items, setItems] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [reload, setReload] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setItems([]); setError('');
    api.evidence(taskId, abort.signal).then(value => { if (!abort.signal.aborted) { if (!Array.isArray(value)) throw new Error('证据数据格式不正确。'); setItems(value); } })
      .catch(err => { if (!abort.signal.aborted) setError(err.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [api, taskId, reload]);
  return h(Section, { title: '知识依据 · 线上 ima' }, loading ? notice('正在读取证据…') : error ? h(React.Fragment, null, notice(error, 'error'), button('重新读取', () => setReload(n => n + 1))) : !items.length ? blank('尚无产品证据', '取得线上 ima 的事实与图片依据后，可在这里查看来源。') :
    h('div', { className: 'evidence-list' }, ...items.map(item => h('article', { className: 'evidence', key: item.id }, h('div', { className: 'list-heading' }, h('h3', null, item.title || '来源标题待确认'), badge(verificationLabel(item.verification_status), item.verification_status)),
      h('p', null, item.fact_excerpt || (item.media_type === 'IMG' ? '图片条目 · 图片预览待接通' : '事实摘要待确认')),
      h('dl', null, h('dt', null, '适用型号'), h('dd', null, item.applicable_model || '待人工核验'), h('dt', null, '条目 ID'), h('dd', null, item.media_id || '待人工核验'), h('dt', null, '知识库'), h('dd', null, item.knowledge_base_id || '待人工核验'), h('dt', null, '读取时间'), h('dd', null, formatTime(item.fetched_at))),
      safeSource(item.source_url) ? h('a', { href: safeSource(item.source_url), target: '_blank', rel: 'noopener noreferrer' }, '打开来源 ↗') : h('p', { className: 'muted' }, '可访问的线上来源地址待确认')))));
}
function Personas({ report }) {
  return h(Section, { title: '客群画像' }, !report ? blank('画像尚未生成', '先明确产品版本并取得依据，再生成候选人群。') : h(React.Fragment, null,
    notice('人群判断属于营销假设；画像选择与确认功能待接通。'),
    ...list(report.personas).map((persona, index) => h('article', { className: 'persona', key: index }, h('h3', null, persona.name), h('p', null, persona.content_angle),
      ...[['典型任务', 'typical_tasks'], ['痛点', 'pain_points'], ['购买触发点', 'buying_triggers'], ['主要顾虑', 'objections'], ['营销假设', 'assumptions'], ['待确认', 'pending_checks'], ['证据引用', 'evidence_ids']].map(([label, key]) => h('div', { key }, h('h4', null, label), textList(persona[key])))))));
}
function Strategy({ strategy }) {
  return h(Section, { title: '营销策略' }, !strategy ? blank('策略尚未生成', '确认主画像后，围绕一个主矛盾组织内容与行动引导。') : h(React.Fragment, null,
    h('p', { className: 'eyebrow' }, '本次主矛盾'), h('h3', null, strategy.main_conflict), h('p', null, strategy.key_message), h('h4', null, '主要人群'), h('p', null, strategy.primary_persona),
    h('h4', null, '论据与结构'), textList(strategy.proof_points), textList(strategy.outline), h('h4', null, '行动引导'), h('p', null, strategy.cta), h('h4', null, '风险提醒'), textList(strategy.risk_notes)));
}
function Verification({ report }) {
  return h(Section, { title: '核验结果' }, !report ? blank('尚无核验结果', '未知项不会自动视为通过；导出将在核验规则确定后接通。') : h(React.Fragment, null,
    badge(verificationLabel(report.overall_status), report.overall_status),
    ...list(report.checks).map((check, index) => h('article', { key: index, className: 'check' }, h('div', { className: 'list-heading' }, h('h3', null, check.item), badge(verificationLabel(check.status), check.status)), h('p', null, check.reason || '核验原因待确认'), h('small', null, `证据：${list(check.evidence_ids).join('、') || '待人工核验'}`))),
    h('h4', null, '人工确认清单'), textList(report.manual_actions)), h(ExportEntry));
}
export function Workbench({ api, taskId }) {
  const [detail, setDetail] = useState(null); const [tab, setTab] = useState(0); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [reload, setReload] = useState(0);
  const tabRefs = useRef([]);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setDetail(null); setError('');
    api.task(taskId, abort.signal).then(next => {
      if (!abort.signal.aborted) {
        if (!next?.task?.id || next.task.id !== taskId) throw new Error('服务未返回对应任务，无法打开工作台。');
        setDetail(next);
      }
    }).catch(err => { if (!abort.signal.aborted) setError(err.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [api, taskId, reload]);
  const changeTab = index => { setTab(index); tabRefs.current[index]?.focus(); };
  function tabKey(event) {
    const next = event.key === 'ArrowRight' ? (tab + 1) % tabs.length : event.key === 'ArrowLeft' ? (tab + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next !== null) { event.preventDefault(); changeTab(next); }
  }
  return h(React.Fragment, null,
    h('header', { className: 'page-heading' }, h('div', null, h('a', { className: 'back-link', href: '#/tasks' }, '← 返回任务列表'), h('h1', null, detail?.task?.resolved_product_name || detail?.task?.product_query || '任务工作台'), h('p', { className: 'muted' }, '从场景到成稿，让每一步都可追溯。')), button('重新读取', () => setReload(n => n + 1), { disabled: loading })),
    error && notice(error, 'error'),
    h('nav', { className: 'tabs', role: 'tablist', 'aria-label': '任务工作台' }, ...tabs.map((text, index) => h('button', { key: text, ref: element => { tabRefs.current[index] = element; }, id: `tab-${index}`, role: 'tab', 'aria-selected': tab === index, 'aria-controls': `panel-${index}`, tabIndex: tab === index ? 0 : -1, onClick: () => setTab(index), onKeyDown: tabKey }, h('span', { className: 'tab-number' }, `0${index + 1}`), text))),
    loading ? notice('正在读取任务及结果…') : !detail ? blank('暂时无法打开任务', '请重新读取，或返回列表选择自己的任务。') : h('div', { id: `panel-${tab}`, role: 'tabpanel', 'aria-labelledby': `tab-${tab}`, tabIndex: 0 },
      tab === 0 && h(React.Fragment, null, h(Section, { title: '场景判断' }, h('p', { className: 'muted' }, '平台、人群、场景与目标动作，决定这次内容的表达。'), h(InputFields, { value: taskInput(detail.task), disabled: true }), notice('当前任务输入只读。如需更换人群或平台，请创建新任务。')), h(Evidence, { key: `${taskId}-${reload}`, api, taskId })),
      tab === 1 && h(Personas, { report: detail.personas }), tab === 2 && h(Strategy, { strategy: detail.strategy }), tab === 3 && h(ContentPreview, { contents: detail.contents, onViewEvidence: () => changeTab(0) }), tab === 4 && h(Verification, { report: detail.verification })));
}
