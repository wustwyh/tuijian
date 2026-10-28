import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await measure(session, "http://localhost:5173/history", {width: 1920, height: 1080, settle: 1200, ready: ".history-card", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const info = await session.evaluate(`(() => {
    const h1 = document.querySelector('.history-head h1');
    const h1s = getComputedStyle(h1);
    const stat = document.querySelector('.history-stat');
    const sb = stat.getBoundingClientRect();
    const icon = stat.querySelector('.history-stat-icon').getBoundingClientRect();
    const num = stat.querySelector('.history-stat-num').getBoundingClientRect();
    const active = document.querySelector('.history-filter.is-active');
    return JSON.stringify({
      h1Bg: h1s.backgroundImage.slice(0, 50),
      h1Fill: h1s.webkitTextFillColor,
      h1Color: h1s.color,
      h1Size: h1s.fontSize,
      statH: Math.round(sb.height), iconW: Math.round(icon.width), numLeft: Math.round(num.left), statLeft: Math.round(sb.left),
      iconAboveNum: icon.top < num.top,
      filterActive: getComputedStyle(active).backgroundColor + ' / ' + getComputedStyle(active).color,
      newBtn: document.querySelector('.history-new')?.textContent,
      toolbarVisible: !!document.querySelector('.history-toolbar'),
    });
  })()`);
  console.log(info);
} finally { close(); }
