$('stats').onclick=e=>{
 if(!e.target.closest('#accept-issues'))return;
 const flights=[...(Toki.dateViewUnset?[]:currentFlights()),...(Toki.charterFlights?.(date)||[])],events=Toki.fleetEvents||[],data={...state,flights};
 const issues=Toki.pendingIssues(check(flights,state.machines,state.turn,events,date,state.constraints||[]),data,events,date);
 if(!issues.length)return;
 state.acceptedIssueKeys=[...new Set([...(state.acceptedIssueKeys||[]),...issues.map(i=>Toki.issueAcceptanceKey(i,data,events,date))])];
 Toki.expandAppliedAcceptances(state,events);
 for(const period of state.periods||[])period.acceptedIssueKeys=structuredClone(state.acceptedIssueKeys);
 commit();toast(issues.length+'件をAcceptし、総チェック件数から除外しました。');
};

$('issues').onclick=e=>{
 const button=e.target.closest('[data-revoke-accept]');if(!button)return;
 if(typeof isCurrentPlanLocked==='function'&&isCurrentPlanLocked()){toast('ロックを解除してから変更してください。');return;}
 const flights=[...(Toki.dateViewUnset?[]:currentFlights()),...(Toki.charterFlights?.(date)||[])],events=Toki.fleetEvents||[],data={...state,flights};
 const accepted=check(flights,state.machines,state.turn,events,date,state.constraints||[]).filter(i=>!Toki.pendingIssues([i],data,events,date).length),issue=accepted[Number(button.dataset.revokeAccept)];if(!issue)return;
 const keep=k=>{try{const p=JSON.parse(k);return p[0]!==issue.type||p[1]!==issue.text;}catch(e){return true;}};state.acceptedIssueKeys=(state.acceptedIssueKeys||[]).filter(keep);for(const period of state.periods||[])period.acceptedIssueKeys=(period.acceptedIssueKeys||[]).filter(keep);commit();toast('Acceptを取り消し、チェック件数に戻しました。');
};
