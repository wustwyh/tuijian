// 同时适用于旧记录的错误文本与新记录的结构化错误。
export function generationError(message='',code){
  const rules=[
    ['timeout',/超时|Timeout/i,'请求超时','模型或服务器响应较慢，可以在当前页面重试。'],
    ['network',/网络|连接中断|Failed to fetch|NetworkError|fetch failed/i,'网络连接失败','检查网络后重试；读取失败时先重新读取，避免重复生成。'],
    ['auth',/密钥|401|认证|授权/i,'模型配置异常','请先检查服务器的模型密钥配置，再重试。'],
    ['balance',/余额|402/,'模型余额不足','请补充模型账户余额后重试。'],
    ['rate_limit',/频繁|429|两个任务/,'请求繁忙','请稍后重试。'],
    ['interrupted',/重启|中断|取消/,'生成被中断','可以使用本次资料重新生成。'],
    ['input',/输入过长|输入长度|减少资料|413/,'输入资料过长','请返回调整，减少本次资料或要求后重新生成。'],
    ['format',/格式|JSON|截断|输出为空|返回异常/i,'模型输出异常','模型输出未满足结构要求，可以使用本次资料重试。'],
    ['unavailable',/不可用|服务|50[0234]/,'服务暂时不可用','请稍后重试；持续失败时请检查服务器配置。'],
  ];
  const rule=rules.find(([key,pattern])=>code?key===code:pattern.test(message));
  return rule?{code:rule[0],title:rule[2],hint:rule[3]}:{code:'unknown',title:'生成未完成',hint:'可以在当前页面重试；原记录会保留。'};
}
