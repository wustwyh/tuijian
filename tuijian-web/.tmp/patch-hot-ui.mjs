import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/CreateStyle.jsx";
let s = readFileSync(f, "utf8");

s = s.replace("  const [hotNote, setHotNote] = useState('');", "  const [hotNote, setHotNote] = useState('');\n  const [hotMeta, setHotMeta] = useState(null); // 搜索引擎、时间、原始结果\n  const [hotSources, setHotSources] = useState([]);");
s = s.replace(`      setHotResults(d.topics || []);
      setHotNote(\`\${d.note || ''}\${d.source === 'model' ? '' : ''}\`);`,
`      setHotResults(d.topics || []);
      setHotNote(d.note || '');
      setHotMeta({provider: d.provider, at: d.searchedAt, source: d.source});
      setHotSources(d.results || []);`);

s = s.replace(`                {hot.angle && <p className="hot-angle"><Sparkles size={12}/>{hot.angle}</p>}
                <span className="hot-add">{on ? '已加入本次' : '加到本次'}</span>`,
`                {hot.angle && <p className="hot-angle"><Sparkles size={12}/>{hot.angle}</p>}
                <div className="hot-foot">
                  <span className="hot-add">{on ? '已加入本次' : '加到本次'}</span>
                  {hot.url && <a className="hot-src" href={hot.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>来源</a>}
                </div>`);

s = s.replace(`        {hotNote && <p className="insight-note">{hotNote}</p>}
      </>}`, `        {hotNote && <p className="insight-note">{hotNote}</p>}
        {hotSources.length > 0 && <details className="hot-sources">
          <summary>看到的原始搜索结果（{hotSources.length} 条，{hotMeta?.provider}）</summary>
          <ul>
            {hotSources.map(item => <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
              {item.snippet && <span>{item.snippet}</span>}
            </li>)}
          </ul>
        </details>}
      </>}`);
writeFileSync(f, s);
console.log("ok");
