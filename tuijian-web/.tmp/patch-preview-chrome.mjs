import {readFileSync, writeFileSync} from "node:fs";
const file = "src/pages/ArticlePreview.jsx";
let s = readFileSync(file, "utf8");

s = s.replace(
  "import {layoutSpecOf} from '../layout-specs.js';",
  "import {layoutSpecOf} from '../layout-specs.js';\nimport {ChromeTop, ChromeBottom, ChromeStyle} from './PlatformChrome.jsx';\nimport {chromeInfo} from '../platform-chrome.js';"
);

s = s.replace(
  "  const [deckIndex, setDeckIndex] = useState(0);\n  const spec = layoutSpecOf(platformKind);",
  "  const [deckIndex, setDeckIndex] = useState(0);\n  const spec = layoutSpecOf(platformKind);\n  const info = chromeInfo({ platform: job?.summary?.platform, product: job?.summary?.product, audience: job?.summary?.audience, time: generatedTime });"
);

// 小红书：包一层平台外壳
s = s.replace(
  "    return (\n      <>\n        <div className=\"xhs-hint\">",
  "    return (\n      <div className={`pf pf-${platformKind}`}>\n        <ChromeStyle/>\n        <ChromeTop kind={platformKind} info={info}/>\n        <div className=\"xhs-hint\">"
);
s = s.replace(
  "        )}\n      </>\n    );\n  }\n\n  // 销售朋友圈",
  "        )}\n        <ChromeBottom kind={platformKind} info={info}/>\n      </div>\n    );\n  }\n\n  // 销售朋友圈"
);

// 朋友圈：同样包外壳，去掉旧的窄容器
s = s.replace(
  "    return (\n      <div className=\"moment-wrap\">\n        <div className=\"moment-post\">",
  "    return (\n      <div className={`pf pf-${platformKind}`}>\n        <ChromeStyle/>\n        <ChromeTop kind={platformKind} info={info}/>\n        <div className=\"moment-post\">"
);
s = s.replace(
  "        {notes.length > 0 && <p className=\"moment-note\">{notes.join('；')}</p>}\n        {edit && (\n          <div className=\"edit-extra-targets\">\n            <Hit edit={edit} block={{kind: 'cta', text: publicationText(article.cta)}} as=\"p\" className=\"edit-extra-item\">改结尾行动引导</Hit>\n          </div>\n        )}\n      </div>\n    );",
  "        {notes.length > 0 && <p className=\"moment-note\">{notes.join('；')}</p>}\n        {edit && (\n          <div className=\"edit-extra-targets\">\n            <Hit edit={edit} block={{kind: 'cta', text: publicationText(article.cta)}} as=\"p\" className=\"edit-extra-item\">改结尾行动引导</Hit>\n          </div>\n        )}\n        <ChromeBottom kind={platformKind} info={info}/>\n      </div>\n    );"
);

// 通用长文：包外壳
s = s.replace(
  "  return (\n    <article className={`generated-article layout-${platformKind}",
  "  return (\n    <div className={`pf pf-${platformKind}`}>\n      <ChromeStyle/>\n      <ChromeTop kind={platformKind} info={info}/>\n      <div className=\"pf-body\">\n    <article className={`generated-article layout-${platformKind}"
);
s = s.replace(
  "    </article>\n  );\n}",
  "    </article>\n      </div>\n      <ChromeBottom kind={platformKind} info={info}/>\n    </div>\n  );\n}"
);

writeFileSync(file, s);
console.log("patched");
