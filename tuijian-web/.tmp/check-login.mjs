// 登录页检查：测试账号提示是否可见、结构是否溢出、「填入」能否真正把两个框填好。
import {openBrowser, measure} from './cdp.mjs';

const {session, close} = await openBrowser();
try {
  for (const width of [1400, 1280]) {
    const r = await measure(session, 'http://localhost:5173/login', {width, height: 900, settle: 600});
    const info = JSON.parse(await session.evaluate(`new Promise((resolve) => {
      const cred = document.querySelector('.login-cred');
      const btn = document.querySelector('.login-cred-fill');
      btn?.click();
      setTimeout(() => resolve(JSON.stringify({
        text: cred ? cred.innerText.replace(/\\n/g, ' | ') : null,
        filled: [...document.querySelectorAll('.login-input input')].map((i) => i.value),
        submitEnabled: !document.querySelector('.login-submit')?.disabled,
        hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      })), 400);
    })`));
    console.log(`${width}px`, JSON.stringify({...info, clipped: r.clipped.length, errors: r.errors}));
  }
} finally {
  close();
}
