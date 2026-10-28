// 手机机身：固定 390×844 的真实屏幕尺寸，内容在机身内滚动/翻页，
// 不再是一个拉长的方框。样式在 src/chrome-css.js 里（.phone-*），预览与导出共用。
export default function PhoneFrame({children, label}) {
  return <div className="phone-frame" role="group" aria-label={label || '手机预览'}>
    <div className="phone-screen">
      <div className="phone-status"><span>9:41</span><span>▮▮▮ ⌁</span></div>
      <div className="phone-scroll">{children}</div>
    </div>
    <div className="phone-home"><i /></div>
  </div>;
}
