import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  await measure(session, "http://localhost:5173/history", {width: 1920, height: 1080, settle: 1500, ready: ".history-card", init: ["localStorage.setItem('tuijian_user','演示账号')"]});
  const info = await session.evaluate(`(() => {
    const card = document.querySelector('.history-card');
    const before = getComputedStyle(card, '::before');
    const stat = document.querySelector('.history-stat.is-active') || document.querySelector('.history-stat');
    const chip = document.querySelector('.history-platform');
    const badge = document.querySelector('.history-card .result-badge');
    return JSON.stringify({
      cardRadius: getComputedStyle(card).borderRadius,
      cardShadowHover: getComputedStyle(card).boxShadow,
      topBarGradient: before.backgroundImage.slice(0, 60),
      statBg: getComputedStyle(stat).backgroundImage.slice(0, 60),
      chipBg: chip ? getComputedStyle(chip).backgroundColor : null,
      chipColor: chip ? getComputedStyle(chip).color : null,
      badge: badge ? badge.textContent : null,
      cardH: Math.round(card.getBoundingClientRect().height),
      cards: document.querySelectorAll('.history-card:not(.is-skeleton)').length,
      hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    });
  })()`);
  console.log(info);
  const cap = await session.send("Page.captureScreenshot", {format: "png", captureBeyondViewport: true});
  const {writeFileSync, statSync} = await import("node:fs");
  writeFileSync(".tmp/shots/history-1920.png", Buffer.from(cap.data, "base64"));
  console.log("1920 shot:", Math.round(statSync(".tmp/shots/history-1920.png").size / 1024) + "KB");
} finally { close(); }
