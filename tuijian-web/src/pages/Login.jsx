import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, User, ArrowRight, Sparkles, Play } from 'lucide-react';
import { getUser, login } from '../auth.js';
import './login.css';

// 仅记录账号名；密码只用于表单输入，不校验、不存储。
export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  if (getUser()) return <Navigate to="/" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;
    login(name.trim());
    setPassword('');
    navigate(location.state?.from || '/', { replace: true });
  };

  return (
    <div className="login-page">
      <header className="login-brand">
        <span className="brand-seal" aria-hidden="true">鉴</span>
        <span className="brand-name">推鉴</span>
        <span className="login-brand-divider" />
        <span>AI 营销助手</span>
      </header>
      <main className="login-layout">
        <section className="login-story" aria-label="产品介绍">
          <div className="login-orbit orbit-one" aria-hidden="true" />
          <div className="login-orbit orbit-two" aria-hidden="true" />
          <span className="login-kicker"><Sparkles size={16} /> 华为 PC 门店营销智能体</span>
          <h1>好产品，<br />值得被看见。</h1>
          <p className="login-intro">从产品亮点到动人表达，<br />让每一次分享，都成为心动的开始。</p>
          <div className="login-showcase" aria-hidden="true">
            <div className="login-glass glass-back"><span>有据可依</span><strong>产品知识</strong><div className="visual-lines"><i /><i /><i /></div></div>
            <div className="login-glass glass-front">
              <span className="showcase-label">推鉴，为好产品写下一种可能</span>
              <div className="visual-laptop"><div className="laptop-screen"><span>灵感，<br />即刻绽放。</span></div><div className="laptop-base" /></div>
              <div className="showcase-bottom"><strong>让灵感变成好内容</strong><span><Sparkles size={14} /> AI 创作</span></div>
            </div>
            <div className="login-floating"><span className="floating-dot" /> 产品 · 客户 · 平台 · 风格</div>
          </div>
        </section>
        <section className="login-form-wrap">
          <form className="login-form" onSubmit={handleSubmit}>
            <img className="login-user-avatar" src="/user-avatar.svg" alt="用户头像"/>
            <h2>欢迎回来</h2>
            <p className="login-subtitle">登录推鉴，开启你的创作时刻</p>
            <div className="login-cred">
              <span className="login-cred-label">测试账号</span>
              <code>admin</code>
              <span className="login-cred-label">密码</span>
              <code>admin123456789</code>
              <button
                type="button"
                className="login-cred-fill"
                onClick={() => { setName('admin'); setPassword('admin123456789'); }}
              >填入</button>
            </div>
            <label className="login-field">
              <span>账号</span>
              <div className="login-input"><User size={19} aria-hidden="true" /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入账号" autoComplete="username" required autoFocus /></div>
            </label>
            <label className="login-field">
              <span>密码</span>
              <div className="login-input"><LockKeyhole size={19} aria-hidden="true" /><input type={visible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" autoComplete="off" required /><button type="button" className="password-toggle" aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
            </label>
            <button type="submit" className="btn-primary login-submit" disabled={!name.trim() || !password.trim()}>登录并开始创作 <ArrowRight size={19} aria-hidden="true" /></button>
            <div className="login-form-footer"><span /> 让每一句推荐，都有产品的底气 <span /></div>
          </form>
        </section>
      </main>
      <footer className="login-footer">推鉴 · AI 营销助手</footer>
      <Link
        className="pitch-entry"
        to="/pitch"
        title="打开决赛路演放映（← → 翻页，F 全屏，Esc 退出）"
      >
        <Play size={15} aria-hidden="true" />
        路演放映
      </Link>
    </div>
  );
}
