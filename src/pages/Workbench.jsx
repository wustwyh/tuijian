import { Outlet } from 'react-router-dom';
import ComposeSheet from './ComposeSheet.jsx';
import StepNav from './StepNav.jsx';
import '../create.css';

// P1 营销图文工作台：左边是当前子页面，右边固定「本次组合」
export default function Workbench() {
  return (
    <div className="create">
      <div className="create-main">
        <Outlet />
        <StepNav />
      </div>
      <ComposeSheet />
    </div>
  );
}
