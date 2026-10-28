// 平台版式预览：用抽象色块画出这个平台发布后的样子（标题、正文、图、标签的位置），
// 目的只是让人一眼看出「排版长什么样」，不放任何真实文案。
import './platform-preview.css';

const Line = ({w = '100%', strong = false, className = ''}) => (
  <span className={`ppv-line${strong ? ' is-strong' : ''}${className ? ' ' + className : ''}`} style={{width: w}} />
);

const Img = ({h = 26, tone = 1}) => <span className={`ppv-img tone-${tone}`} style={{height: h}} />;

const Para = ({rows = 2}) => (
  <span className="ppv-para">
    {Array.from({length: rows}, (_, i) => <Line key={i} w={i === rows - 1 ? '62%' : '100%'} />)}
  </span>
);

export default function PlatformPreview({kind = 'article'}) {
  if (kind === 'card') {
    return (
      <span className="ppv ppv-card">
        <span className="ppv-card-item is-main">
          <Img h={52} />
          <Line w="70%" strong />
          <Line w="45%" />
        </span>
        <span className="ppv-card-item"><Img h={30} /><Line w="80%" /></span>
        <span className="ppv-card-item"><Img h={30} /><Line w="60%" /></span>
        <span className="ppv-dots"><i /><i /><i /></span>
      </span>
    );
  }
  if (kind === 'moment') {
    return (
      <span className="ppv ppv-moment">
        <span className="ppv-row">
          <span className="ppv-avatar" />
          <span className="ppv-col"><Line w="40%" strong /><Line w="22%" /></span>
        </span>
        <Para rows={2} />
        <span className="ppv-grid3">
          <Img h={24} tone={1} /><Img h={24} tone={2} /><Img h={24} tone={3} />
        </span>
      </span>
    );
  }
  if (kind === 'poster') {
    return (
      <span className="ppv ppv-poster">
        <Img h={54} tone={2} />
        <Line w="72%" strong />
        <span className="ppv-pills"><i /><i /><i /></span>
        <span className="ppv-cta" />
      </span>
    );
  }
  if (kind === 'feed') {
    return (
      <span className="ppv ppv-feed">
        <span className="ppv-row"><span className="ppv-avatar" /><Line w="30%" strong /></span>
        <Para rows={2} />
        <span className="ppv-grid2"><Img h={28} tone={1} /><Img h={28} tone={3} /></span>
        <span className="ppv-pills"><i /><i /></span>
      </span>
    );
  }
  if (kind === 'news') {
    return (
      <span className="ppv ppv-news">
        <Line w="36%" className="ppv-kicker" />
        <Line w="86%" strong />
        <Para rows={2} />
        <Img h={26} tone={2} />
        <Para rows={2} />
      </span>
    );
  }
  if (kind === 'qa') {
    return (
      <span className="ppv ppv-qa">
        <span className="ppv-q"><b>Q</b><Line w="78%" strong /></span>
        <Para rows={2} />
        <span className="ppv-h"><b>结论</b><Line w="52%" /></span>
        <Para rows={1} />
        <Img h={22} tone={3} />
      </span>
    );
  }
  if (kind === 'doc') {
    return (
      <span className="ppv ppv-doc">
        <Line w="52%" strong />
        {[1, 2, 3].map(i => (
          <span className="ppv-doc-row" key={i}>
            <span className="ppv-num">{i}</span>
            <span className="ppv-col"><Line w="64%" strong /><Line w="92%" /><Line w="70%" /></span>
          </span>
        ))}
      </span>
    );
  }
  // article：公众号一类的长图文
  return (
    <span className="ppv ppv-article">
      <Line w="18%" className="ppv-kicker" />
      <Line w="88%" strong />
      <Img h={36} tone={1} />
      <Para rows={2} />
      <Img h={24} tone={3} />
      <span className="ppv-pills"><i /><i /></span>
    </span>
  );
}
