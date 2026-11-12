Toki.charterMode=false;let charterModeDraft=null,charterModeKey='';
const charterHistories=new Map();let restoringCharterHistory=false;
function activeCharterHistory(){if(!charterHistories.has((Toki.activeCharterGroupId||'')+'|'+date))charterHistories.set((Toki.activeCharterGroupId||'')+'|'+date,{entries:[JSON.stringify(charterRecords.filter(c=>c.day===date&&(!Toki.activeCharterGroupId||c.charterGroupId===Toki.activeCharterGroupId)))],index:0});return charterHistories.get((Toki.activeCharterGroupId||'')+'|'+date);}
function rememberCharterHistory(){if(restoringCharterHistory)return;const history=activeCharterHistory(),snapshot=JSON.stringify(charterRecords.filter(c=>c.day===date&&(!Toki.activeCharterGroupId||c.charterGroupId===Toki.activeCharterGroupId)));if(history.entries[history.index]!==snapshot){history.entries.splice(history.index+1);history.entries.push(snapshot);if(history.entries.length>40)history.entries.shift();history.index=history.entries.length-1;}}

const currentFlightsBeforeCharterMode=currentFlights;
currentFlights=function(){
 const regular=currentFlightsBeforeCharterMode();if(!Toki.charterMode)return regular;
 const key=selectedPlan()?.id+'|'+date+'|'+(Toki.activeCharterGroupId||'');
 if(!charterModeDraft||charterModeKey!==key){charterModeKey=key;charterModeDraft=[...structuredClone(Toki.dateViewUnset?[]:regular),...(typeof charterDraftFlights==='function'?charterDraftFlights(date):Toki.charterFlights(date)).map(f=>Toki.activeCharterGroupId&&f.charterGroupId!==Toki.activeCharterGroupId?{...f,charter:false,readOnlyCharter:true}:f)];}
 return charterModeDraft;
};
function enterCharterMode(){activeCharterHistory();Toki.charterMode=true;charterModeDraft=null;showSettingsPage(false);document.body.classList.add('charter-mode');render();renderSidebar();}
function exitCharterMode(){Toki.charterMode=false;charterModeDraft=null;document.body.classList.remove('charter-mode');render();refreshPeriods();renderSidebar();}
$('charters-open').onclick=enterCharterMode;
const modeHeading=document.createElement('div');modeHeading.id='charter-mode-heading';modeHeading.innerHTML='<strong>チャーター設定</strong><span>定期便は表示のみ</span><button id="charter-lock-toggle" aria-pressed="false">🔓 ロック</button>';$('planner-content').prepend(modeHeading);
const commitBeforeCharterMode=commit;commit=function(){
 if(!Toki.charterMode)return commitBeforeCharterMode();
 if(charterDayLocked(date)){charterModeDraft=null;render();toast('この日のチャーターはロック中です。');return;}
 try{
  const draft=currentFlights(),regular=draft.filter(f=>!f.charter),editable=draft.filter(f=>f.charter),ids=new Set();
  for(const f of editable){if(ids.has(f.id)||regular.some(r=>r.id===f.id))throw Error('便名が重複しています。');ids.add(f.id);if(!airports[f.from]||!airports[f.to]||!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.dep))throw Error('空港・出発時刻を確認してください。');if(!f.blockUnset)arrival(f.dep,minutes(f.arr)-minutes(f.dep));}
  activeCharterHistory();const updated=[...charterRecords.filter(c=>c.day!==date||(Toki.activeCharterGroupId&&c.charterGroupId!==Toki.activeCharterGroupId)),...editable.map(f=>({...f,charterGroupId:Toki.activeCharterGroupId||f.charterGroupId,name:f.id,day:date,recordId:f.recordId||'C'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}))];
  localStorage.setItem(CHARTERS_KEY,JSON.stringify(updated));charterRecords=updated;rememberCharterHistory();charterModeDraft=null;render();renderSidebar();
 }catch(e){charterModeDraft=null;render();toast(e.message);}
};
function revealNewCharter(){collapsedFlightRoutes.delete('unassigned');render();const row=[...$('flights').querySelectorAll('tr[data-index]')].find(row=>{const f=currentFlights()[Number(row.dataset.index)];return f?.charter&&f.id==='BV';});row?.scrollIntoView({block:'nearest',behavior:'smooth'});row?.querySelector('input[data-key="id"]')?.focus();}
const addBeforeCharterMode=$('add').onclick;$('add').onclick=()=>{if(!Toki.charterMode)return addBeforeCharterMode();if(typeof activeCharterGroup==='function'&&!activeCharterGroup()){Toki.addAfterCharterCode=true;$('charters-open').onclick();return;}if(charterDayLocked(date)){toast('ロックを解除してから追加してください。');return;}const flights=currentFlights();if(flights.some(f=>f.charter&&f.id==='BV')){revealNewCharter();toast('追加したチャーターの便名を入力してください。');return;}const from=airports.KIJ?'KIJ':Object.keys(airports)[0],to=airports.HSG?'HSG':Object.keys(airports).find(code=>code!==from);flights.push({id:'BV',from,to,dep:'12:00',arr:'13:20',aircraft:'',charter:true,blockUnset:true,color:'#8058a5'});commit();revealNewCharter();};

const renderBeforeCharterMode=render;render=function(){renderBeforeCharterMode();$('diff').closest('section').hidden=!!Toki.charterMode;$('flights').closest('section').querySelector('h2').textContent=Toki.charterMode?'チャーター便の編集':'運航便の編集';$('add').disabled=!!Toki.charterMode&&charterDayLocked(date);$('add').textContent=Toki.charterMode?'＋ チャーター便を追加':'＋ 便を追加';$('plan-lock-toggle').hidden=!!Toki.charterMode;const locked=!!Toki.charterMode&&charterDayLocked(date);$('planner-content').inert=Toki.charterMode?false:isCurrentPlanLocked();$('charter-lock-toggle').textContent=locked?'🔒 ロック解除':'🔓 ロック';$('charter-lock-toggle').setAttribute('aria-pressed',String(locked));document.body.classList.toggle('charter-locked',locked);if(Toki.charterMode){const history=activeCharterHistory();$('edit-undo').disabled=locked||history.index===0;$('edit-redo').disabled=locked||history.index===history.entries.length-1;}};
const selectionBeforeCharterMode=ensureBarSelection;ensureBarSelection=function(){selectionBeforeCharterMode();if(Toki.charterMode){const editable=new Set(currentFlights().filter(f=>f.charter).map(f=>f.id));selectedBarIds=new Set([...selectedBarIds].filter(id=>editable.has(id)));}};
$('plan-list').addEventListener('click',e=>{if(Toki.charterMode&&e.target.closest('[data-plan-id]'))exitCharterMode();});
$('stats').addEventListener('click',e=>{if(Toki.charterMode&&e.target.closest('#accept-issues')){e.preventDefault();e.stopImmediatePropagation();}},true);
render();

const restoreBeforeCharterMode=restoreEdit;restoreEdit=function(direction){if(Toki.charterMode)return restoreCharterEdit(direction);return restoreBeforeCharterMode(direction);};
const barDeleteBeforeCharterMode=$('bar-menu-delete').onclick;$('bar-menu-delete').onclick=()=>{if(!Toki.charterMode)return barDeleteBeforeCharterMode();const ids=new Set(selectedBarIds);charterModeDraft=currentFlights().filter(f=>!f.charter||!ids.has(f.id));selectedBarIds.clear();selectedBarId='';commit();$('bar-context-menu').hidden=true;};

$('charter-lock-toggle').onclick=()=>{const next={...charterLocks,[date]:!charterDayLocked(date)};try{localStorage.setItem('toki-charter-locks-v1',JSON.stringify(next));charterLocks=next;charterModeDraft=null;render();renderSidebar();toast(charterDayLocked(date)?'この日のチャーターをロックしました。':'チャーターのロックを解除しました。');}catch(e){toast('ロック状態を保存できませんでした。');}};
for(const type of ['click','pointerdown','dragstart','drop','keydown','input','change'])document.addEventListener(type,e=>{
 if(!Toki.charterMode||!charterDayLocked(date)||!e.target.closest('.timeline-panel,#flights,#add,#bar-color-palette,#bar-context-menu'))return;e.preventDefault();e.stopImmediatePropagation();
},true);

function restoreCharterEdit(direction){
 if(charterDayLocked(date)){toast('ロックを解除してから操作してください。');return;}
 const history=activeCharterHistory(),index=history.index+direction;if(index<0||index>=history.entries.length)return;
 const records=JSON.parse(history.entries[index]),next=[...charterRecords.filter(c=>c.day!==date||(Toki.activeCharterGroupId&&c.charterGroupId!==Toki.activeCharterGroupId)),...records];
 try{localStorage.setItem(CHARTERS_KEY,JSON.stringify(next));restoringCharterHistory=true;charterRecords=next;history.index=index;charterModeDraft=null;render();renderSidebar();}catch(e){toast('変更を保存できませんでした。');}finally{restoringCharterHistory=false;}
}
