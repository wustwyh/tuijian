# @huawei-demo/web

React + Vite 营销工作台。业务数据由后端读取，不使用运行时测试夹具或浏览器持久化，不持有服务端凭证。

## 启动

在 frontend worktree 根目录执行：

```powershell
npm.cmd run dev --workspace @huawei-demo/web
```

打开 http://127.0.0.1:5173/ 。端口固定，已占用时启动失败。开发代理将 `/api` 转发到 `http://127.0.0.1:3001`，可在启动前通过环境变量 `FRONTEND_API_TARGET` 指定其他后端地址。同源开发请求的 Origin 归一化为后端 Origin，其他来源不改写。此配置仅用于 Vite 开发服务；生产部署需配置同源 `/api` 入口。

当前已安装 React、React DOM 和 Vite，版本记录在本模块 package.json。安装时使用 `--package-lock=false`，公共锁文件需由 Coordinator 统一维护。

```powershell
npm.cmd run build --workspace @huawei-demo/web
npm.cmd run test --workspace @huawei-demo/web
```

## 页面与 API

- `#/login`：邮箱登录、注册（密码至少 12 位）、刷新恢复会话。HttpOnly Cookie 由后端管理。
- `#/tasks`：本人任务列表、筛选、新建任务。
- `#/tasks/:taskId`：任务、画像、策略、内容、核验五标签；仅展示后端已有结果。
- `#/leads`：后续批次占位。

`src/integration.js` 根据 Backend B1 README 和交接适配：

- `GET /api/auth/me` → `{user}`；401 表示未登录。
- `POST /api/auth/login`、`POST /api/auth/register`：`{email,password}` → `{user}`。
- `POST /api/auth/logout` → 204。
- `GET /api/tasks` → `{tasks}`。
- `POST /api/tasks`、`GET /api/tasks/:taskId` → `{task}`。

未登录不渲染业务页面；会话失效返回登录。退出立即卸载私有页面并取消请求。证据链接只允许 HTTP(S)，不把来源文档链接当作图片直链。

## 验证与边界

2026-10-18：生产构建及 10 项模块测试通过。实际 Edge 浏览器验证了登录/注册切换、匿名路由保护和 390px 移动布局，无页面脚本异常。前端首页 HTTP 200；代理和后端会话接口均返回匿名 401。

已通过真实本地 B1 浏览器注册、创建标识为自验的任务、刷新重读、退出及路由保护（专用演示账号）。尚未验证双账号隔离。后端 B1 尚无证据端点，`GET /api/tasks/:taskId/evidence` 的失败会真实展示；生成、型号/画像确认、修改输入后的下游失效、图片直链、导出及客户跟进等待 B2/B3 和统一契约。缺失结果保持待处理，不伪造线上 ima 事实。

## 职责 v2 接续检查点

新增 `ContentPreview.js`：公众号/小红书排版预览、内容结构切换、备选标题、版本和逐图证据。核验页有暂不可用的 Markdown/JSON 导出入口及原因；不绕过服务端复制或下载限制。图片代理未实现时只显示配图方案，不加载猜测链接。

本次 13 项模块测试通过；测试文件内的合成内容不进入运行入口。Edge 验证预览切换、证据入口、禁用导出、390px 无横向溢出、无脚本异常；另完成真实 B1 注册/创建/刷新/退出。

本机默认构建在清空已有 dist 时异常退出（3221226505）；以下构建通过，不据此宣称默认构建已通过。尚未更改默认清理策略，生产交付仍需解决此环境问题：

```powershell
npm.cmd run build --workspace @huawei-demo/web -- --emptyOutDir false
```
