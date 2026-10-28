import {openBrowser, measure} from "./cdp.mjs";
const {session, close} = await openBrowser();
try {
  const r = await measure(session, "http://localhost:5173/login", {width: 1400, height: 900, settle: 600});
  console.log(JSON.stringify({clipped: r.clipped, overflowX: r.overflowX, errors: r.errors}));
} finally { close(); }
