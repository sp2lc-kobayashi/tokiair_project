// Use the same applied-date records for the calendar and for opening a day.
function appliedPlansForDate(day){
 const current=selectedPlan();
 return planLibrary.items.filter(plan=>{
  const data=plan.id===current?.id?state:plan.data,season=data.season;
  const sameSeason=season?day>=season.from&&day<=season.to:plan.id===current?.id;
  const owner=Toki.assignedPlanId?.(day);return sameSeason&&Toki.isPlanApplied(data,day)&&(owner===undefined||owner===plan.id);
 });
}
const selectDateBeforeRouting=$('date').onchange;
function selectAppliedDate(day,preferredName){
 if(!validDate(day)){selectDateBeforeRouting({target:{value:day}});return;}
 const matches=appliedPlansForDate(day),current=selectedPlan();
 const target=(preferredName&&matches.find(p=>p.name===preferredName))||matches.find(p=>p.id===current?.id)||matches[0];
 if(target&&target.id!==current?.id)openPlan(target.id);
 Toki.dateViewUnset=!target;selectDateBeforeRouting({target:{value:day}});renderSidebar();
 // Remember the viewed date without adding navigation to edit history.
 capturePlan();persistLibrary();
}
$('date').onchange=e=>selectAppliedDate(e.target.value);
step=function(n){const day=new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);if(validDate(day))selectAppliedDate(day);};
$('calendar-grid').onclick=e=>{
 const button=e.target.closest('[data-calendar-date]');if(!button||button.disabled)return;
 const badge=e.target.closest('[data-calendar-plan-name]');
 selectAppliedDate(button.dataset.calendarDate,badge?.dataset.calendarPlanName);
};
