import React, { useEffect, useRef, useState } from 'react';
import { emptyInput, formatTime, platforms, taskRoute, taskStatuses, validateInput } from './model.js';
import { h, button, badge, blank, notice, InputFields } from './ui.js';

function NewTask({ api, onClose, onCreated }) {
  const [value, setValue] = useState({ ...emptyInput }); const [errors, setErrors] = useState({}); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const dialog = useRef(null); const abort = useRef(null);
  useEffect(() => { dialog.current.showModal(); return () => abort.current?.abort(); }, []);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    const validation = validateInput(value); setErrors(validation); if (Object.keys(validation).length) return;
    setBusy(true); setError(''); abort.current = new AbortController();
    try {
      const task = await api.createTask(Object.fromEntries(Object.entries(value).map(([key, text]) => [key, text.trim()])), abort.current.signal);
      if (abort.current.signal.aborted) return;
      if (!task?.id) throw new Error('服务未返回任务编号，请刷新列表确认任务是否创建。');
      onCreated(task);
    } catch (err) { if (err.name !== 'AbortError' && !abort.current.signal.aborted) setError(err.message); }
    finally { if (!abort.current.signal.aborted) setBusy(false); }
  }
  return h('dialog', { ref: dialog, className: 'task-dialog', 'aria-labelledby': 'new-task-title', onCancel: event => { if (busy) event.preventDefault(); else onClose(); } },
    h('div', { className: 'dialog-heading' }, h('div', null, h('p', { className: 'eyebrow' }, 'NEW MARKETING TASK'), h('h2', { id: 'new-task-title' }, '创建营销任务')), button('关闭', onClose, { disabled: busy, className: 'quiet' })),
    h('p', { className: 'muted' }, '先说清产品、场景和目标，画像与内容将在工作台逐步完成。'), error && notice(error, 'error'),
    h('form', { onSubmit: submit }, h(InputFields, { value, setValue, errors, disabled: busy }), h('div', { className: 'actions' }, button('取消', onClose, { disabled: busy }), h('button', { className: 'primary', type: 'submit', disabled: busy }, busy ? '正在创建…' : '创建并进入工作台  →'))));
}
export function Tasks({ api, onCreated }) {
  const [tasks, setTasks] = useState([]); const [filter, setFilter] = useState('all'); const [state, setState] = useState('loading'); const [error, setError] = useState(''); const [reload, setReload] = useState(0); const [creating, setCreating] = useState(false);
  useEffect(() => {
    const abort = new AbortController(); setState('loading'); setTasks([]); setError('');
    api.tasks(abort.signal).then(items => { if (!abort.signal.aborted) { if (!Array.isArray(items)) throw new Error('任务数据格式不正确。'); setTasks(items); setState('ready'); } })
      .catch(err => { if (!abort.signal.aborted) { setError(err.message); setState('error'); } });
    return () => abort.abort();
  }, [api, reload]);
  const filtered = tasks.filter(task => filter === 'all' || task.status === filter);
  return h(React.Fragment, null,
    h('header', { className: 'page-heading' }, h('div', null, h('p', { className: 'eyebrow' }, 'YOUR MARKETING DESK'), h('h1', null, '每个好内容，从一个任务开始'), h('p', { className: 'muted' }, '围绕产品与场景，组织有依据的营销表达。')), button('＋ 创建营销任务', () => setCreating(true), { className: 'primary' })),
    h('section', { className: 'overview' }, h('div', null, h('span', { className: 'overview-index' }, '01 / WORKFLOW'), h('h2', null, '一条清晰的内容工作流'), h('p', null, '产品依据 → 客群画像 → 营销策略 → 平台内容 → 逐项核验')), h('span', { className: 'outline-mark', 'aria-hidden': true }, '↗')),
    h('section', { className: 'panel' }, h('div', { className: 'list-heading' }, h('h2', null, '我的任务', state === 'ready' && h('span', { className: 'count' }, tasks.length)), h('div', { className: 'inline-controls' }, h('label', { htmlFor: 'status-filter', className: 'muted' }, '状态'), h('select', { id: 'status-filter', value: filter, onChange: e => setFilter(e.target.value) }, h('option', { value: 'all' }, '全部状态'), ...Object.entries(taskStatuses).map(([key, text]) => h('option', { key, value: key }, text))), button('刷新', () => setReload(n => n + 1), { disabled: state === 'loading' }))),
      state === 'loading' ? notice('正在读取你的任务…') : state === 'error' ? notice(error, 'error') : !filtered.length ? blank(tasks.length ? '这个状态下还没有任务' : '开始你的第一个营销任务', '创建任务，明确产品、人群与内容目标。') :
        h('div', { className: 'task-list' }, ...filtered.map(task => h('a', { key: task.id, className: 'task-row', href: taskRoute(task.id) }, h('span', { className: 'task-icon', 'aria-hidden': true }, '↗'), h('div', { className: 'task-copy' }, h('h3', null, task.resolved_product_name || task.product_query), h('p', null, `${platforms[task.platform] || '平台待确认'} · ${task.audience_hint || '人群待确认'}`)), h('div', { className: 'task-meta' }, badge(taskStatuses[task.status] || '状态待确认'), h('small', null, formatTime(task.updated_at))))))),
    creating && h(NewTask, { api, onClose: () => setCreating(false), onCreated }));
}
