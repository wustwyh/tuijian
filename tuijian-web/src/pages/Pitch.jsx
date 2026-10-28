import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import slides from '../pitch/slides.js';
import '../pitch/deck.css';

const TOTAL = slides.length;

function bgFor(node) {
  if (!node) return '#f4f5f7';
  if (node.classList.contains('halves')) {
    return 'linear-gradient(90deg,#ffffff 0 50%,#1b2129 50% 100%)';
  }
  if (node.classList.contains('dark')) return '#14171b';
  return '#f4f5f7';
}

/**
 * 决赛路演放映（/pitch）。
 * 画布固定 1920×1080，按视口等比缩放；← → 翻页，F 全屏，Esc 退出。
 */
export default function Pitch() {
  const deckRef = useRef(null);
  const nodesRef = useRef([]);
  const [cur, setCur] = useState(0);
  const [scale, setScale] = useState(1);
  const navigate = useNavigate();

  // 注入幻灯片、按窗口比例缩放、接管页面底色
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return undefined;
    deck.innerHTML = slides.join('');
    nodesRef.current = [...deck.querySelectorAll('.slide')];

    const fit = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    };
    fit();
    window.addEventListener('resize', fit);

    const prevBg = document.body.style.background;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('resize', fit);
      document.body.style.background = prevBg;
      document.body.style.overflow = prevOverflow;
      deck.innerHTML = '';
      nodesRef.current = [];
    };
  }, []);

  const go = useCallback((next) => {
    setCur((c) => {
      const target = typeof next === 'function' ? next(c) : next;
      return Math.max(0, Math.min(TOTAL - 1, target));
    });
  }, []);

  // 切页：同步 .on 与页面底色
  useEffect(() => {
    nodesRef.current.forEach((n, i) => n.classList.toggle('on', i === cur));
    document.body.style.background = bgFor(nodesRef.current[cur]);
    if (window.location.hash !== `#${cur + 1}`) {
      window.history.replaceState(null, '', `#${cur + 1}`);
    }
  }, [cur]);

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) {
        e.preventDefault();
        go((c) => c + 1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) {
        e.preventDefault();
        go((c) => c - 1);
      } else if (k === 'Home') {
        go(0);
      } else if (k === 'End') {
        go(TOTAL - 1);
      } else if (k.toLowerCase() === 'f') {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      } else if (k === 'Escape') {
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, navigate]);


  const onClick = (e) => {
    if (e.detail === 0) return;
    go(e.clientX < window.innerWidth * 0.22 ? (c) => c - 1 : (c) => c + 1);
  };

  return (
    <div className="pitch-root" onClick={onClick} role="presentation">
      <div className="pt-deck" ref={deckRef} style={{ transform: `translate(-50%,-50%) scale(${scale})` }} />
      <div className="pt-bar" style={{ width: `${((cur + 1) / TOTAL) * 100}%` }} />
      <div className="pt-pno">{`${cur + 1} / ${TOTAL}`}</div>
      <div className="pt-hud">← → 翻页 · F 全屏 · Esc 退出</div>
    </div>
  );
}
