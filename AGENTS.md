# 新 Agent 入口

本项目为华为 PC 营销智能体黑客松 Demo。不要先扫描整个仓库。

职责基线：`roles-v2-20261018`。仅有四个开发角色：Coordinator（兼 IMA）、Workflow、Backend、Frontend。用户最终验收，暂不创建独立 QA Agent。

按顺序阅读：
1. `AGENT_CONTEXT.md`：项目目标与不可违反的约束。
2. `docs/agent-start.md`：阅读路由与工作边界。
3. 启动指令指定的唯一角色任务包：`docs/agents/<role>.md`。
4. `docs/agent-status.md` 的全局事实、当前批次与自己角色对应行。
5. 首次切换读 `docs/role-transition-v2.md`；跨会话协作读 `docs/communication.md`。
6. 任务包指定的接口/验收章节，以及完成当前任务必需的源码。

旧 IMA 会话先读 `docs/agents/ima.md` 完成交接；旧 QA 入口见 `docs/agents/qa.md`，不再按旧任务包开工。
角色未指定时，先请求 Coordinator 分配角色；不要自行扩大范围。
不要递归读取项目、批量读取全部源码、扫描本地知识库、读取凭证值或把测试数据作为线上事实。
公共契约、根配置、共享类型和锁文件由 Coordinator 统一维护；各模块负责人提出具体变更草案。
独立会话通过 `E:\Codex\workspace\hackathon-agent-mailbox` 交换消息；文件不自动推送，在接任务、阻塞、交付及安全检查点检查。正式决策写回版本化文档。
新增规则不能覆盖用户在本次会话中明确给出的授权和要求。
