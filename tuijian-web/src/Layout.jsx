import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Clock, FileText, LogOut, Package, PenLine, Users, Library, Workflow, ChevronDown, Settings, X } from 'lucide-react';
import { getUser, logout, updateUser } from './auth.js';
import { useEffect, useRef, useState } from 'react';
import { STEPS, useCompose } from './compose.jsx';
import ScrollTop from './pages/ScrollTop.jsx';
import './settings.css';

const NAV = [
  { to: '/create/product', match: ['/create'], label: '营销图文', icon: PenLine, steps: true },
  { to: '/products', match: ['/products'], label: '产品管理', icon: Package },
  { to: '/audiences', match: ['/audiences'], label: '客户管理', icon: Users },
  { to: '/materials', match: ['/materials'], label: '素材管理', icon: Library },
  { to: '/history', match: ['/history'], label: '历史记录', icon: Clock },
  { to: '/workflows', match: ['/workflows'], label: 'AI 工作流', icon: Workflow },
];

// 营销图文的二级步骤，每步下面显示已选内容
function ComposeSteps() {
  const c = useCompose();
  const values = {
    product: c.product?.short,
    audience: c.audience ? `${c.audience.name}${c.audienceAuto?' · AI 判断':''}` : '不指定，AI 判断',
    platform: c.platform?.name,
    topic: c.topicNames.join('、') || (c.extra && '已写其他要求'),
  };

  return (
    <ol className="steps">
      {STEPS.map((s) => {
        const v = values[s.key];
        const empty = !v || (s.key === 'audience' && !c.audience);
        return (
          <li key={s.key}>
            <NavLink to={s.path} className="step-link">
              <span className="step-no">{s.no}</span>
              <span className="step-label">{s.label}</span>
              <span className={`step-value${empty ? ' is-empty' : ''}`}>
                {v || (s.key === 'topic' ? '可不填' : '未选')}
              </span>
            </NavLink>
          </li>
        );
      })}
    </ol>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [accountOpen,setAccountOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false),[user,setUser]=useState(getUser()||'用户');
  const [profile,setProfile]=useState(()=>{try{return JSON.parse(localStorage.getItem('tuijian_profile')||'{}')}catch{return {}}});
  const [llm,setLlm]=useState({model:'',baseUrl:'',key:'',keepKey:false,hasCustomKey:false,defaultModel:'',defaultConfigured:false});
  const [settingsBusy,setSettingsBusy]=useState(false),[settingsMessage,setSettingsMessage]=useState('');
  const accountRef=useRef(null);
  useEffect(()=>{if(!settingsOpen)return;setSettingsMessage('');fetch('/api/settings/llm',{cache:'no-store'}).then(r=>r.json()).then(data=>setLlm(s=>({...s,...data,key:'',keepKey:data.hasCustomKey}))).catch(()=>setSettingsMessage('读取模型配置失败'));},[settingsOpen]);
  useEffect(()=>{setAccountOpen(false);},[pathname]);
  useEffect(()=>{
    if(!accountOpen)return;
    const outside=e=>{if(!accountRef.current?.contains(e.target))setAccountOpen(false);};
    const escape=e=>{if(e.key==='Escape'){setAccountOpen(false);accountRef.current?.querySelector('button')?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[accountOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  async function saveSettings(e){e.preventDefault();const form=e.currentTarget;const name=(form.elements.username.value||'用户').trim();const nextProfile={title:form.elements.title.value,department:form.elements.department.value,bio:form.elements.bio.value};setSettingsBusy(true);setSettingsMessage('');try{
    const response=await fetch('/api/settings/llm',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...llm,keepKey:llm.keepKey&&!llm.key})});const data=await response.json();if(!response.ok)throw new Error(data.error||'模型设置保存失败');
    updateUser(name);setUser(name);localStorage.setItem('tuijian_profile',JSON.stringify(nextProfile));setProfile(nextProfile);setLlm(s=>({...s,...data,key:'',keepKey:data.hasCustomKey}));setSettingsMessage('设置已保存；后续新生成任务会使用当前模型配置。');
  }catch(err){setSettingsMessage(err.message||'保存失败，请重试');}finally{setSettingsBusy(false);}}
  async function resetModel(){setSettingsBusy(true);try{const response=await fetch('/api/settings/llm',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({reset:true})});const data=await response.json();if(!response.ok)throw new Error(data.error||'恢复默认失败');setLlm(s=>({...s,...data,key:'',keepKey:false}));setSettingsMessage('已恢复使用默认模型。');}catch(err){setSettingsMessage(err.message);}finally{setSettingsBusy(false);}}

  return (
    <div className={`shell${pathname.startsWith('/create') ? ' is-compose' : ''}`}>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="推鉴 · AI 营销助手">
          <span className="brand-seal" aria-hidden="true">鉴</span>
          <span className="brand-name">推鉴</span>
          <span className="brand-sub">AI 营销助手</span>
        </Link>

        <div className="account-menu" ref={accountRef}>
          <button type="button" className="account-trigger" aria-label={`${user}，账户选项`} aria-expanded={accountOpen} aria-controls={accountOpen ? 'account-options' : undefined} onClick={()=>setAccountOpen(open=>!open)}>
            <img className="account-avatar" src="/user-avatar.svg" alt=""/>
            <span className="account-name" title={user}>{user}</span><ChevronDown size={15} aria-hidden="true"/>
          </button>
          {accountOpen&&<div className="account-popover" id="account-options"><span className="account-popover-name">{user}</span><button type="button" onClick={()=>{setAccountOpen(false);setSettingsOpen(true);}}><Settings size={15} aria-hidden="true"/>设置</button><button type="button" onClick={()=>{setAccountOpen(false);handleLogout();}}><LogOut size={15} aria-hidden="true"/>退出登录</button></div>}
        </div>
      </header>

      <aside className="side">
        <nav aria-label="主导航">
          {[
            NAV[0],
            ...(pathname.startsWith('/result/')
              ? [{ to: pathname, match: ['/result/'], label: '生成结果', icon: FileText }]
              : []),
          ...NAV.slice(1),
          ].map((item) => {
            const Icon = item.icon;
            const active = item.match.some((m) => pathname.startsWith(m));
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  className={`nav-item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  {item.label}
                </Link>
                {item.steps && pathname.startsWith('/create') && <ComposeSteps />}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        {pathname.startsWith('/create')&&<nav className="mobile-steps" aria-label="创作步骤"><ComposeSteps/></nav>}
        <div className="main-inner"><Outlet /></div>
      </main>
      {settingsOpen&&<div className="settings-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false);}}><section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><header><div><span>ACCOUNT · PREFERENCES</span><h2 id="settings-title">用户设置</h2></div><button type="button" aria-label="关闭设置" onClick={()=>setSettingsOpen(false)}><X size={19}/></button></header><form onSubmit={saveSettings}><div className="settings-grid"><label>用户名<input name="username" defaultValue={user} maxLength={40}/></label><label>职位<input name="title" defaultValue={profile.title||''} placeholder="例如：市场经理" maxLength={60}/></label><label>部门<input name="department" defaultValue={profile.department||''} placeholder="例如：产品市场部" maxLength={60}/></label><label className="settings-wide">个人简介<input name="bio" defaultValue={profile.bio||''} placeholder="介绍一下自己" maxLength={120}/></label></div><div className="settings-divider"/><div className="settings-section-title"><div><span>MODEL · API</span><h3>大模型配置</h3></div><button type="button" className="settings-reset" onClick={resetModel} disabled={settingsBusy}>恢复默认模型</button></div><div className="settings-grid"><label>模型名称<input value={llm.model} onChange={e=>setLlm(s=>({...s,model:e.target.value}))} placeholder={llm.defaultModel||'例如：DeepSeek V4 Flash'}/></label><label>模型服务地址<input value={llm.baseUrl} onChange={e=>setLlm(s=>({...s,baseUrl:e.target.value}))} placeholder="留空使用默认服务"/></label><label className="settings-wide">访问密钥<input type="password" autoComplete="new-password" value={llm.key} onChange={e=>setLlm(s=>({...s,key:e.target.value,keepKey:false}))} placeholder={llm.hasCustomKey?'已保存密钥，留空表示保持不变':'如需使用自己的模型服务，请填写访问密钥'}/></label></div><p className="settings-hint">模型名称、服务地址或访问密钥不填写时，将继续使用默认模型服务{llm.defaultModel?`（${llm.defaultModel}）`:''}。自定义密钥仅用于连接你填写的模型服务地址，保存后不会再次显示。</p>{settingsMessage&&<p className="settings-message" role="status">{settingsMessage}</p>}<footer><button type="button" className="btn-ghost" onClick={()=>setSettingsOpen(false)}>取消</button><button type="submit" className="btn-primary" disabled={settingsBusy}>{settingsBusy?'保存中…':'保存设置'}</button></footer></form></section></div>}
      <ScrollTop />
    </div>
  );
}
