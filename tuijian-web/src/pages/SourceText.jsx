// 只渲染文本与基本排版，不执行资料中的 HTML。
export default function SourceText({text}) {
  const clean = value=>value.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1');
  return <div className="source-text">{text.split(/\r?\n\s*\r?\n/).filter(Boolean).map((block,index)=>{
    const lines=block.split(/\r?\n/);
    if (lines.every(line=>/^\|/.test(line))) {
      const rows=lines.filter(line=>!/^\|[\s:|\-]+\|\s*$/.test(line));
      return <div className="source-table" key={index}><table><tbody>{rows.map((line,i)=><tr key={i}>{line.replace(/^\||\|\s*$/g,'').split('|').map((cell,j)=><td key={j}>{clean(cell.trim())}</td>)}</tr>)}</tbody></table></div>;
    }
    if (lines.every(line=>/^[-*] /.test(line))) return <ul key={index}>{lines.map((line,i)=><li key={i}>{clean(line.slice(2))}</li>)}</ul>;
    return <div key={index}>{lines.map((line,i)=>/^#{1,6} /.test(line)
      ? <h3 key={i}>{clean(line.replace(/^#+ /,''))}</h3>
      : <p key={i}>{clean(line)}</p>)}</div>;
  })}</div>;
}
