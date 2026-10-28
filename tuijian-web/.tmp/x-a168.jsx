const Fold = ({children}) => <details>{children}</details>;
const articleText = () => "";
const SourceText = () => null;
const result = {conversation: []};
export default () => <section><Fold>          {result.conversation.map((turn,i)=><div className="rs-turn" key={i}><strong>{({planner:'资料整理',writer:'创作',reviewer:'核验',system:'流程'})[turn.role]} · {turn.round===0?'初稿':`第${turn.round}次修订`}</strong><p>{turn.message}</p>{turn.issues?.length>0&&<ul>{turn.issues.map((issue,j)=><li key={j}><b>{issue.claim}</b>：{issue.reason}</li>)}</ul>}{turn.article&&<details className="rs-sub"><summary>本轮正文</summary><SourceText text={articleText(turn.article)}/></details>}</div>)}</Fold></section>;