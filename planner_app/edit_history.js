// Independent edit history for each named plan; dates are restored with edits,
// while merely selecting another date does not create an undo step.
const editHistories=new Map();let restoringEdit=false;
function editSnapshot(){return {data:JSON.stringify(compactPlan(state)),date,assignments:JSON.stringify(planLibrary.assignments||{})};}
function activeHistory(){
 const id=selectedPlan()?.id;if(!id)return null;
 if(!editHistories.has(id))editHistories.set(id,{entries:[editSnapshot()],index:0});
 return editHistories.get(id);
}
function updateHistoryButtons(){const h=activeHistory();$('edit-undo').disabled=!h||h.index===0;$('edit-redo').disabled=!h||h.index===h.entries.length-1;}
function rememberEdit(){
 const h=activeHistory();if(!h)return;
 const next=editSnapshot();if(h.entries[h.index].data!==next.data||Toki.assignmentChanged){
  h.entries.splice(h.index+1);h.entries.push(next);
  if(h.entries.length>40)h.entries.shift();h.index=h.entries.length-1;
 }
 Toki.assignmentChanged=false;updateHistoryButtons();
}
const saveBeforeHistory=save;
save=function(){saveBeforeHistory();if(!restoringEdit)rememberEdit();else updateHistoryButtons();};
function restoreEdit(direction){
 const h=activeHistory();if(!h)return;const index=h.index+direction;if(index<0||index>=h.entries.length)return;
 const entry=h.entries[index],source=h.entries[h.index],next=validate(expandDates(JSON.parse(entry.data)));
 restoringEdit=true;
 try{
  const ownersBefore=JSON.parse(source.assignments||'{}'),ownersAfter=JSON.parse(entry.assignments||'{}');
  planLibrary.assignments=planLibrary.assignments||{};
  for(const day of new Set([...Object.keys(ownersBefore),...Object.keys(ownersAfter)]))if(ownersBefore[day]!==ownersAfter[day]&&planLibrary.assignments[day]===ownersBefore[day]){if(ownersAfter[day]===undefined)delete planLibrary.assignments[day];else planLibrary.assignments[day]=ownersAfter[day];}
  state=next;date=validDate(entry.date)?entry.date:START;h.index=index;
  activePeriodId=state.editingPeriodId||'';periodLoadedState=null;dragUndo=null;$('undo-drag').disabled=true;
  refreshPeriods();save();render();refreshPeriods();updateHistoryButtons();
 }finally{restoringEdit=false;}
}
$('edit-undo').onclick=()=>restoreEdit(-1);$('edit-redo').onclick=()=>restoreEdit(1);
document.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey)||e.altKey||e.target.closest('input,textarea,select,[contenteditable="true"],dialog'))return;
 if(e.key.toLowerCase()==='z'){e.preventDefault();restoreEdit(e.shiftKey?1:-1);}
 else if(e.key.toLowerCase()==='y'){e.preventDefault();restoreEdit(1);}
});
updateHistoryButtons();
