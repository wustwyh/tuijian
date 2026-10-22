import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { buildPublishDoc, downloadPublishHtml } from '../export.js';
import './publish-preview.css';

// 结果页的「预览发布稿」弹窗：把导出的那份自包含 HTML 直接渲染在 iframe 里，
// 不用先下载再打开文件；弹窗里也能直接下载同样的 HTML。
export default function PublishPreview({ job, onClose }) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const size = useMemo(() => (html ? `${(html.length / 1024 / 1024).toFixed(1)} MB` : ''), [html]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    buildPublishDoc(job)
      .then((doc) => { if (alive) { setHtml(doc); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e.message || '发布稿生成失败'); setLoading(false); } });
    return () => { alive = false; };
  }, [job]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  async function download() {
    if (downloading) return;
    setDownloading(true);
    try { await downloadPublishHtml(job); } finally { setDownloading(false); }
  }

  return (
    <div className="pp-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pp-dialog" role="dialog" aria-modal="true" aria-label="发布稿预览">
        <header className="pp-head">
          <div className="pp-title">
            <strong>发布稿预览</strong>
            <span>{job.summary.platform} · {job.summary.product}{size ? ` · ${size}` : ''}</span>
          </div>
          <div className="pp-actions">
            <button type="button" className="btn-ghost" onClick={download} disabled={loading || Boolean(error)}>
              <Download size={15} />{downloading ? '正在下载…' : '下载 HTML'}
            </button>
            <button type="button" className="pp-close" onClick={onClose} aria-label="关闭预览">
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="pp-body">
          {loading && <p className="pp-state">正在排版发布稿…（图片要内嵌成 base64，稍等一两秒）</p>}
          {error && <p className="pp-state pp-error">{error}</p>}
          {!loading && !error && (
            <iframe className="pp-frame" title="发布稿预览" srcDoc={html} sandbox="allow-same-origin" />
          )}
        </div>
        <footer className="pp-foot">
          <span>这就是下载到的那份 HTML，排版、字号、图片位置都一样；只想看效果或截图时不用再下载。</span>
          <span className="pp-foot-tip"><ExternalLink size={12} />按 Esc 或点空白处关闭</span>
        </footer>
      </div>
    </div>
  );
}
