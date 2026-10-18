# Agent 进度看板

由 Coordinator 维护；各角色写自己的交接，通过共享信箱直接协作。

## 全局事实

- 主目录 `E:\codes\创业\10.18黑客松`，主分支 integration。
- 职责基线标签 `roles-v2-20261018`：Coordinator 兼 IMA、Workflow、Backend、Frontend 四个角色；独立 QA 暂停，用户最终验收。
- 旧结构基线 `1631a12`，本次调整前 integration 为 `ac4aa35`。五个旧角色工作树保留，使用方式见 `parallel-work-tree.md`。
- 2026-10-18 切换前检查：Frontend、Backend、Workflow 已有业务提交；Frontend 另有未提交联调修改；旧 ima 已暂存 I1 实现与交接但尚未提交。不能继续按“全部待启动”调度。
- 本批职责变更只修改文档，不把分支业务代码顺带合入 integration，不重新运行其业务测试，不宣称线上服务已验证。
- 角色历史交接中的测试结果是该角色报告；下表不是本批重新实测结果。真实 IMA/LLM、前后端集成与 G0—G3 通过情况仍需实际验证。
- 正式事实/图片只来自线上 IMA，凭证不入源码/日志/信箱，测试夹具不冒充线上结果。

## 当前批次

切换职责并同步基线；各会话读取新任务包，在信箱回执职责、旧任务继续/移交、下一交付、阻塞。Coordinator 接收 IMA 停写交接后接管。
本文件记录切换前成果与下一任务；实际同步结果以执行回执为准。检查本工作树是否含基线：`git merge-base --is-ancestor roles-v2-20261018 HEAD`。

| 角色 | 已有成果/状态 | 分支 / worktree 后缀 | 下一交付 |
|---|---|---|---|
| Coordinator + IMA | C0 结构已建，接缝待收口；原 I1 在途代码及交接报告已见，待接收 | integration / 主目录；旧 feat/ima 仅接续 | 接收旧 IMA，核对其线上验证记录，收口鉴权/响应/LLM/业务接口 |
| Workflow | `953572c` 已提交 W1—W3 模块；交接报告 19 个测试通过，真实 LLM 未验证 | feat/workflow / workflow | W0 业务规则与接口差异；接续 W1—W3 真实联调，规划 W4 修订/W5 跟进建议 |
| Backend | `f520e47` 已提交 B1 本地身份/SQLite；交接报告 6 个测试通过，云与线上服务未验证 | feat/backend / backend | 鉴权/响应草案、B4 LLM 适配器；推进 B2/B3/B5 |
| Frontend | `e1cde7c` 已提交页面/工作台；交接报告 10 个测试通过，Vite 未安装、真实 API 未接通 | feat/frontend / frontend | 依赖/代理与鉴权响应接通；继续 F2/F3，配合修订交互 F4 |

## 保留但不独立调度

- IMA：feat/ima / `E:\codes\创业\10.18黑客松-worktrees\ima`。切换前 `packages/ima` 与 `docs/handoffs/ima.md` 已暂存，保留原样；其交接报告离线 18 项通过、真实 Markdown/图片及刷新调用成功，本批未重跑；原会话完成停写交接后由 Coordinator 接管 I1/I2。
- QA：test/demo / `E:\codes\创业\10.18黑客松-worktrees\qa`。暂停、不创建 Agent；检查要求转入 `demo/acceptance.md`。

## 待决与主责

- 鉴权/存储提供方、身份与成功响应：Backend 提案，Coordinator 收口；产品选择交用户。
- LLM 调用适配器：Backend 实现，Workflow 提需求，Coordinator 冻结接缝。
- 图片访问/有效期：Coordinator 查明，Backend 实现访问，Frontend 展示。
- 业务确认/修订/失效/核验导出：Workflow 提案，Backend/Frontend 执行，Coordinator 收口。
- 额外平台与可下载海报/卡片成品的范围/格式：用户决定；本次不擅自扩充或删减产品范围。
