import {openBrowser, measure} from "./cdp.mjs";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
const {session, close} = await openBrowser();
try {
  for (const w of [1400, 390]) {
    const r = await measure(session, pathToFileURL(resolve(".tmp/shots/wechat2.html")).href, {width: w, height: 900, settle: 600});
    console.log(`export w=${w} hOverflow=${r.hOverflow} clipped=${JSON.stringify(r.clipped)} errors=${r.errors.length}`);
  }
} finally { close(); }
