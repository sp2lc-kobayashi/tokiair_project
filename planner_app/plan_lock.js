let lockedSnapshot=null;
function isCurrentPlanLocked(){return !Toki.charterMode&&!!selectedPlan()?.locked;}
function renderPlanLock(){
 const plan=selectedPlan(),locked=!Toki.charterMode&&!!plan?.locked;
 $('plan-lock-toggle').disabled=!plan;$('plan-lock-toggle').textContent=locked?'🔒 ロック解除':'🔓 ロック';$('plan-lock-toggle').setAttribute('aria-pressed',String(locked));
 $('active-plan-name').classList.toggle('locked-code',locked);
 $('planner-content').inert=locked;
 const settings=document.querySelector('#settings-page .settings-bottom');if(settings)settings.inert=locked;
 if(locked&&lockedSnapshot?.id!==plan.id)lockedSnapshot={id:plan.id,data:structuredClone(state)};else if(!locked)lockedSnapshot=null;
}
const renderBeforePlanLock=render;render=function(){renderBeforePlanLock();renderPlanLock();};
const sidebarBeforePlanLock=renderSidebar;renderSidebar=function(){sidebarBeforePlanLock();renderPlanLock();};
const commitBeforePlanLock=commit;commit=function(){if(isCurrentPlanLocked()){if(lockedSnapshot?.id===selectedPlan().id)state=structuredClone(lockedSnapshot.data);render();toast('ロック中です。編集するには上部のロックを解除してください。');return;}return commitBeforePlanLock();};
$('plan-lock-toggle').onclick=()=>{
 const plan=selectedPlan();if(!plan)return;
 if(!plan.locked)capturePlan();
 const previous=!!plan.locked;plan.locked=!previous;if(!persistLibrary()){plan.locked=previous;toast('ロック状態を保存できませんでした。');return;}
 render();renderSidebar();toast(plan.locked?'ダイヤをロックしました。':'ロックを解除しました。');
};
const deleteBeforePlanLock=deleteNamedPlan;deleteNamedPlan=function(id){if(planLibrary.items.find(p=>p.id===id)?.locked){toast('ロック中のダイヤは削除できません。先にロックを解除してください。');return;}return deleteBeforePlanLock(id);};
const renameBeforePlanLock=$('rename-plan-save').onclick;$('rename-plan-save').onclick=()=>{if(planLibrary.items.find(p=>p.id===renamingPlanId)?.locked){toast('ロック中のダイヤコードは変更できません。');return;}renameBeforePlanLock();};
renderPlanLock();

const restoreBeforePlanLock=restoreEdit;restoreEdit=function(direction){if(isCurrentPlanLocked()){toast('ロック中のダイヤは変更できません。');return;}return restoreBeforePlanLock(direction);};

// Guard mutations independently of browser inert support.
function blockLockedEdit(){if(!isCurrentPlanLocked())return false;toast('ロック中です。編集するにはロックを解除してください。');return true;}
for(const id of ['period-save','period-revert','period-add-range','period-remove-first','add','reset','auto','accept-issues','constraint-add']){
 const el=$(id);if(!el)continue;const previous=el.onclick;if(previous)el.onclick=function(e){if(blockLockedEdit())return;return previous.call(this,e);};
}
for(const [id,events] of [['flights',['onchange','onclick']],['timeline',['onchange','ondragstart','ondragover','ondrop']],['period-extra-ranges',['onchange','onclick']],['machines',['onchange']],['turn',['onchange']],['count',['onchange']],['constraint-rows',['onchange','onclick']],['bar-color-options',['onclick']],['bar-menu-delete',['onclick']]]){
 const el=$(id);if(!el)continue;for(const event of events){const previous=el[event];if(previous)el[event]=function(e){if(blockLockedEdit()){e?.preventDefault?.();render();return;}return previous.call(this,e);};}
}
const saveBeforeLockGuard=save;save=function(){
 if(isCurrentPlanLocked()&&lockedSnapshot?.id===selectedPlan().id){state=structuredClone(lockedSnapshot.data);periodLoadedState=null;}
 return saveBeforeLockGuard();
};
const assignDatesBeforeLock=Toki.assignAppliedDates;Toki.assignAppliedDates=function(dates){if(blockLockedEdit())return;return assignDatesBeforeLock?.(dates);};
for(const type of ['click','dblclick','pointerdown','dragstart','drop','keydown','input','change'])document.addEventListener(type,e=>{
 if(!isCurrentPlanLocked()||!e.target.closest('#planner-content,#settings-page .settings-bottom,#bar-color-palette,#bar-context-menu'))return;
 e.preventDefault();e.stopImmediatePropagation();
},true);
