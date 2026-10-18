# Frontend 最近交接

角色 / 分支 / worktree：Frontend / `feat/frontend` / `E:\codes\创业\10.18黑客松-worktrees\frontend`

本次任务：F1 页面、API 适配与工作台交互骨架。基于 `ac4aa35` 的公共工程结构及现行 `docs/api-contract.md`，未修改公共契约。交付提交可用 `git log -1 -- docs/handoffs/frontend.md` 获取。

## 已交付

- `apps/web/src/main.js`：React 页面入口，登录表单、后端会话恢复、路由保护、退出、会话失效处理；未登录不渲染业务页。退出立即卸载私有页面并取消请求，不使用 localStorage 保存任务或凭证。
- `apps/web/src/Tasks.js`：任务列表、按真实契约状态筛选、新建任务模态框、字段校验、重复提交保护、空状态、错误、重试。
- `apps/web/src/Workbench.js`：任务 / 画像 / 策略 / 内容 / 核验五标签，键盘切换；场景判断、知识依据、策略、成稿、核验五个结果区块均有入口。只显示后端已有结果。
- `apps/web/src/api.js` 与 `integration.js`：同源 API 请求、契约错误保留、401 清理会话、取消请求；未冻结的鉴权与响应适配保持 `INTEGRATION_PENDING`，不猜测后端路径、不伪造数据。
- `apps/web/src/model.js`、`ui.js`、`styles.css`、`index.html`：页面模型、通用组件、响应式样式、入口；证据来源仅开放 HTTP(S) 链接，未知核验状态显示待人工核验。
- `apps/web/test/*.test.js`：10 个模块测试；测试数据仅在测试目录，没有进入生产页面入口。
- `apps/web/README.md`：接入说明与运行条件。只为本模块添加运行脚本，没有修改根配置、共享类型和锁文件，也没有安装第三方依赖。
- 原准备文件已迁入 `apps/web/readiness.md`；`E:\Codex\workspace` 中旧文件不存在。主项目目录未被本 Agent 修改。

## 已真实验证

在本前端 worktree 执行：

```powershell
# cwd: apps/web
node --test test/api.test.js test/model.test.js
# 10 passed, 0 failed

# 对 src 下所有 .js 文件逐一执行 node --check
# 全部通过

# cwd: worktree root
git diff --check
# 通过

npm.cmd run build --workspace @huawei-demo/web
# 失败：vite 未安装，退出码 1
```

模块测试覆盖：接口未配置时不联网、创建任务传参、401 与 403 的不同处理、HTML 回退、网络失败、取消请求、任务 ID 编码、本地与脚本来源 URL 拦截、非法路由、未知核验状态及表单校验。未验证浏览器布局、真实登录、业务存储、线上 ima、跨账号隔离或端到端闭环。

## 接入说明 / 最小变更请求

1. **依赖（Coordinator）**：批准并添加 `react`、`react-dom`、`vite`，维护公共锁文件。当前 `apps/web/package.json` 只增加 dev/build/preview/test 脚本，不擅自决定依赖版本。生产构建完成前还需 Coordinator 提供同源 `/api` 开发代理或部署入口。
2. **鉴权（Coordinator + Backend）**：冻结登录、会话恢复、退出、注册端点及字段和身份传递机制。前端 `integration.auth` 用函数适配正式端点；表单 `account/password` 仅为本地参数，需映射正式字段。所有鉴权函数必须透传 signal；会话返回真实 User 或 null，登录返回真实 User，用户需含 id。
3. **响应（Coordinator + Backend）**：提供任务列表、创建任务、任务详情、证据列表的最小真实包络示例；在 `integration.responses` 完成解包。工作台 `{task, personas, strategy, contents, verification}` 是本地视图模型，不代表新增公共后端结构。
4. **后续 F2/F3**：型号候选及确认、画像选择确认、生成操作、修改输入后下游失效、图片直链与有效期、导出及核验阻断规则仍需统一契约。当前既有任务输入只读；更换平台或人群通过新建任务完成，避免错误重用旧结果。图片只显示证据元信息，未把 `source_url` 擅自当作图片直链。

已适配现有端点：`GET /api/tasks`、`POST /api/tasks`、`GET /api/tasks/:taskId`、`GET /api/tasks/:taskId/evidence`。没有虚构 Auth API 路径；没有改后端模块或其他 Agent worktree。

## 下一步

Coordinator 提供依赖及正式鉴权/响应样例后，填充 `integration.js`，执行构建与浏览器验收：登录 → 建任务 → 打开五标签 → 刷新重读 → 退出 → 直接访问任务地址回登录；再配合 Backend 与 QA 验收双账号隔离。当前状态为“页面源码与模块验证已交付，依赖和真实 API 联调待接入”，不是 F1 端到端完成。
