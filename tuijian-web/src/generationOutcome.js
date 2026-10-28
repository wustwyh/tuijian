export function generationOutcome(status,verification,error){
  if(status==='failed')return {state:'failed',label:'生成失败',detail:error||'本次生成未完成，可在当前页面重试。'};
  if(status!=='succeeded')return null;
  if(verification?.reviewed===false)return {state:'done',label:'生成完成',detail:'文案已就绪，可查看、复制或下载。'};
  if(['rejected','conflict'].includes(verification?.overall_status)){
    const reason=verification.checks?.find(check=>check.status===verification.overall_status)?.reason;
    return {state:'failed',label:verification.overall_status==='conflict'?'资料冲突，内容已拦截':'核验未通过，内容已拦截',detail:reason||'成稿存在未通过项，请查看第四段核验结果后调整。'};
  }
  if(verification?.overall_status==='passed')return {state:'done',label:'生成完成，核验通过',detail:'完整四段结果已返回，已通过本轮资料核验。'};
  return {state:'pending',label:'生成完成，待确认',detail:'仍有需确认事项，请在发布前检查第四段核验结果。'};
}
