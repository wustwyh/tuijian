# 旧 IMA 角色迁移入口

从 `roles-v2-20261018` 起，IMA 与 Coordinator 合并为一个 Agent，当前任务包是 `coordinator.md`。本文件不再分配独立开发任务。

## 已有 IMA 会话的动作

1. 在下一个安全检查点保留已有代码和测试结果，不重置、不清理、不覆盖工作树。
2. 将所在分支、提交、未提交路径、完成/未完成、实际验证及阻塞写入自己的 `docs/handoffs/ima.md`，不要放入凭证。
3. 通过共享信箱发给 coordinator 一条交接消息，明确“已停止对 IMA 工作树写入，可以接管”；停止接新开发任务。
4. Coordinator 收到确认后检查并接续成果。旧工作树保留，不删除，不自动代提交未完成业务代码。

I1/I2 任务 ID 和 `packages/ima/**` 继续存在，由 Coordinator 实现；不再给另一个 IMA 会话并行分配实现。
若用户选择保留原 IMA 会话来担任合并角色，需明确替换原 Coordinator 会话，并按新 coordinator 任务包接管；同一时刻只能有一个合并角色的写入者。
通信见 `../communication.md`，迁移见 `../role-transition-v2.md`。
