let contextPlanId='';
function closePlanMenu(){ $('plan-context-menu').hidden=true;contextPlanId=''; }
function showPlanMenu(id,x,y){
 if(!planLibrary.items.some(p=>p.id===id))return;
 contextPlanId=id;const menu=$('plan-context-menu');menu.hidden=false;
 menu.style.left=Math.max(8,Math.min(x,window.innerWidth-210))+'px';
 menu.style.top=Math.max(8,Math.min(y,window.innerHeight-130))+'px';
 $('plan-menu-copy').focus();
}
function copyNamedPlan(id){
 if(planLibrary.items.length>=100){toast('ダイヤは最大100件です。');return;}
 capturePlan();const source=planLibrary.items.find(p=>p.id===id);if(!source)return;
 const seasonKey=source.seasonKey||source.data?.season?.key||'';
 const used=new Set(planLibrary.items.filter(p=>(p.seasonKey||p.data?.season?.key||'')===seasonKey).map(p=>p.name));
 const match=source.name.match(/^([A-Z])([0-9]{0,3})$/),base=match?match[1]:'A';let n=match&&match[2]?Number(match[2])+1:1;
 while(n<=999&&used.has(base+n))n++;
 if(n>999){toast('この英字のコピー用番号はすべて使用済みです。');return;}
 const name=base+n;
 const copy={id:planId(),name,seasonKey,date:source.date,updated:new Date().toISOString(),data:structuredClone(source.data)};
 planLibrary.items.push(copy);openPlan(copy.id);
 toast(librarySaved?'「'+name+'」を作成しました。':'コピーは作成しましたが、自動保存に失敗しました。ファイルにも保存してください。');
}
function deleteNamedPlan(id){
 const target=planLibrary.items.find(p=>p.id===id);if(!target)return;
 if(!confirm('「'+target.name+'」を削除しますか？\nこのダイヤの便・期間・機材設定が削除されます。元には戻せません。'))return;
 capturePlan();const before=[...planLibrary.items],beforeId=planLibrary.activeId;
 planLibrary.items=planLibrary.items.filter(p=>p.id!==id);
 const removedActive=beforeId===id;
 if(removedActive)planLibrary.activeId=planLibrary.items[0]?.id||'';
 if(!persistLibrary()){
  planLibrary.items=before;planLibrary.activeId=beforeId;renderSidebar();
  toast('削除を保存できなかったため、ダイヤは削除していません。');return;
 }
 if(removedActive){
  const next=selectedPlan();state=next?migrateAircraftNames(validate(expandDates(structuredClone(next.data)))):fresh();
  if(!next){for(const d of Object.keys(state.days))state.days[d]=[];state.periods=[];}
  date=next&&validDate(next.date)?next.date:START;activePeriodId='';dragUndo=null;$('undo-drag').disabled=true;
  // Update legacy storage as well, so a removed plan cannot reappear as a draft.
  saveBeforeLibrary();
 }
 render();refreshPeriods();renderSidebar();toast('「'+target.name+'」を削除しました。');
}
$('plan-list').oncontextmenu=e=>{
 const button=e.target.closest('[data-plan-id]');if(!button)return;
 e.preventDefault();showPlanMenu(button.dataset.planId,e.clientX,e.clientY);
};
$('plan-list').onkeydown=e=>{
 if(e.key!=='ContextMenu'&&!(e.shiftKey&&e.key==='F10'))return;
 const button=e.target.closest('[data-plan-id]');if(!button)return;
 e.preventDefault();const r=button.getBoundingClientRect();showPlanMenu(button.dataset.planId,r.right,r.top);
};
$('plan-menu-copy').onclick=()=>{const id=contextPlanId;closePlanMenu();copyNamedPlan(id);};
$('plan-menu-delete').onclick=()=>{const id=contextPlanId;closePlanMenu();deleteNamedPlan(id);};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#plan-context-menu'))closePlanMenu();});
document.addEventListener('keydown',e=>{
 if($('plan-context-menu').hidden)return;
 if(e.key==='Escape'){e.preventDefault();const id=contextPlanId;closePlanMenu();$('plan-list').querySelector(`[data-plan-id="${id}"]`)?.focus();}
 if(e.key==='ArrowDown'){e.preventDefault();$('plan-menu-delete').focus();}
 if(e.key==='ArrowUp'){e.preventDefault();$('plan-menu-copy').focus();}
});
window.addEventListener('resize',closePlanMenu);
document.addEventListener('scroll',closePlanMenu,true);

let renamingPlanId='';
$('plan-menu-rename').onclick=()=>{
 const plan=planLibrary.items.find(p=>p.id===contextPlanId);closePlanMenu();if(!plan)return;renamingPlanId=plan.id;
 const key=plan.seasonKey||plan.data?.season?.key||'',used=new Set(planLibrary.items.filter(p=>p.id!==plan.id&&(p.seasonKey||p.data?.season?.key||'')===key).map(p=>p.name));
 const letters=Array.from({length:26},(_,i)=>String.fromCharCode(65+i));$('rename-plan-options').innerHTML=letters.map(l=>`<option value="${l}" ${used.has(l)?'disabled':''}>${l}${used.has(l)?'（使用済み）':''}</option>`).join('');
 $('rename-plan-code').value=/^[A-Z][0-9]{0,3}$/.test(plan.name)&&!used.has(plan.name)?plan.name:letters.find(l=>!used.has(l))||'';$('rename-plan-dialog').showModal();
};
$('rename-plan-cancel').onclick=()=>$('rename-plan-dialog').close();
$('rename-plan-save').onclick=()=>{const plan=planLibrary.items.find(p=>p.id===renamingPlanId),name=$('rename-plan-code').value.trim().toUpperCase();if(!plan||!/^[A-Z][0-9]{0,3}$/.test(name))return;const key=plan.seasonKey||plan.data?.season?.key||'';
 if(planLibrary.items.some(p=>p.id!==plan.id&&(p.seasonKey||p.data?.season?.key||'')===key&&p.name===name)){toast('このコードは使用済みです。');return;}
 capturePlan();const previous=plan.name;plan.name=name;if(!persistLibrary()){plan.name=previous;toast('保存できませんでした。');return;}$('rename-plan-dialog').close();render();renderSidebar();toast('ダイヤコードを「'+name+'」に変更しました。');
};
