# 共享契约声明

Coordinator 维护。`index.d.ts` 为 `docs/api-contract.md` §8（seams-v1-20261018）的类型声明，覆盖 B1 身份/任务、真实 IMA 证据和 LLMAdapter。
本包仅含类型；JavaScript 运行时无需导入。共享类型不会自行执行服务端校验。

生成 HTTP 聚合、确认/修订/失效与导出规则待 W0 和下一契约冻结，不把类型文件当作这些功能已经实现。
各模块同步契约后定向调整自己的声明/校验，Coordinator 不直接改写其业务源码。
