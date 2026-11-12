function importSagaCharter2026(){
 const marker='toki-saga-charter-20261124-v2';if(!libraryWritable)return;
 const days=['2026-11-24','2026-11-26'];const present=days.every(day=>calendarCharterFlights(day).some(f=>f.from==='KIJ'&&f.to==='HSG')&&calendarCharterFlights(day).some(f=>f.from==='HSG'&&f.to==='KIJ'));if(localStorage.getItem(marker)&&present)return;if(present){localStorage.setItem(marker,'1');return;}
 const season=seasonRange(2026,'W'),used=usedSeasonLetters(season.key),letters=[...Array.from({length:26},(_,i)=>String.fromCharCode(65+i)),...Array.from({length:999},(_,i)=>'A'+(i+1))].filter(l=>!used.has(l));
 if(letters.length<2||planLibrary.items.length>98){toast('佐賀チャーター取込用の空きコードが不足しています。');return;}
 capturePlan();const before=structuredClone(planLibrary),previousAirports={...airports};
 try{
 if(!localStorage.getItem('toki-before-saga-charter-backup'))localStorage.setItem('toki-before-saga-charter-backup',JSON.stringify(planLibrary));
 airports.HSG=airports.HSG||'佐賀';localStorage.setItem('toki-airports-v1',JSON.stringify(airports));
 const choices=structuredClone(Toki.airportChoices);for(const key of ['from','to'])if(!choices[key].includes('HSG'))choices[key].push('HSG');localStorage.setItem('toki-airport-choices-v1',JSON.stringify(choices));Toki.airportChoices=choices;
 const rows=[['2026-11-24','07:35','10:15','10:55','13:05'],['2026-11-26','14:40','17:20','18:00','20:10']];
 rows.forEach(([day,dep1,arr1,dep2,arr2],index)=>{
 const owner=Toki.assignedPlanId?.(day),base=planLibrary.items.find(p=>p.id===owner),data=base?expandDates(structuredClone(base.data)):fresh();
 const regular=structuredClone((base?.data.days[day]||schedule(day)).filter(f=>!f.charter)),charters=[{id:'CHT'+day.replaceAll('-','')+'A',from:'KIJ',to:'HSG',dep:dep1,arr:arr1},{id:'CHT'+day.replaceAll('-','')+'B',from:'HSG',to:'KIJ',dep:dep2,arr:arr2}].map(f=>({...f,aircraft:'',charter:true,flightNumberPublished:false,color:'#8058a5',source:'https://tokiair.com/news/7189/'}));
 const flights=allocateOfficialFlights([...regular,...charters],data.machines,data.turn,Toki.fleetEvents||[],day),id=planId(),pid='P'+id.slice(1),name=letters[index];
 for(const key of Object.keys(data.days))data.days[key]=[];data.days[day]=structuredClone(flights);data.flights=flights;data.season=season;data.acceptedIssueKeys=[];data.editingPeriodId=pid;
 data.periods=[{id:pid,name,start:day,end:day,ranges:[{start:day,end:day}],weekdays:[0,1,2,3,4,5,6],dates:[day],flights:structuredClone(flights),machines:structuredClone(data.machines),turn:data.turn,constraints:structuredClone(data.constraints||[])}];
 data.charterSource={url:'https://tokiair.com/news/7189/',published:'2026-09-25',type:'ATR42-600',note:'便名未公表。機番割当は検討用。'};
 validate(data);planLibrary.items.push({id,name,seasonKey:season.key,date:day,updated:new Date().toISOString(),data:compactPlan(data)});planLibrary.assignments[day]=id;
 });
 if(!persistLibrary())throw Error('保存できませんでした。');render();renderSidebar();renderAirportMaster();renderAirportChoices();const charterPlan=planLibrary.items.find(p=>p.id===planLibrary.assignments['2026-11-24']);if(charterPlan)openPlan(charterPlan.id);localStorage.setItem(marker,'1');toast('11月24日・26日の新潟―佐賀チャーターを取り込みました。');
 }catch(e){planLibrary=before;Object.assign(airports,previousAirports);persistLibrary();toast('チャーター取込を中止しました：'+e.message);}
}
// Replaced by independent charter storage.

let charterLocks={};try{charterLocks=JSON.parse(localStorage.getItem('toki-charter-locks-v1')||'{}');}catch(e){}
function charterDayLocked(day){return !!charterLocks[day];}
let charterRecords=[];const CHARTERS_KEY='toki-charters-v1';let charterEditingId='';
try{charterRecords=JSON.parse(localStorage.getItem(CHARTERS_KEY)||'[]');}catch(e){}
Toki.charterFlights=day=>charterRecords.filter(c=>c.day===day).map(c=>({...c,id:c.name,charter:true,color:c.color||'#8058a5'}));
function calendarCharterFlights(day){return Toki.charterFlights(day);}
function migrateSagaToIndependent(){
 if(localStorage.getItem('toki-saga-independent-v1')||!libraryWritable)return;
 capturePlan();localStorage.setItem('toki-before-independent-charters-backup',JSON.stringify(planLibrary));
 const removed=planLibrary.items.filter(p=>p.data?.charterSource?.url==='https://tokiair.com/news/7189/'),removedIds=new Set(removed.map(p=>p.id));
 let backup=null;try{backup=JSON.parse(localStorage.getItem('toki-before-saga-charter-backup')||'null');}catch(e){}
 const days=['2026-11-24','2026-11-26'];
 for(const day of days){
  if(!charterRecords.some(c=>c.day===day&&c.source==='https://tokiair.com/news/7189/')){
   const times=day.endsWith('24')?[['07:35','10:15'],['10:55','13:05']]:[['14:40','17:20'],['18:00','20:10']];
   times.forEach(([dep,arr],i)=>charterRecords.push({recordId:'Csaga'+day.replaceAll('-','')+i,name:'CHT'+day.replaceAll('-','')+(i?'B':'A'),day,from:i?'HSG':'KIJ',to:i?'KIJ':'HSG',dep,arr,aircraft:'M3',source:'https://tokiair.com/news/7189/'}));
  }
  if(removedIds.has(planLibrary.assignments[day])){const prior=backup?.assignments?.[day],fallback=planLibrary.items.find(p=>!removedIds.has(p.id)&&p.data?.season?.key==='W2026'&&Toki.isPlanApplied(p.data,day));if(prior&&planLibrary.items.some(p=>p.id===prior&&!removedIds.has(p.id)))planLibrary.assignments[day]=prior;else if(fallback)planLibrary.assignments[day]=fallback.id;else delete planLibrary.assignments[day];}
 }
 airports.HSG=airports.HSG||'佐賀';localStorage.setItem('toki-airports-v1',JSON.stringify(airports));localStorage.setItem(CHARTERS_KEY,JSON.stringify(charterRecords));
 planLibrary.items=planLibrary.items.filter(p=>!removedIds.has(p.id));const activeRemoved=removedIds.has(planLibrary.activeId);if(activeRemoved)planLibrary.activeId=planLibrary.assignments[date]||planLibrary.items[0]?.id||'';
 if(persistLibrary()){localStorage.setItem('toki-saga-independent-v1','1');if(activeRemoved){const plan=selectedPlan();state=migrateAircraftNames(validate(expandDates(structuredClone(plan.data))));periodLoadedState=null;saveBeforeLibrary();}render();refreshPeriods();renderSidebar();}
}
function renderCharters(){const season=chosenEventSeason();$('charter-list').innerHTML=charterRecords.filter(c=>!season||c.day>=season.from&&c.day<=season.to).sort((a,b)=>(a.day+a.dep).localeCompare(b.day+b.dep)).map(c=>`<div class="fleet-event-row"><div><strong>${charterDayLocked(c.day)?'🔒 ':''}${esc(c.name)} ／ ${c.day}</strong><span>${esc(c.from)} − ${esc(c.to)} ／ ${c.dep} − ${c.arr}</span></div><button data-charter-edit="${c.recordId}">編集</button><button data-charter-delete="${c.recordId}">削除</button></div>`).join('')||'<div class="muted">チャーター未設定</div>';}
function clearCharter(){charterEditingId='';$('charter-name').value='';$('charter-day').value=date;$('charter-from').innerHTML=airportOptions('KIJ');$('charter-to').innerHTML=airportOptions('HSG');$('charter-aircraft').innerHTML=machineOptions('M3');$('charter-dep').value='';$('charter-block').value='';}
$('charters-open').onclick=()=>{clearCharter();renderCharters();$('charter-dialog').showModal();};$('charter-close').onclick=()=>$('charter-dialog').close();$('charter-clear').onclick=clearCharter;
function saveCharters(next){localStorage.setItem(CHARTERS_KEY,JSON.stringify(next));charterRecords=next;render();renderSidebar();renderCharters();}
$('charter-save').onclick=()=>{try{if(charterDayLocked($('charter-day').value)||charterRecords.some(c=>c.recordId===charterEditingId&&charterDayLocked(c.day)))throw Error('この日のチャーターはロック中です。');const day=$('charter-day').value,name=$('charter-name').value.trim(),dep=$('charter-dep').value,from=$('charter-from').value,to=$('charter-to').value,aircraft=$('charter-aircraft').value,arr=arrival(dep,parseBlock($('charter-block').value));if(!validDate(day)||!name||name.length>24||!airports[from]||!airports[to]||from===to)throw Error('名称・運航日・空港を確認してください。');if(charterRecords.some(c=>c.recordId!==charterEditingId&&c.day===day&&c.name===name))throw Error('同じ日の名称が重複しています。');saveCharters([...charterRecords.filter(c=>c.recordId!==charterEditingId),{recordId:charterEditingId||'C'+Date.now().toString(36),name,day,from,to,dep,arr,aircraft}]);clearCharter();toast('チャーターを登録しました。');}catch(e){toast(e.message);}};
$('charter-list').onclick=e=>{const edit=e.target.closest('[data-charter-edit]'),del=e.target.closest('[data-charter-delete]');if(edit){const c=charterRecords.find(c=>c.recordId===edit.dataset.charterEdit);if(!c)return;clearCharter();charterEditingId=c.recordId;for(const [field,value] of Object.entries({name:c.name,day:c.day,from:c.from,to:c.to,dep:c.dep,aircraft:c.aircraft,block:formatBlock(minutes(c.arr)-minutes(c.dep))}))$('charter-'+field).value=value;}if(del&&charterDayLocked(charterRecords.find(c=>c.recordId===del.dataset.charterDelete)?.day)){toast('ロック中のチャーターは削除できません。');return;}if(del&&confirm('このチャーター便を削除しますか？')){try{saveCharters(charterRecords.filter(c=>c.recordId!==del.dataset.charterDelete));}catch(e){toast('保存できませんでした。');}}};
migrateSagaToIndependent();render();

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

// Named charter codes own charter records independently from regular timetable codes.
const CHARTER_GROUPS_KEY='toki-charter-groups-v1';let charterGroups={active:'',items:[]},charterGroupsWritable=true;
try{const raw=localStorage.getItem(CHARTER_GROUPS_KEY);if(raw){const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.items)||parsed.items.some(g=>!g||typeof g.id!=='string'||typeof g.code!=='string'||!validDate(g.day)))throw Error('invalid');charterGroups=parsed;}}catch(e){charterGroupsWritable=false;toast('保存済みチャーターコードを読み込めません。既存データは上書きしません。');}
function charterSeasonForDay(day){for(let y=2026;y<=2036;y++)for(const kind of ['S','W']){const range=seasonRange(y,kind);if(day>=range.from&&day<=range.to)return range.key;}return '';}
function nextCharterCode(season){const used=new Set(charterGroups.items.filter(g=>g.seasonKey===season).map(g=>g.code));let n=1;while(used.has('CF'+n))n++;return 'CF'+n;}
function persistCharterGroups(){if(!charterGroupsWritable)throw Error('チャーターコードを保存できません。');localStorage.setItem(CHARTER_GROUPS_KEY,JSON.stringify(charterGroups));}
if(charterGroupsWritable){const priorRecords=structuredClone(charterRecords),priorGroups=structuredClone(charterGroups),priorLocks={...charterLocks};try{
 let changed=false;const migration=new Map();
 for(const record of charterRecords){if(charterGroups.items.some(g=>g.id===record.charterGroupId))continue;const seasonKey=charterSeasonForDay(record.day),key=seasonKey+'|'+(record.source||record.day);let group=migration.get(key);if(!group){group={id:'G'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),code:nextCharterCode(seasonKey),seasonKey,day:record.day,locked:false};charterGroups.items.push(group);migration.set(key,group);}group.locked=group.locked||!!charterLocks[record.day];record.charterGroupId=group.id;changed=true;}
 if(changed){if(!localStorage.getItem('toki-before-charter-codes-backup'))localStorage.setItem('toki-before-charter-codes-backup',JSON.stringify({records:priorRecords,locks:priorLocks,groups:priorGroups}));for(const record of charterRecords)delete charterLocks[record.day];persistCharterGroups();localStorage.setItem(CHARTERS_KEY,JSON.stringify(charterRecords));localStorage.setItem('toki-charter-locks-v1',JSON.stringify(charterLocks));}
 }catch(e){charterRecords=priorRecords;charterGroups=priorGroups;charterLocks=priorLocks;charterGroupsWritable=false;toast('既存チャーターのコード移行を中止しました。');}}
// Rename only code labels; IDs, records, locks and applied snapshots stay connected.
if(charterGroupsWritable&&charterGroups.items.some(g=>!/^CF[1-9][0-9]*$/.test(g.code))){const before=structuredClone(charterGroups);try{if(!localStorage.getItem('toki-before-cf-codes-backup'))localStorage.setItem('toki-before-cf-codes-backup',JSON.stringify(before));for(const group of charterGroups.items)if(!/^CF[1-9][0-9]*$/.test(group.code))group.code=nextCharterCode(group.seasonKey);persistCharterGroups();}catch(e){charterGroups=before;toast('チャーターコードの表示変更を保存できませんでした。');}}
Toki.activeCharterGroupId=charterGroups.items.some(g=>g.id===charterGroups.active)?charterGroups.active:charterGroups.items[0]?.id||'';
function activeCharterGroup(){return charterGroups.items.find(g=>g.id===Toki.activeCharterGroupId);}
const charterLockedBeforeGroups=charterDayLocked;charterDayLocked=function(day){if(charterLockedBeforeGroups(day))return true;if(Toki.charterMode&&activeCharterGroup())return !!activeCharterGroup().locked;return charterRecords.some(c=>c.day===day&&charterGroups.items.some(g=>g.id===c.charterGroupId&&g.locked));};
const charterCodeSection=document.createElement('section');charterCodeSection.className='charter-code-section';charterCodeSection.innerHTML='<h2>作成したチャーターコード</h2><div id="charter-code-list"></div>';$('plan-list').insertAdjacentElement('afterend',charterCodeSection);
// Reuse the lock control in exactly the same header position as regular schedules.
$('plan-lock-toggle').insertAdjacentElement('afterend',$('charter-lock-toggle'));$('charter-mode-heading').hidden=true;
function renderCharterCodes(){
 const season=chosenEventSeason()?.key||Toki.planListSeasonKey;
 $('charter-code-list').innerHTML=charterGroups.items.filter(g=>g.seasonKey===season).map(g=>`<button type="button" data-charter-group="${esc(g.id)}" class="charter-code-card ${Toki.charterMode&&g.id===Toki.activeCharterGroupId?'selected':''} ${g.locked?'locked-code':''}" title="${esc(g.code+' ／ '+g.day+(g.locked?' ／ ロック中':''))}">${esc(g.code)}${g.locked?'<small>🔒</small>':''}</button>`).join('')||'<span class="muted">未作成</span>';
 const pageLabel=document.querySelector('header .header-regular-label');if(pageLabel){pageLabel.hidden=false;pageLabel.textContent=Toki.charterMode?'チャーター':'定期便';pageLabel.classList.toggle('header-charter-label',!!Toki.charterMode);}
 const lock=$('charter-lock-toggle');lock.hidden=!Toki.charterMode;
 if(Toki.charterMode){const group=activeCharterGroup();$('add').disabled=!!group&&charterDayLocked(date);$('active-plan-name').innerHTML='<span class="header-plan-code '+(group?.locked?'locked-code':'')+'" style="background:#8058a5">'+esc(group?.code||'未作成')+'</span>';lock.textContent=group?.locked?'🔒 ロック解除':'🔓 ロック';lock.setAttribute('aria-pressed',String(!!group?.locked));lock.disabled=!group;}
}
function openCharterGroup(id){const group=charterGroups.items.find(g=>g.id===id);if(!group)return;Toki.activeCharterGroupId=group.id;charterGroups.active=group.id;try{persistCharterGroups();}catch(e){toast(e.message);}const records=charterRecords.filter(c=>c.charterGroupId===id),day=records.some(c=>c.day===date)?date:records[0]?.day||group.day;selectAppliedDate(day);enterCharterMode();}
$('charter-code-list').onclick=e=>{const b=e.target.closest('[data-charter-group]');if(b)openCharterGroup(b.dataset.charterGroup);};
const charterCodeDialog=document.createElement('dialog');charterCodeDialog.id='charter-code-dialog';charterCodeDialog.innerHTML='<h2>チャーターコードを作成</h2><p id="charter-code-season"></p><label>チャーターコード <span class="charter-code-prefix">CF</span><select id="charter-code-number" aria-label="チャーターコードの番号">'+Array.from({length:999},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join('')+'</select></label><p><label>運航日 <input id="charter-code-day" type="date"></label></p><div class="actions"><button id="charter-code-create" class="primary">作成</button><button id="charter-code-cancel">キャンセル</button></div>';document.body.appendChild(charterCodeDialog);
function refreshCharterCodeNumbers(){const used=new Set(charterGroups.items.filter(g=>g.seasonKey===charterCodeDialog._season?.key).map(g=>g.code));for(const option of $('charter-code-number').querySelectorAll('option'))option.disabled=used.has('CF'+option.value);if(used.has('CF'+$('charter-code-number').value))$('charter-code-number').value=[...$('charter-code-number').querySelectorAll('option')].find(o=>!o.disabled)?.value||'';}
$('charters-open').onclick=()=>{const season=chosenEventSeason();if(!season){toast('年度と夏・冬ダイヤを選択してください。');return;}
 const onCharterPage=Toki.charterMode&&!showingSettings&&!showingIntegrated&&!(typeof showingPalette!=='undefined'&&showingPalette);
 if(!onCharterPage){const group=charterGroups.items.find(g=>g.id===Toki.activeCharterGroupId&&g.seasonKey===season.key)||charterGroups.items.find(g=>g.seasonKey===season.key);if(group)openCharterGroup(group.id);else{Toki.activeCharterGroupId='';if(date<season.from||date>season.to)date=season.from;enterCharterMode();}return;}
 charterCodeDialog._season=season;$('charter-code-season').textContent=season.key+' ／ チャーターコード';$('charter-code-number').value=nextCharterCode(season.key).slice(2);refreshCharterCodeNumbers();$('charter-code-day').min=season.from;$('charter-code-day').max=season.to;$('charter-code-day').value=date>=season.from&&date<=season.to?date:season.from;charterCodeDialog.showModal();};
$('charter-code-cancel').onclick=()=>{Toki.addAfterCharterCode=false;charterCodeDialog.close();};
$('charter-code-create').onclick=()=>{const season=charterCodeDialog._season,day=$('charter-code-day').value,code='CF'+$('charter-code-number').value;if(!season||!validDate(day)||day<season.from||day>season.to){toast('選択シーズン内の運航日を指定してください。');return;}if(!/^CF[1-9][0-9]{0,2}$/.test(code)||charterGroups.items.some(g=>g.seasonKey===season.key&&g.code===code)){toast('このチャーターコードは使用済みです。');return;}const group={id:'G'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),code,seasonKey:season.key,day,locked:false};charterGroups.items.push(group);try{persistCharterGroups();charterCodeDialog.close();openCharterGroup(group.id);if(Toki.addAfterCharterCode){Toki.addAfterCharterCode=false;$('add').onclick();}}catch(e){charterGroups.items=charterGroups.items.filter(g=>g.id!==group.id);toast(e.message);}};
$('charter-lock-toggle').onclick=()=>{const group=activeCharterGroup();if(!group)return;const before=!!group.locked;group.locked=!before;try{persistCharterGroups();charterModeDraft=null;render();renderSidebar();}catch(e){group.locked=before;toast(e.message);}};
const renderBeforeCharterCodes=render;render=function(){renderBeforeCharterCodes();renderCharterCodes();};const sidebarBeforeCharterCodes=renderSidebar;renderSidebar=function(){sidebarBeforeCharterCodes();renderCharterCodes();};renderCharterCodes();

Toki.currentCharterCode=()=>activeCharterGroup()?.code||'';

// Draft charter records remain separate from the operations/calendar snapshot.
const CHARTER_APPLIED_KEY='toki-charter-applied-v1';let appliedCharterRecords=[],charterAppliedWritable=true;
try{const raw=localStorage.getItem(CHARTER_APPLIED_KEY);if(raw){const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||parsed.some(c=>!c||!validDate(c.day)||typeof c.name!=='string'||!airports[c.from]||!airports[c.to]))throw Error('invalid');appliedCharterRecords=parsed;}else{appliedCharterRecords=structuredClone(charterRecords);localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(appliedCharterRecords));}}catch(e){charterAppliedWritable=false;toast('適用済みチャーターを読み込めません。既存データは上書きしません。');}
function charterDraftFlights(day){return [...charterRecords.filter(c=>c.day===day&&(!Toki.activeCharterGroupId||c.charterGroupId===Toki.activeCharterGroupId)),...appliedCharterRecords.filter(c=>c.day===day&&Toki.activeCharterGroupId&&c.charterGroupId!==Toki.activeCharterGroupId)].map(c=>({...c,id:c.name,charter:true,color:c.color||'#8058a5'}));}
Toki.charterFlights=day=>appliedCharterRecords.filter(c=>c.day===day).map(c=>({...c,id:c.name,charter:true,color:c.color||'#8058a5'}));
function charterRecordInScope(c){return c.day===date&&(!Toki.activeCharterGroupId||c.charterGroupId===Toki.activeCharterGroupId);}
function charterApplySignature(records){return JSON.stringify(records.map(c=>({name:c.name,from:c.from,to:c.to,dep:c.dep,arr:c.arr,aircraft:c.aircraft,color:c.color||'#8058a5',blockUnset:!!c.blockUnset})).sort((a,b)=>a.name.localeCompare(b.name)));}
function charterHasPendingApplication(){return charterApplySignature(charterRecords.filter(charterRecordInScope))!==charterApplySignature(appliedCharterRecords.filter(charterRecordInScope));}
const charterApplyActions=document.createElement('div');charterApplyActions.id='charter-apply-actions';charterApplyActions.className='actions';charterApplyActions.innerHTML='<span id="charter-apply-status" class="muted"></span><button id="charter-apply" class="primary">適用</button><button id="charter-revert-applied">適用済みダイヤに戻す</button>';$('stats').insertAdjacentElement('beforebegin',charterApplyActions);
function renderCharterApplyActions(){charterApplyActions.hidden=!Toki.charterMode;if(!Toki.charterMode)return;const pending=charterHasPendingApplication(),locked=charterDayLocked(date);$('charter-apply').disabled=!pending||locked||!charterAppliedWritable;$('charter-apply').classList.toggle('application-pending',pending);$('charter-revert-applied').disabled=!pending||locked||!charterAppliedWritable;$('charter-apply-status').textContent=pending?'未適用の変更あり':'適用済み';}
$('charter-apply').onclick=()=>{if(!Toki.charterMode||charterDayLocked(date)||!charterAppliedWritable)return;const draft=charterRecords.filter(charterRecordInScope);try{if(draft.some(f=>f.name==='BV'||f.blockUnset))throw Error('便名とブロックタイムを入力してください。');const regular=appliedPlansForDate(date).flatMap(p=>{const data=p.id===selectedPlan()?.id?state:p.data;return data.days[date]||[];}),other=appliedCharterRecords.filter(c=>c.day===date&&!charterRecordInScope(c));if(draft.some(f=>regular.some(r=>r.id===f.name)||other.some(c=>c.name===f.name)))throw Error('同じ日に便名が重複しています。');const next=[...appliedCharterRecords.filter(c=>!charterRecordInScope(c)),...structuredClone(draft)];localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(next));appliedCharterRecords=next;render();renderSidebar();toast('チャーターを適用しました。');}catch(e){toast(e.message||'チャーターを適用できませんでした。');}};
$('charter-revert-applied').onclick=()=>{if(!Toki.charterMode||charterDayLocked(date)||!charterAppliedWritable)return;try{const next=[...charterRecords.filter(c=>!charterRecordInScope(c)),...structuredClone(appliedCharterRecords.filter(charterRecordInScope))];localStorage.setItem(CHARTERS_KEY,JSON.stringify(next));charterRecords=next;charterModeDraft=null;charterHistories.delete((Toki.activeCharterGroupId||'')+'|'+date);activeCharterHistory();render();renderSidebar();toast('適用済みダイヤに戻しました。');}catch(e){toast('チャーターを戻せませんでした。');}};
// Allocation changes made directly in the integrated view remain immediate.
const saveChartersBeforeApplied=saveCharters;saveCharters=function(next){if(Toki.charterMode)return saveChartersBeforeApplied(next);const old=appliedCharterRecords,ids=new Set(next.map(c=>c.recordId)),nextApplied=old.filter(c=>ids.has(c.recordId)).map(c=>{const draft=next.find(d=>d.recordId===c.recordId);return draft?{...c,aircraft:draft.aircraft}:c;});localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(nextApplied));appliedCharterRecords=nextApplied;try{return saveChartersBeforeApplied(next);}catch(e){appliedCharterRecords=old;try{localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(old));}catch(ignore){}throw e;}};
const renderBeforeCharterApply=render;render=function(){renderBeforeCharterApply();renderCharterApplyActions();};const sidebarBeforeCharterApply=renderSidebar;renderSidebar=function(){sidebarBeforeCharterApply();renderCharterApplyActions();};render();

function syncAppliedCharterAllocations(){const next=appliedCharterRecords.map(c=>{const draft=charterRecords.find(d=>d.recordId===c.recordId);return draft?{...c,aircraft:draft.aircraft}:c;});localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(next));appliedCharterRecords=next;}

// Each year/season has its own charter-code namespace and active selection.
let lastCharterSeasonScope='';
const seasonButtonsBeforeCharterScope=updateSeasonButtons;updateSeasonButtons=function(){
 seasonButtonsBeforeCharterScope();const season=chosenEventSeason(),key=season?.key||'';$('charters-open').disabled=!season?.available;
 if(Toki.charterMode&&key!==lastCharterSeasonScope){lastCharterSeasonScope=key;const current=activeCharterGroup(),group=charterGroups.items.find(g=>g.seasonKey===key&&g.id===current?.id)||charterGroups.items.find(g=>g.seasonKey===key);Toki.activeCharterGroupId=group?.id||'';charterModeDraft=null;if(season&&(date<season.from||date>season.to))date=season.from;render();}
 renderCharterCodes();
};
updateSeasonButtons();

// Repair only the imported Saga charter, preserving genuine Sado flights.
(function repairSagaAirportCode(){
 const isSaga=c=>c.source==='https://tokiair.com/news/7189/'||/^Csaga/.test(c.recordId||'');
 const fix=records=>records.map(c=>isSaga(c)&&(c.from==='SDS'||c.to==='SDS')?{...c,from:c.from==='SDS'?'HSG':c.from,to:c.to==='SDS'?'HSG':c.to}:c);
 const draft=fix(charterRecords),applied=fix(appliedCharterRecords);
 if(JSON.stringify(draft)===JSON.stringify(charterRecords)&&JSON.stringify(applied)===JSON.stringify(appliedCharterRecords))return;
 const oldDraft=charterRecords,oldApplied=appliedCharterRecords;
 try{if(!localStorage.getItem('toki-before-saga-airport-repair'))localStorage.setItem('toki-before-saga-airport-repair',JSON.stringify({draft:oldDraft,applied:oldApplied}));localStorage.setItem(CHARTERS_KEY,JSON.stringify(draft));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(applied));charterRecords=draft;appliedCharterRecords=applied;airports.HSG='佐賀';charterModeDraft=null;render();renderSidebar();}catch(e){try{localStorage.setItem(CHARTERS_KEY,JSON.stringify(oldDraft));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(oldApplied));}catch(ignore){}toast('佐賀チャーターの空港コードを保存できませんでした。');}
})();

// Context actions retain charter group IDs when renaming and copy as unapplied drafts.
const charterContextMenu=document.createElement('div');charterContextMenu.id='charter-code-context-menu';charterContextMenu.className='plan-context-menu';charterContextMenu.hidden=true;charterContextMenu.setAttribute('role','menu');charterContextMenu.innerHTML='<button id="charter-context-rename" role="menuitem">チャーターコードを変更</button><button id="charter-context-copy" role="menuitem">コピーを作成</button><button id="charter-context-delete" role="menuitem" class="danger-action">削除</button>';document.body.appendChild(charterContextMenu);let charterContextId='';
function closeCharterContext(){charterContextMenu.hidden=true;charterContextId='';}
function mutateCharterCodes(action){if(!charterGroupsWritable||!charterAppliedWritable)throw Error('保存済みデータの確認が必要なため変更できません。');const before={groups:structuredClone(charterGroups),draft:structuredClone(charterRecords),applied:structuredClone(appliedCharterRecords),active:Toki.activeCharterGroupId};try{const result=action();persistCharterGroups();localStorage.setItem(CHARTERS_KEY,JSON.stringify(charterRecords));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(appliedCharterRecords));charterModeDraft=null;render();renderSidebar();return result;}catch(e){charterGroups=before.groups;charterRecords=before.draft;appliedCharterRecords=before.applied;Toki.activeCharterGroupId=before.active;try{persistCharterGroups();localStorage.setItem(CHARTERS_KEY,JSON.stringify(charterRecords));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(appliedCharterRecords));}catch(ignore){}throw e;}}
function renameCharterCode(id,code){const group=charterGroups.items.find(g=>g.id===id);if(!group)throw Error('チャーターコードが見つかりません。');if(group.locked)throw Error('ロックを解除してからコードを変更してください。');if(!/^CF[1-9][0-9]{0,2}$/.test(code)||charterGroups.items.some(g=>g.id!==id&&g.seasonKey===group.seasonKey&&g.code===code))throw Error('未使用のチャーターコードを選択してください。');return mutateCharterCodes(()=>{group.code=code;});}
function copyCharterCode(id){const source=charterGroups.items.find(g=>g.id===id);if(!source)throw Error('チャーターコードが見つかりません。');return mutateCharterCodes(()=>{const group={...structuredClone(source),id:'G'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),code:nextCharterCode(source.seasonKey),locked:false};if(!/^CF[1-9][0-9]{0,2}$/.test(group.code))throw Error('空きコードがありません。');charterGroups.items.push(group);const sourceDraft=charterRecords.filter(c=>c.charterGroupId===id),records=sourceDraft.length?sourceDraft:appliedCharterRecords.filter(c=>c.charterGroupId===id);charterRecords.push(...records.map(c=>({...structuredClone(c),charterGroupId:group.id,recordId:'C'+Date.now().toString(36)+Math.random().toString(36).slice(2,10)})));return group.id;});}
function deleteCharterCode(id){const group=charterGroups.items.find(g=>g.id===id);if(!group)return false;if(group.locked)throw Error('ロックを解除してから削除してください。');const applied=appliedCharterRecords.filter(c=>c.charterGroupId===id).length;if(!confirm(group.code+'を削除しますか？'+(applied?' 適用済みの'+applied+'便も取り消します。':'')))return false;mutateCharterCodes(()=>{charterGroups.items=charterGroups.items.filter(g=>g.id!==id);charterRecords=charterRecords.filter(c=>c.charterGroupId!==id);appliedCharterRecords=appliedCharterRecords.filter(c=>c.charterGroupId!==id);if(Toki.activeCharterGroupId===id){Toki.activeCharterGroupId=charterGroups.items.find(g=>g.seasonKey===group.seasonKey)?.id||'';charterGroups.active=Toki.activeCharterGroupId;}});for(const key of charterHistories.keys())if(key.startsWith(id+'|'))charterHistories.delete(key);return true;}
const renameCharterDialog=document.createElement('dialog');renameCharterDialog.id='rename-charter-code-dialog';renameCharterDialog.innerHTML='<h2>チャーターコードを変更</h2><label>チャーターコード <span class="charter-code-prefix">CF</span><select id="rename-charter-number"></select></label><div class="actions" style="margin-top:14px"><button id="rename-charter-save" class="primary">変更</button><button id="rename-charter-cancel">キャンセル</button></div>';document.body.appendChild(renameCharterDialog);let renamingCharterId='';
$('charter-code-list').addEventListener('contextmenu',e=>{const card=e.target.closest('[data-charter-group]');if(!card)return;e.preventDefault();const group=charterGroups.items.find(g=>g.id===card.dataset.charterGroup);if(!group)return;closePlanMenu?.();charterContextId=group.id;$('charter-context-rename').disabled=!!group.locked;$('charter-context-delete').disabled=!!group.locked;charterContextMenu.hidden=false;charterContextMenu.style.left=Math.max(8,Math.min(e.clientX,window.innerWidth-230))+'px';charterContextMenu.style.top=Math.max(8,Math.min(e.clientY,window.innerHeight-charterContextMenu.offsetHeight-8))+'px';$('charter-context-copy').focus();});
$('charter-context-rename').onclick=()=>{const group=charterGroups.items.find(g=>g.id===charterContextId);closeCharterContext();if(!group||group.locked)return;renamingCharterId=group.id;const used=new Set(charterGroups.items.filter(g=>g.id!==group.id&&g.seasonKey===group.seasonKey).map(g=>g.code));$('rename-charter-number').innerHTML=Array.from({length:999},(_,i)=>{const n=i+1;return '<option value="'+n+'" '+(used.has('CF'+n)?'disabled':'')+'>'+n+(used.has('CF'+n)?'（使用済み）':'')+'</option>';}).join('');$('rename-charter-number').value=group.code.slice(2);renameCharterDialog.showModal();};
$('rename-charter-save').onclick=()=>{try{renameCharterCode(renamingCharterId,'CF'+$('rename-charter-number').value);renameCharterDialog.close();}catch(e){toast(e.message);}};$('rename-charter-cancel').onclick=()=>renameCharterDialog.close();
$('charter-context-copy').onclick=()=>{const id=charterContextId;closeCharterContext();try{const copy=copyCharterCode(id);openCharterGroup(copy);toast('コピーを作成しました。運航へ反映するには「適用」を押してください。');}catch(e){toast(e.message);}};
$('charter-context-delete').onclick=()=>{const id=charterContextId;closeCharterContext();try{deleteCharterCode(id);}catch(e){toast(e.message);}};
document.addEventListener('pointerdown',e=>{if(!charterContextMenu.contains(e.target))closeCharterContext();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCharterContext();});document.addEventListener('scroll',closeCharterContext,true);window.addEventListener('resize',closeCharterContext);

// One-time removal requested for 2027 Sado charters; retain an exact recoverable backup.
(function remove2027SadoCharters(){
 const marker='toki-remove-2027-sado-charters-v1';if(localStorage.getItem(marker))return;
 const target=c=>typeof c.day==='string'&&c.day.startsWith('2027-')&&(c.from==='SDS'||c.to==='SDS');
 const removed=[...charterRecords,...appliedCharterRecords].filter(target);if(!removed.length){localStorage.setItem(marker,'1');return;}
 const before={draft:structuredClone(charterRecords),applied:structuredClone(appliedCharterRecords),groups:structuredClone(charterGroups)},ids=new Set(removed.map(c=>c.charterGroupId).filter(Boolean));
 try{
 localStorage.setItem('toki-before-remove-2027-sado-charters',JSON.stringify(before));
 const draft=charterRecords.filter(c=>!target(c)),applied=appliedCharterRecords.filter(c=>!target(c)),groups=structuredClone(charterGroups);
 groups.items=groups.items.filter(g=>!ids.has(g.id)||draft.some(c=>c.charterGroupId===g.id)||applied.some(c=>c.charterGroupId===g.id));
 if(!groups.items.some(g=>g.id===groups.active))groups.active=groups.items[0]?.id||'';
 localStorage.setItem(CHARTERS_KEY,JSON.stringify(draft));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(applied));localStorage.setItem(CHARTER_GROUPS_KEY,JSON.stringify(groups));localStorage.setItem(marker,'1');
 charterRecords=draft;appliedCharterRecords=applied;charterGroups=groups;if(!groups.items.some(g=>g.id===Toki.activeCharterGroupId))Toki.activeCharterGroupId=groups.active;charterModeDraft=null;for(const key of charterHistories.keys())if([...ids].some(id=>key.startsWith(id+'|')))charterHistories.delete(key);render();renderSidebar();
 }catch(e){try{localStorage.setItem(CHARTERS_KEY,JSON.stringify(before.draft));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(before.applied));localStorage.setItem(CHARTER_GROUPS_KEY,JSON.stringify(before.groups));localStorage.removeItem(marker);}catch(ignore){}toast('佐渡チャーターを削除できませんでした。');}
})();
