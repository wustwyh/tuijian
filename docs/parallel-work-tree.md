# 黑客松四角色工作树与集成约定

## 职责基线

`roles-v2-20261018`：Coordinator 兼 IMA，Workflow 主导营销业务逻辑，Backend 管服务与状态，Frontend 管交互展示。用户最终验收，独立 QA 暂停。
这是职责基线，不代表 API 已冻结或真实闭环已通过；实现情况见看板与各分支交接。

## 所有权

| 角色 | 独占范围 | 结果责任 |
|---|---|---|
| Coordinator + IMA | packages/ima、packages/contracts、根配置/锁文件、公共文档、tests/e2e、docs/demo、coordinator 交接 | 真实知识接入、公共契约、可运行基线与集成 |
| Workflow | packages/workflow、模块测试、workflow 交接 | 业务理解、画像/策略/内容、核验、修订、跟进建议 |
| Backend | apps/api、模块测试/迁移、backend 交接 | 身份/存储、LLM 适配器、图片访问、状态/版本与导出 |
| Frontend | apps/web、模块测试、frontend 交接 | 操作/确认/修订、内容预览、证据与核验展示 |

模块负责人提出完整的接口/依赖草案，Coordinator 负责跨消费者收口及共享文件修改。业务实现由所属角色修复。
旧 IMA/QA 交接只用于迁移，当前协作通过 `communication.md` 的共享信箱进行。

## 工作树

| 路径 | 分支 | 当前用途 |
|---|---|---|
| `E:\codes\创业\10.18黑客松` | integration | 合并后的 Coordinator 主工作树 |
| `E:\codes\创业\10.18黑客松-worktrees\workflow` | feat/workflow | Workflow |
| `E:\codes\创业\10.18黑客松-worktrees\backend` | feat/backend | Backend |
| `E:\codes\创业\10.18黑客松-worktrees\frontend` | feat/frontend | Frontend |
| `E:\codes\创业\10.18黑客松-worktrees\ima` | feat/ima | 原成果交接保留；原会话停止写入后由 Coordinator 接续 |
| `E:\codes\创业\10.18黑客松-worktrees\qa` | test/demo | 历史保留，暂停开发 |

不删除/重建已有工作树，不丢弃未提交工作。合并角色不要同时在 integration 与旧 ima 工作树实现同一模块。

## 同步策略

- 本次职责提交在 integration 建立本地标签 `roles-v2-20261018`，用 `git rev-parse roles-v2-20261018` 获取确切 SHA。
- 各工作树合并同一个提交；干净且可快进时快进，有独立提交时普通合并，保留原提交历史。
- 旧 ima 的未提交工作必须与本次文档路径无重叠，且同步前后状态和内容一致；否则停止该工作树同步并报告。
- 不使用 hard reset、强制 checkout、clean 或隐式 stash；遇冲突保留现场，协调后处理。
- 不混用 merge 与 cherry-pick 接收同一批业务提交。本次只同步职责文档，不将各角色业务实现顺带合入 integration。
- 基线已是祖先时无需再次合并。共享信箱不依赖分支同步，正式契约/交接仍通过提交集成。

## 并行安排

合并后的 Coordinator 加 Workflow、Backend、Frontend 共四个角色。外部独立会话可以各自运行；不据此自动新建子 Agent。
四方可以按稳定接口并行：Coordinator 推进 IMA 与公共接缝；Workflow 接续已有模块并补业务规则；Backend 推进接口/状态/LLM；Frontend 接通现有页面。
外部服务受阻时先交付可验证部分与明确阻塞，不以假数据冒充真实接通，不让其他角色无条件空等。

## 接缝清单

1. Backend 提案 Auth/存储、登录与身份、成功/错误响应；Coordinator 收口，Frontend 消费。
2. Coordinator 提供 IMA 证据/候选/图片访问元数据，Backend 保存并提供访问，Frontend 展示。
3. Workflow 提案生成输入/输出、型号/画像/策略确认、引用粒度及修订语义；Backend/Frontend 评估，Coordinator 冻结。
4. Backend 提案真实 LLM 适配器，Workflow 提供调用/结构化输出需求；Coordinator 收口。
5. Workflow 定义修改输入/证据后的影响范围，Backend 实现版本与过时回写保护，Frontend 显示失效。
6. Workflow 提出 pending/rejected 导出规则，产品取舍交用户，Coordinator 收口，Backend 强制执行。
7. Workflow 实现跟进建议；Backend 持久化；Frontend 展示/确认。卡片/海报成品格式需收口后实施。

以上为责任分配，未写入 API 契约的具体字段/签名仍是待决项。

## 集成与验收

每次交付一个可观察结果，附输入输出、协作方、依赖及验证证据。小批提交，及时集成。

| 门禁 | 通过证据 | 检查责任 |
|---|---|---|
| G0 基线 | 必要接口明确、模块可启动/验证、依赖与基线可追溯 | Coordinator + 模块负责人 |
| G1 真实依赖 | 线上 Markdown/可展示图片、真实 LLM、持久化重开与双账号隔离 | Coordinator + Backend/Workflow/Frontend 按模块验证 |
| G2 纵向闭环 | 登录→任务→真实证据→画像确认→策略→内容→核验→导出，证据与版本一致 | Coordinator 集成检查，各模块修复 |
| G3 演示 | 两平台、单变量人群/平台对比、失败/歧义、虚构客户跟进和整体体验 | 用户最终验收，Coordinator 提供材料 |

详细检查见 `demo/acceptance.md`。未执行项写未验证；历史真实记录不能声称是本次实时请求。
