let draggingPlanId='';
function reorderSidebarPlan(sourceId,targetId,after){
 if(sourceId===targetId)return false;
 const source=planLibrary.items.find(p=>p.id===sourceId),target=planLibrary.items.find(p=>p.id===targetId);
 const scope=p=>p?.seasonKey||p?.data?.season?.key||'legacy';
 if(!source||!target||scope(source)!==scope(target))return false;
 const before=[...planLibrary.items];planLibrary.items=planLibrary.items.filter(p=>p.id!==sourceId);
 const index=planLibrary.items.findIndex(p=>p.id===targetId);planLibrary.items.splice(index+(after?1:0),0,source);
 if(!persistLibrary()){planLibrary.items=before;toast('並び順を保存できませんでした。');return false;}
 renderPlanList();return true;
}
$('plan-list').ondragstart=e=>{const b=e.target.closest('[data-plan-id]');if(!b)return;draggingPlanId=b.dataset.planId;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',draggingPlanId);b.classList.add('plan-dragging');};
$('plan-list').ondragover=e=>{const b=e.target.closest('[data-plan-id]');if(!b||!draggingPlanId||b.dataset.planId===draggingPlanId)return;e.preventDefault();e.dataTransfer.dropEffect='move';$('plan-list').querySelectorAll('.plan-drop-target').forEach(el=>el.classList.remove('plan-drop-target'));b.classList.add('plan-drop-target');};
$('plan-list').ondrop=e=>{const b=e.target.closest('[data-plan-id]');if(!b||!draggingPlanId)return;e.preventDefault();const rect=b.getBoundingClientRect(),after=e.clientX>rect.left+rect.width/2;const id=draggingPlanId;draggingPlanId='';reorderSidebarPlan(id,b.dataset.planId,after);renderPlanList();};
$('plan-list').ondragend=()=>{draggingPlanId='';renderPlanList();};
