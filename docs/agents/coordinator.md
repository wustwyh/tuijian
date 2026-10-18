# Coordinator 任务包

## 目标与阅读

让独立 Agent 按同一契约并行开发，并交付可演示的真实闭环。
共同入口后追加阅读 `docs/api-contract.md`、`docs/mvp-demo-plan.md`、`docs/parallel-work-tree.md`；后续仅按需阅读角色交接和受影响源码。

## 独占范围

`packages/contracts/**`、根配置与依赖锁文件、公共工程骨架、API 契约、协作文档与进度看板。不要直接代改各角色业务实现。

## C0 第一批交付

1. 按工作树文档收口跨模块接缝，生成共享类型/校验约束并标记基线提交。
2. 建立一套 React/Vite + Node 工程骨架、统一启动/验证命令与环境变量名称说明；不写入凭证值。
3. 在排除素材/凭证后建立 Git 基线与各独立 worktree，分配目录、任务 ID 和验收条件。
4. 先启动 Frontend、Backend、IMA；接收早期交付，再按槽位调度 Workflow 和 QA。

## 验收与交接

按 G0—G3 门禁收口；不以某个 Agent 口头说完成代替实际验证。
共享契约变化必须通知所有消费者，并更新各分支应同步的基线提交。
集成失败先判断归属，将最小复现交给对应角色，不自行跨模块扩展实现。
维护 `docs/agent-status.md` 和自己的 `docs/handoffs/coordinator.md`。
