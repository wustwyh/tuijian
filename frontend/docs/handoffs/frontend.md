# Frontend 最近交接

最新用户纠正：本轮仅要求删除页面“演示/示例/框架预览”等文案，不授权因此撤下已有数据和交互或扩大接口接线。已撤回这部分扩大修改，恢复产品、人群、客户、草稿和可点击管线；真实接口接入未在此步骤开展。下方 FF1 的原始描述为开发历史，页面当前已去掉上述用语。

## FF1 / PR2 前端先行框架（2026-10-18 当前交付）

分支 feat/frontend；工作目录仍为 frontend worktree。保留历史 B1 和预览交付，本节替代下面旧的“等待全部契约”下一步。最新提交可用 `git log -1 -- apps/web/src/pipeline.js` 获取。

入口 **http://127.0.0.1:5173/#/preview/products**，无需登录即可进入隔离的“框架预览·示例数据”。五入口：产品总览/客群调研/客户跟进/营销策略/内容工坊。产品→一键模拟执行→人群→策略→可编辑平台文案→实时排版→带水印 SVG 下载，客户分支可新增虚构客户、编辑需求/阶段/跟进时间、追加跟进记录、把需求带入策略、关联草稿。支持模拟失败/重试、上游/文案修改后核验失效、示例核验、反馈记录。自动修订生成尚未接入。

正式登录默认到 `#/products`，目录/调研等服务显示 unavailable；没有隐式示例回退。真实 B1 任务 `#/tasks`、创建、详情、退出入口保留。系统推荐不写成人工确认；样例不写后端，不称为持久化，刷新清空。

新增 `apps/web/src/pipeline.js`、`poster.js`、`test/poster.test.js` 与 `apps/web/PIPELINE-ADAPTER.md`；修改 main/model/styles。真实接线所需函数输入输出、优先顺序、最小 startPlan 样例见适配说明，属于前端内部接缝提案，未声称 HTTP 已实现。已读取 Workflow WP1 55b9f0c 和 Backend BP1 草案，下一段优先接真实目录、图片与调研保存重开。

实际验证：15/15 模块测试通过；Edge 完整点击链路通过（搜索、一键、模拟失败/重试、换人群、客户新增/时间线/需求入策略、关联草稿、实时标题转义、核验失效、下载 SVG、刷新清空、任务路由保护），pageerror=0；桌面1440/移动390五页均无横向溢出，截图已查看。SVG 两平台分别720×960/960×540，XML 转义和长文案边界有模块检查。构建 `--emptyOutDir false` 通过；未修复历史默认 dist 清理原生崩溃。未宣称完整真实生成、图片、客户保存或正式导出已通过。

证据在共享工作区 `verify-pipeline.mjs`、`pipeline-desktop.png`、`pipeline-studio.png`、`pipeline-mobile.png`、`pipeline-sample.svg`。Vite 5173 持续运行。下一步：Backend按适配说明逐段给出可运行响应，Frontend替换对应 adapter，保留显式不可用状态。

角色 / 分支 / worktree：交互与展示负责人 / feat/frontend / E:\codes\创业\10.18黑客松-worktrees\frontend
职责基线：roles-v2-20261018 / ea126ce。原提交 e1cde7c 和 d3575f7 保留；本次交付提交以 git log -1 -- apps/web/src/ContentPreview.js 获取。公共 seams-v1 39d15df 在本次模块提交后安全合并，具体同步 HEAD 见信箱回执。

## 本次已交付

继续已有真实 B1 适配，未重建工程。ContentPreview.js 展示公众号/小红书正文、备选标题、内容结构切换、版本、核验状态、逐图用途/位置/证据，海报说明与成品分开。核验页增加未接通的导出入口及原因；未添加复制/下载绕过服务端。图片代理未就绪，仅展示计划，不读取来源文档作为图片。

只修改 apps/web/** 和本交接；不改后端、公共契约、根配置或公共锁文件。Workflow 的 W0 ab7e3a2 已读，新增字段仍为提案；前端所需状态/确认/修订字段已回信 Coordinator/Backend/Workflow。

## 真实验证

- 13 项模块测试通过：node --test apps/web/test/api.test.js apps/web/test/model.test.js apps/web/test/preview.test.js。
- 实际 Edge 浏览器：专用本地演示账号注册→创建带自验标识的任务→刷新重读→退出→任务路由回登录，均通过，脚本异常 0。保留一个专用演示账号/任务，无产品事实或生成内容。
- 独立浏览器组件夹具：两平台预览、结构切换、证据入口、导出禁用、390px 无横向溢出，通过；已查看桌面和移动截图。夹具在临时测试脚本，不进入正式运行入口。
- 构建：默认 npm.cmd run build --workspace @huawei-demo/web 在清空既有 dist 时 Windows 原生进程退出 3221226505，重现。关闭压缩/线程限制无效。--emptyOutDir false 及输出到新临时目录均构建成功。暂未改变默认清理策略，不能声称默认构建通过。
- git diff --check 通过。

入口 http://127.0.0.1:5173/ ，后端默认 3001；启动 npm.cmd run dev --workspace @huawei-demo/web。Vite 隐藏运行，日志/PID 在 apps/web/.runtime/。

## 已对齐与依赖

B1 当前 auth/tasks envelope 与 Cookie 将按 seams-v1 正式约定接续。Frontend manifest 已有 react/react-dom/vite，Coordinator 已回信接收业务时处理公共锁文件。

信箱：
- 启动职责回执 20261018T073944Z_f3a7_role-ack。
- Backend 接口问题 20261018T073944Z_f3a7_backend-contract-request，已回复 B1 实现，B2/B3/跟进未实现。
- Workflow 交互问题 20261018T073944Z_f3a7_workflow-interaction-request，已收到 W0 规则/接口草案。
- W0 展示字段反馈见 messages/frontend 下 w0-ui-feedback 消息。

F2 输入修改/型号/画像/策略确认、F4 反馈修订/失效、F3 生成/图片代理/导出/客户保存与建议等待正式契约和真实接口；未按草案猜测端点。导出 pending/rejected 用途待用户产品取舍。无真实生成、图片代理、完整导出、双账号隔离或客户跟进验收，不等同完整比赛闭环。

下一步：同步公共 seams-v1 基线并回执；Backend/Coordinator 冻结 D1—D7 及图片 HTTP 后，逐项接通确认/执行状态/图片。收到 W4/W5 正式契约后接修订和跟进。
