const Fold = ({children}) => <details>{children}</details>;
const articleText = () => "";
const SourceText = () => null;
const result = {conversation: []};
export default () => <section>        {result.conversation?.length>0&&<Fold id="r-conversation" title="审核与修订" count={`${result.conversation.length} 轮`}></Fold></section>;