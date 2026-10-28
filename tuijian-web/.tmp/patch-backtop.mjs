import {readFileSync, writeFileSync} from "node:fs";
const file = "src/pages/ResultView.jsx";
let s = readFileSync(file, "utf8");

s = s.replace(`// 滚过一屏后出现的回到顶部按钮
function BackTop(){
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;`,
`// 页面可能在 window 里滚，也可能在内部容器里滚：两种情况都算上。
const scrollOffset = () => {
  const values = [window.scrollY || 0, document.scrollingElement?.scrollTop || 0];
  for (const el of document.querySelectorAll('main, .main-scroll, .app-main')) values.push(el.scrollTop || 0);
  return Math.max(...values);
};

const backTop = () => {
  for (const el of document.querySelectorAll('main, .main-scroll, .app-main')) el.scrollTo({top: 0, behavior: 'smooth'});
  window.scrollTo({top: 0, behavior: 'smooth'});
};

// 滚过一段后出现的回到顶部按钮
function BackTop(){
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(scrollOffset() > 200);
    onScroll();
    document.addEventListener('scroll', onScroll, {capture: true, passive: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => { document.removeEventListener('scroll', onScroll, {capture: true}); window.removeEventListener('scroll', onScroll); };
  }, []);
  if (!show) return null;`);

s = s.replace(`  return <button type="button" className="rs-backtop" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} aria-label="回到最上面">`,
`  return <button type="button" className="rs-backtop" onClick={backTop} aria-label="回到最上面">`);

s = s.replace(`    <button type="button" className="rs-rail-top" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>`,
`    <button type="button" className="rs-rail-top" onClick={backTop}>`);

// 右侧导航也要能识别内部滚动容器
s = s.replace(`    const onScroll = () => {
      let current = '';
      for (const item of TOC) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 160) current = item.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);`,
`    const onScroll = () => {
      let current = '';
      for (const item of TOC) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 180) current = item.id;
      }
      setActive(current);
    };
    onScroll();
    document.addEventListener('scroll', onScroll, {capture: true, passive: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => { document.removeEventListener('scroll', onScroll, {capture: true}); window.removeEventListener('scroll', onScroll); };`);

writeFileSync(file, s);
console.log("ok");
