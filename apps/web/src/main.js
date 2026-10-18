import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createApi } from './api.js';
import { integration } from './integration.js';
import { routeFromHash, taskRoute } from './model.js';
import { h, go, button, blank, notice, Section } from './ui.js';
import { Tasks } from './Tasks.js';
import { Workbench } from './Workbench.js';
import './styles.css';

function Login({ api, initialError, onLogin, blocked }) {
  const [account, setAccount] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const abort = useRef(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function submit(event) {
    event.preventDefault(); if (busy || blocked) return;
    setBusy(true); setError(''); abort.current = new AbortController();
    try {
      const user = await api.login({ account: account.trim(), password }, abort.current.signal);
      if (abort.current.signal.aborted) return;
      if (!user?.id) throw new Error('账号服务尚未返回有效身份，请联系演示负责人。');
      setPassword(''); onLogin(user);
    } catch (err) { if (err.name !== 'AbortError' && !abort.current.signal.aborted) setError(err.message); }
    finally { if (!abort.current.signal.aborted) setBusy(false); }
  }
  return h('div', { className: 'login-layout' },
    h('section', { className: 'login-story' }, h('div', { className: 'wordmark' }, h('span', { className: 'brand-symbol' }, 'H'), '华为 PC · 营销工作台'),
      h('div', { className: 'story-copy' }, h('p', { className: 'eyebrow' }, '从产品事实，到有说服力的表达'), h('h1', null, '把好产品，', h('br'), '讲给对的人。'), h('p', null, '找依据、定人群、写内容、做核验。', h('br'), '让每一次营销，都有据可循。'), h('div', { className: 'process' }, '01  查找依据', h('span', null, '→'), '02  形成策略', h('span', null, '→'), '03  生成内容')),
      h('p', { className: 'story-foot' }, 'HUAWEI PC / 营销智能体 DEMO')),
    h('main', { className: 'login-main' }, h('div', { className: 'login-card' }, h('p', { className: 'eyebrow' }, '你的营销工作，从这里开始'), h('h2', null, '登录工作台'), h('p', { className: 'muted' }, '登录后查看和管理自己的营销任务。'),
      (error || initialError) && notice(error || initialError, 'error'),
      h('form', { onSubmit: submit }, h('div', { className: 'field' }, h('label', { htmlFor: 'account' }, '账号'), h('input', { id: 'account', autoComplete: 'username', value: account, required: true, disabled: busy || blocked, onChange: e => setAccount(e.target.value) })),
        h('div', { className: 'field' }, h('label', { htmlFor: 'password' }, '密码'), h('input', { id: 'password', type: 'password', autoComplete: 'current-password', value: password, required: true, disabled: busy || blocked, onChange: e => setPassword(e.target.value) })),
        h('button', { className: 'primary full', disabled: busy || blocked, type: 'submit' }, busy ? '正在登录…' : '登录并开始工作  →')),
      h('p', { className: 'login-note' }, '需要新账号？请联系演示负责人开通。'))));
}
function Shell({ user, route, api, onLogout, error }) {
  return h('div', { className: 'app-layout' }, h('aside', { className: 'sidebar' },
    h('a', { className: 'wordmark', href: '#/tasks' }, h('span', { className: 'brand-symbol' }, 'H'), h('span', null, '华为 PC', h('small', null, '营销工作台'))), h('p', { className: 'nav-label' }, 'WORKSPACE'),
    h('nav', { 'aria-label': '主导航' }, h('a', { href: '#/tasks', className: route.page !== 'leads' ? 'active' : '', 'aria-current': route.page !== 'leads' ? 'page' : undefined }, '◫  营销任务'), h('a', { href: '#/leads', className: route.page === 'leads' ? 'active' : '', 'aria-current': route.page === 'leads' ? 'page' : undefined }, '◎  客户跟进')),
    h('div', { className: 'sidebar-bottom' }, h('p', null, user.display_name || '当前营销员'), button('退出登录', onLogout, { className: 'logout' }), h('small', null, 'HUAWEI PC / DEMO'))),
    h('main', { className: 'workspace' }, error && notice(error, 'error'), route.page === 'workbench' ? h(Workbench, { api, taskId: route.id, key: route.id }) : route.page === 'leads' ? h(Section, { title: '客户跟进' }, blank('跟进功能将在后续批次接入', '演示仅使用虚构客户。当前批次先完成营销任务工作台。')) : h(Tasks, { api, onCreated: task => go(taskRoute(task.id)) })));
}
function App() {
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash)); const [user, setUser] = useState(null); const [checking, setChecking] = useState(true); const [error, setError] = useState(''); const [logoutBusy, setLogoutBusy] = useState(false); const [sessionEpoch, setSessionEpoch] = useState(0);
  const expire = useCallback(() => { setUser(null); setSessionEpoch(n => n + 1); setError('登录状态已失效，请重新登录。'); go('#/login'); }, []);
  const api = React.useMemo(() => createApi({ integration, onUnauthorized: expire }), [expire]);
  useEffect(() => { const change = () => setRoute(routeFromHash(window.location.hash)); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  useEffect(() => {
    const abort = new AbortController();
    api.session(abort.signal).then(current => { if (!abort.signal.aborted) { if (current && !current.id) throw new Error('账号身份无法确认，请重新登录。'); setUser(current); } })
      .catch(err => { if (!abort.signal.aborted && err.name !== 'AbortError') setError(err.message); }).finally(() => { if (!abort.signal.aborted) setChecking(false); });
    return () => abort.abort();
  }, [api]);
  useEffect(() => { if (!checking && !user && route.page !== 'login') go('#/login'); if (!checking && user && route.page === 'login') go('#/tasks'); }, [checking, user, route.page]);
  async function logout() {
    // Immediately unmount private pages and cancel their reads before server logout.
    setLogoutBusy(true); setUser(null); setSessionEpoch(n => n + 1); go('#/login');
    try { await api.logout(); setError(''); } catch (err) { setError(`本地页面已退出，但服务端退出未确认：${err.message}`); } finally { setLogoutBusy(false); }
  }
  if (checking) return h('main', { className: 'session-loading' }, notice('正在确认登录状态…'));
  if (!user) return h(Login, { key: sessionEpoch, api, blocked: logoutBusy, initialError: logoutBusy ? '正在结束上一次会话，请稍候。' : error, onLogin: current => { setError(''); setUser(current); go('#/tasks'); } });
  return h(Shell, { key: `${user.id}-${sessionEpoch}`, user, route, api, onLogout: logout, error });
}
createRoot(document.getElementById('root')).render(h(App));
