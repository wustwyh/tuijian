import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getUser } from './auth.js';
import { ComposeProvider } from './compose.jsx';
import Layout from './Layout.jsx';
import Workbench from './pages/Workbench.jsx';
import CreateProduct from './pages/CreateProduct.jsx';
import CreateAudience from './pages/CreateAudience.jsx';
import CreatePlatform from './pages/CreatePlatform.jsx';
import CreateStyle from './pages/CreateStyle.jsx';
import CreateDiscovery from './pages/CreateDiscovery.jsx';
import Result from './pages/Result.jsx';
import History from './pages/History.jsx';
import Login from './pages/Login.jsx';
import Products from './pages/Products.jsx';
import Audiences from './pages/Audiences.jsx';
import Materials from './pages/Materials.jsx';
import Workflows from './pages/Workflows.jsx';
import Pitch from './pages/Pitch.jsx';

// 未登录访问销售端页面 → 跳登录页，并记住原地址
function RequireAuth({ children }) {
  const location = useLocation();
  if (!getUser()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* 登录页使用独立外壳 */}
      <Route path="/login" element={<Login />} />

      {/* 决赛路演放映：公开访问，独立全屏外壳 */}
      <Route path="/pitch" element={<Pitch />} />

      {/* 销售端：需登录，带导航外壳；选择状态在整个外壳内共享（侧栏要显示已选内容） */}
      <Route
        element={
          <RequireAuth>
            <ComposeProvider>
              <Layout />
            </ComposeProvider>
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/create/product" replace />} />

        {/* P1 营销图文：4 个子页面 + 右侧组合单 */}
        <Route path="/create" element={<Workbench />}>
          <Route index element={<Navigate to="product" replace />} />
          <Route path="product" element={<CreateProduct />} />
          <Route path="audience" element={<CreateAudience />} />
          <Route path="platform" element={<CreatePlatform />} />
          <Route path="topic" element={<CreateStyle />} />
        <Route path="discovery" element={<CreateDiscovery />} />
          <Route path="style" element={<Navigate to="/create/topic" replace />} />
        </Route>

        <Route path="/result/:id" element={<Result />} />
        <Route path="/history" element={<History />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/products" element={<Products />} />
        <Route path="/audiences" element={<Audiences />} />
        <Route path="/materials" element={<Materials />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
