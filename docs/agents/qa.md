# QA 暂停说明

从职责基线 `roles-v2-20261018` 起，暂不创建独立 QA Agent，不再分配 Q1/Q2。

- 模块负责人验证各自模块并提供实际命令、结果和未验证项。
- Coordinator 检查跨模块接通、维护演示材料与最小集成检查。
- 用户负责最终体验、营销效果与比赛演示验收。
- 原检查要求已转入 `../demo/acceptance.md`；产品内的内容核验仍由 Workflow 实现。

旧 `test/demo` 分支及 qa worktree 仅保留历史，不删除，不作为等待 QA 的依赖。
若已有 QA 会话或成果，保留工作，在 `docs/handoffs/qa.md` 记录现状，通过共享信箱交给 Coordinator 后停止接新任务。
