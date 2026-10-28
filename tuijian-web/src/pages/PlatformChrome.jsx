import {chromeTopHtml, chromeBottomHtml} from '../platform-chrome.js';
import {CHROME_CSS} from '../chrome-css.js';

// 预览用：结构与导出 HTML 完全一致，只是渲染成 React 元素。
const parts = (html) => ({__html: html});

export function ChromeTop({kind, info}) {
  return <div className="pf-chrome" dangerouslySetInnerHTML={parts(chromeTopHtml(kind, info))} />;
}

export function ChromeBottom({kind, info}) {
  return <div className="pf-chrome" dangerouslySetInnerHTML={parts(chromeBottomHtml(kind, info))} />;
}

// 外壳样式只在预览里挂一次（导出 HTML 自带同一份 CHROME_CSS）。
export function ChromeStyle() {
  return <style data-pf-chrome="">{CHROME_CSS}</style>;
}
