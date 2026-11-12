function hasPendingApplication(){
 const applied=state.periods.find(p=>p.id===activePeriodId)||state.periods[0];
 if(!applied)return currentFlights().length>0;
 const ranges=[{start:$('period-start').value,end:$('period-end').value,weekdays:selectedWeekdays()},...extraPeriodRanges];
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const normalized=(rs,fallback)=>rs.map(r=>({start:r.start,end:r.end,weekdays:[...(r.weekdays||fallback)].sort()}));
 if(!same(normalized(ranges,selectedWeekdays()),normalized(applied.ranges||[{start:applied.start,end:applied.end}],applied.weekdays)))return true;
 if(!same(currentFlights(),applied.flights||[]))return true;
 if(applied.machines&&!same(state.machines,applied.machines))return true;
 if(applied.turn!==undefined&&state.turn!==applied.turn)return true;
 if(!same(state.constraints||[],applied.constraints||[]))return true;
 if(!same(state.acceptedIssueKeys||[],applied.acceptedIssueKeys||[]))return true;
 if(Toki.assignedPlanId&&typeof selectedPlan==='function'&&applied.dates.some(day=>Toki.assignedPlanId(day)!==selectedPlan()?.id))return true;
 return false;
}
// Period templates are materialized into daily records for timeline checks and exports.
let activePeriodId='';
let extraPeriodRanges=[];
function renderExtraRanges(){$('period-remove-first').disabled=extraPeriodRanges.length===0;const lower=state.season?.from||START,upper=state.season?.to||END;$('period-extra-ranges').innerHTML=extraPeriodRanges.map((r,i)=>`<div class="extra-period-range"><span>適用期間 ${i+2}</span><input type="date" data-range-index="${i}" data-range-key="start" value="${esc(r.start)}" min="${lower}" max="${upper}" aria-label="追加期間の開始日"><span>〜</span><input type="date" data-range-index="${i}" data-range-key="end" value="${esc(r.end)}" min="${lower}" max="${upper}" aria-label="追加期間の終了日"><button data-remove-range="${i}">削除</button><span class="range-weekday-controls"><span>運航曜日</span>${[1,2,3,4,5,6,0].map(day=>`<label><input type="checkbox" data-range-index="${i}" data-range-weekday="${day}" ${(r.weekdays||selectedWeekdays()).includes(day)?'checked':''}>${'日月火水木金土'[day]}</label>`).join('')}</span></div>`).join('');}
function loadExtraRanges(p){extraPeriodRanges=structuredClone(p?.ranges?.slice(1)||[]).map(r=>({...r,weekdays:r.weekdays||p.weekdays||selectedWeekdays()}));renderExtraRanges();}

let automaticPeriodUpdate=false,periodLoadedState=null,periodDraftChanged=false;
state.periods=Array.isArray(state.periods)?state.periods:[];
function periodDates(start,end,weekdays){
 if(!validDate(start)||!validDate(end)||start>end)throw Error('期間は2026年4月1日〜2036年3月31日内で、開始日から終了日の順に指定してください。');
 if(state.season&&(start<state.season.from||end>state.season.to))throw Error('検討区間は '+state.season.from+'〜'+state.season.to+' のシーズン内で指定してください。');
 if(!weekdays.length)throw Error('運航曜日を1つ以上選んでください。');
 return Object.keys(state.days).filter(d=>d>=start&&d<=end&&weekdays.includes(new Date(d+'T12:00:00+09:00').getUTCDay())).sort();
}
function selectedWeekdays(){return [...$('period-weekdays').querySelectorAll('input:checked')].map(el=>Number(el.value));}
function refreshPeriods(){
 const lower=state.season?.from||START,upper=state.season?.to||END;for(const id of ['period-start','period-end']){$(id).min=lower;$(id).max=upper;}
 if(periodLoadedState!==state){periodDraftChanged=false;periodLoadedState=state;activePeriodId=state.editingPeriodId||'';const chosen=state.periods.find(p=>p.id===activePeriodId)||state.periods.find(p=>p.dates.includes(date));loadExtraRanges(chosen);if(chosen){activePeriodId=chosen.id;$('period-name').value=chosen.name;$('period-start').value=chosen.ranges?.[0]?.start||chosen.start;$('period-end').value=chosen.ranges?.[0]?.end||chosen.end;for(const input of $('period-weekdays').querySelectorAll('input'))input.checked=(chosen.ranges?.[0]?.weekdays||chosen.weekdays).includes(Number(input.value));}else if(state.season){$('period-name').value=state.season.name;$('period-start').value=state.season.from;$('period-end').value=state.season.to;}else{$('period-name').value='検討ダイヤ';const first=date.slice(0,7)+'-01',last=new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),0)).toISOString().slice(0,10);$('period-start').value=first<START?START:first;$('period-end').value=last>END?END:last;}}
 $('period-select').innerHTML='<option value="">検討区間を選択</option>'+state.periods.map(p=>`<option value="${esc(p.id)}" ${activePeriodId===p.id?'selected':''}>${esc(p.name)}（${p.start}〜${p.end}）</option>`).join('');
 const p=state.periods.find(p=>p.id===activePeriodId);
 $('period-mode').textContent=p?`検討区間：${p.start} 〜 ${p.end} ／ ${p.ranges?.length||1}期間・${p.dates.length}日`:'検討区間を設定';
 $('period-stop').disabled=!p;
 $('period-save').textContent='適用';
 const pending=hasPendingApplication();$('period-save').disabled=!pending;
 $('period-revert').disabled=!pending||!p;
 $('period-save').classList.toggle('application-pending',pending);
 if(pending)$('period-mode').textContent='未適用の変更あり';
}
function syncPeriod(){
 const p=state.periods.find(p=>p.id===activePeriodId);if(!p)return;
 const template=structuredClone(currentFlights());
 for(const d of p.dates)state.days[d]=structuredClone(template);
 p.flights=template;
}
const originalCommit=commit;
commit=function(){
 periodDraftChanged=true;originalCommit();refreshPeriods();
};
const originalDateChange=$('date').onchange;
$('date').onchange=e=>{activePeriodId='';dragUndo=null;$('undo-drag').disabled=true;originalDateChange(e);activePeriodId=state.periods.find(p=>p.dates.includes(date))?.id||state.editingPeriodId||'';state.editingPeriodId=activePeriodId;periodLoadedState=null;refreshPeriods();};
const originalStep=step;
step=function(n){activePeriodId='';dragUndo=null;$('undo-drag').disabled=true;originalStep(n);activePeriodId=state.periods.find(p=>p.dates.includes(date))?.id||state.editingPeriodId||'';state.editingPeriodId=activePeriodId;periodLoadedState=null;refreshPeriods();};
$('period-save').onclick=()=>{
 try{
  const ranges=[{start:$('period-start').value,end:$('period-end').value,weekdays:selectedWeekdays()},...structuredClone(extraPeriodRanges).map(r=>({...r,weekdays:r.weekdays||selectedWeekdays()}))],weekdays=[...new Set(ranges.flatMap(r=>r.weekdays))].sort(),dates=[...new Set(ranges.flatMap(r=>periodDates(r.start,r.end,r.weekdays)))].sort(),start=ranges.map(r=>r.start).sort()[0],end=ranges.map(r=>r.end).sort().at(-1),name=(typeof selectedPlan==='function'?selectedPlan()?.name:'')||state.season?.name||'適用期間';
  if(!name||name.length>60)throw Error('期間名を1〜60文字で入力してください。');
  if(!dates.length)throw Error('指定した期間内に対象曜日がありません。');
  const overlap=state.periods.filter(p=>p.id!==activePeriodId&&p.dates.some(d=>dates.includes(d)));
  const template=structuredClone(currentFlights());
  for(const p of overlap)p.dates=p.dates.filter(d=>!dates.includes(d));
  state.periods=state.periods.filter(p=>p.dates.length);
  let p=state.periods.find(p=>p.id===activePeriodId)||state.periods[0];
  if(!p){p={id:'P'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,start,end,ranges,weekdays,dates,flights:template};state.periods.push(p);}else Object.assign(p,{name,start,end,ranges,weekdays,dates,flights:template});
  p.machines=structuredClone(state.machines);p.turn=state.turn;p.constraints=structuredClone(state.constraints||[]);p.acceptedIssueKeys=structuredClone(state.acceptedIssueKeys||[]);
  state.periods=[p];for(const d of dates)state.days[d]=structuredClone(template);if(Toki.assignAppliedDates)Toki.assignAppliedDates(dates);
  activePeriodId=p.id;state.editingPeriodId=p.id;periodDraftChanged=false;Toki.dateViewUnset=false;if(!dates.includes(date))date=dates[0];if(!automaticPeriodUpdate){dragUndo=null;$('undo-drag').disabled=true;save();render();refreshPeriods();}
  if(!automaticPeriodUpdate)toast(`表示中のダイヤを${dates.length}日分に適用しました。`);
 }catch(err){toast(err.message);if(automaticPeriodUpdate)throw err;}
};
$('period-select').onchange=e=>{
 activePeriodId=e.target.value;state.editingPeriodId=activePeriodId;periodDraftChanged=false;
 const p=state.periods.find(p=>p.id===activePeriodId);
 if(p){date=p.dates[0];$('period-name').value=p.name;$('period-start').value=p.ranges?.[0]?.start||p.start;$('period-end').value=p.ranges?.[0]?.end||p.end;loadExtraRanges(p);for(const input of $('period-weekdays').querySelectorAll('input'))input.checked=(p.ranges?.[0]?.weekdays||p.weekdays).includes(Number(input.value));render();}
 dragUndo=null;$('undo-drag').disabled=true;save();refreshPeriods();
};
$('period-stop').onclick=()=>{activePeriodId='';refreshPeriods();toast('期間編集を終了しました。以後の変更は表示日のみに反映されます。');};
// Import replaces period metadata too; avoid accidentally applying a prior selection.
const originalImport=$('file').onchange;
$('file').onchange=async e=>{activePeriodId='';await originalImport(e);state.periods=Array.isArray(state.periods)?state.periods:[];refreshPeriods();};
refreshPeriods();

for(const id of ['period-name','period-start','period-end'])$(id).onchange=()=>{periodDraftChanged=true;refreshPeriods();};
$('period-weekdays').onchange=()=>{periodDraftChanged=true;refreshPeriods();};

$('period-new').onclick=()=>{
 const previous=state.periods.find(p=>p.id===activePeriodId),season=state.season;
 const lower=season?.from||START,upper=season?.to||END;
 const candidate=previous?new Date(Date.parse(previous.end+'T00:00:00Z')+86400000).toISOString().slice(0,10):lower;
 const start=candidate<=upper?candidate:lower;
 activePeriodId='';state.editingPeriodId='';periodDraftChanged=true;
 loadExtraRanges(null);$('period-name').value='検討区間 '+(state.periods.length+1);$('period-start').value=start;$('period-end').value=upper;
 refreshPeriods();$('period-start').focus();
};

$('period-add-range').onclick=()=>{
 const previous=extraPeriodRanges.at(-1)||{end:$('period-end').value},upper=state.season?.to||END;
 const next=new Date(Date.parse(previous.end+'T00:00:00Z')+86400000);
 const start=Number.isFinite(next.getTime())&&next.toISOString().slice(0,10)<=upper?next.toISOString().slice(0,10):$('period-start').value;
 extraPeriodRanges.push({start,end:upper,weekdays:[...(extraPeriodRanges.at(-1)?.weekdays||selectedWeekdays())]});periodDraftChanged=true;renderExtraRanges();refreshPeriods();
};
$('period-extra-ranges').onchange=e=>{const i=Number(e.target.dataset.rangeIndex),key=e.target.dataset.rangeKey;if(!extraPeriodRanges[i])return;if(e.target.hasAttribute('data-range-weekday')){const day=Number(e.target.dataset.rangeWeekday),days=new Set(extraPeriodRanges[i].weekdays||selectedWeekdays());if(e.target.checked)days.add(day);else days.delete(day);extraPeriodRanges[i].weekdays=[...days].sort();}else if(['start','end'].includes(key))extraPeriodRanges[i][key]=e.target.value;periodDraftChanged=true;refreshPeriods();};
$('period-extra-ranges').onclick=e=>{const button=e.target.closest('[data-remove-range]');if(button){extraPeriodRanges.splice(Number(button.dataset.removeRange),1);periodDraftChanged=true;renderExtraRanges();refreshPeriods();}};

$('period-remove-first').onclick=()=>{
 if(!extraPeriodRanges.length)return;
 const first=extraPeriodRanges.shift();
 $('period-start').value=first.start;$('period-end').value=first.end;for(const input of $('period-weekdays').querySelectorAll('input'))input.checked=(first.weekdays||selectedWeekdays()).includes(Number(input.value));
 periodDraftChanged=true;renderExtraRanges();refreshPeriods();
};

$('period-revert').onclick=()=>{
 const applied=state.periods.find(p=>p.id===activePeriodId)||state.periods[0];if(!applied)return;
 state.flights=structuredClone(applied.flights||state.days[applied.dates[0]]||[]);
 if(applied.machines)state.machines=structuredClone(applied.machines);
 if(applied.turn!==undefined)state.turn=applied.turn;state.constraints=structuredClone(applied.constraints||[]);state.acceptedIssueKeys=structuredClone(applied.acceptedIssueKeys||[]);
 activePeriodId=applied.id;state.editingPeriodId=applied.id;
 periodLoadedState=null;periodDraftChanged=false;Toki.dateViewUnset=false;
 dragUndo=null;$('undo-drag').disabled=true;
 refreshPeriods();save();render();refreshPeriods();
 toast('最後に適用した内容に戻しました。');
};

// Northern scheduling seasons: last Sunday in March / last Sunday in October.
function seasonRange(year,kind){
 if(!Number.isInteger(year)||year<2026||year>2036||!['S','W'].includes(kind))throw Error('シーズンの指定が正しくありません。');
 const lastSunday=(y,m)=>{const d=new Date(Date.UTC(y,m,0));d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d.toISOString().slice(0,10);};
 const start=lastSunday(year,kind==='S'?3:10),next=lastSunday(kind==='S'?year:year+1,kind==='S'?10:3);
 const end=new Date(Date.parse(next+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 return {key:kind+year,year,kind,name:`${year}年 ${kind==='S'?'夏':'冬'}ダイヤ`,start,end,from:start<START?START:start,to:end>END?END:end,available:start<=END&&end>=START};
}
let pendingSeasonKind='';
function updateSeasonButtons(){
 const year=Number($('season-year').value);
 for(const kind of ['S','W']){
  const season=seasonRange(year,kind),button=$('season-'+kind),selected=pendingSeasonKind===kind;
  button.disabled=!season.available;
  button.classList.toggle('selected-season',selected);button.setAttribute('aria-pressed',String(selected));
  button.innerHTML=`<strong>${kind==='S'?'夏ダイヤ':'冬ダイヤ'} <span>${kind}${String(year).slice(-2)}</span></strong><small>${season.start.replaceAll('-','/')} – ${season.end.replaceAll('-','/')}</small>`;
 }
 const season=pendingSeasonKind?seasonRange(year,pendingSeasonKind):null;
 Toki.planListSeasonKey=season?.key||'';renderPlanList();
 $('events-open').disabled=!season?.available;if(Toki.refreshEventSidebar)Toki.refreshEventSidebar();if(Toki.refreshSeasonCalendar)Toki.refreshSeasonCalendar();
 $('create-plan').disabled=!season?.available;
 $('season-note').textContent=season?`${season.from} 〜 ${season.to}`:'';
}
function useSeasonRange(season){
 activePeriodId=state.editingPeriodId||'';dragUndo=null;$('undo-drag').disabled=true;
 const section=state.periods?.find(p=>p.id===activePeriodId);
 $('period-name').value=section?.name||season.name;$('period-start').value=section?.ranges?.[0]?.start||section?.start||season.from;$('period-end').value=section?.ranges?.[0]?.end||section?.end||season.to;loadExtraRanges(section);
 refreshPeriods();render();renderSidebar();updateSeasonButtons();
}
function openSeason(year,kind){
 const season=seasonRange(year,kind);if(!season.available)return;
 $('season-year').value=String(year);pendingSeasonKind=kind;updateSeasonButtons();
}
function usedSeasonLetters(key){return new Set(planLibrary.items.filter(p=>p.seasonKey===key||p.data?.season?.key===key).map(p=>p.name).filter(name=>/^[A-Z][0-9]{0,3}$/.test(name)));}
function createSeasonPlan(name){
 name=name.trim().toUpperCase();
 if(!/^[A-Z][0-9]{0,3}$/.test(name)){toast('ダイヤコードはA、A1、A2のように英字1文字と数字3桁以内で入力してください。');return false;}
 if(!pendingSeasonKind){toast('夏ダイヤまたは冬ダイヤを選んでください。');return false;}
 if(planLibrary.items.length>=100){toast('ダイヤは最大100件です。');return false;}
 const season=seasonRange(Number($('season-year').value),pendingSeasonKind);if(!season.available)return false;
 if(usedSeasonLetters(season.key).has(name)){toast('このシーズンでは「'+name+'」は使用済みです。別の文字を選択してください。');return false;}
 capturePlan();const next=fresh();for(const d of Object.keys(next.days))next.days[d]=[];
 next.periods=[];next.season=season;
 const id=planId();planLibrary.items.push({id,name,seasonKey:season.key,date:season.from,updated:new Date().toISOString(),data:compactPlan(next)});
 planLibrary.activeId=id;state=next;date=season.from;save();useSeasonRange(season);
 toast('「'+name+'」を作成しました。');return true;
}
$('season-year').innerHTML=Array.from({length:11},(_,i)=>`<option value="${2026+i}">FY${2026+i}</option>`).join('');
$('season-year').value=String(selectedPlan()?.data?.season?.year||2026);
$('season-year').onchange=()=>{pendingSeasonKind='';updateSeasonButtons();};
$('season-S').onclick=()=>openSeason(Number($('season-year').value),'S');
$('season-W').onclick=()=>openSeason(Number($('season-year').value),'W');
$('create-plan').onclick=()=>{
 if(!pendingSeasonKind)return;
 const season=seasonRange(Number($('season-year').value),pendingSeasonKind);
 const used=usedSeasonLetters(season.key),letters=Array.from({length:26},(_,i)=>String.fromCharCode(65+i));
 $('new-plan-options').innerHTML=letters.map(letter=>`<option value="${letter}" ${used.has(letter)?'disabled':''}>${letter}${used.has(letter)?'（使用済み）':''}</option>`).join('');
 const available=letters.find(letter=>!used.has(letter));$('new-plan-name').value=available||'';$('confirm-create-plan').disabled=false;
 if(!available)$('new-plan-name').value='A1';
 $('create-dialog-season').textContent=`${season.kind}${String(season.year).slice(-2)} ／ ${season.from} 〜 ${season.to}`;
 $('create-plan-dialog').showModal();$('new-plan-name').focus();
};
$('confirm-create-plan').onclick=()=>{if(createSeasonPlan($('new-plan-name').value))$('create-plan-dialog').close();};
$('cancel-create-plan').onclick=()=>$('create-plan-dialog').close();
$('new-plan-name').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('confirm-create-plan').onclick();}};
const renderSidebarBeforeSeasons=renderSidebar;
renderSidebar=function(){renderSidebarBeforeSeasons();updateSeasonButtons();};
const openPlanBeforeSeasons=openPlan;
openPlan=function(id){
 openPlanBeforeSeasons(id);const season=selectedPlan()?.data?.season;
 if(season&&Number.isInteger(season.year)&&season.year>=2026&&season.year<=2036&&['S','W'].includes(season.kind)){
  const normalized=seasonRange(season.year,season.kind);
  $('season-year').value=String(season.year);pendingSeasonKind=season.kind;if(normalized.available)useSeasonRange(normalized);
 }
};
const initialSeason=selectedPlan()?.data?.season;
if(initialSeason&&Number.isInteger(initialSeason.year)&&initialSeason.year>=2026&&initialSeason.year<=2036&&['S','W'].includes(initialSeason.kind)){
 pendingSeasonKind=initialSeason.kind;useSeasonRange(seasonRange(initialSeason.year,initialSeason.kind));
}
updateSeasonButtons();

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

const createPlanBeforePageSwitch=$('create-plan').onclick;
$('create-plan').onclick=()=>{
 if(Toki.charterMode){exitCharterMode();showSettingsPage(false);return;}
 if(showingSettings){showSettingsPage(false);render();renderSidebar();return;}
 return createPlanBeforePageSwitch();
};

// Independent scratch schedules: never write to the applied plan library.
let showingPalette=false,paletteSelection=new Set(),paletteDrag=null,paletteHistory=[],paletteHistoryIndex=-1;
const PALETTE_KEY='toki-schedule-palette-v1';
function emptyPalette(name='パレット1'){return {id:'Q'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,turn:state.turn,machines:structuredClone(state.machines),constraints:structuredClone(state.constraints||[]),flights:[]};}
let paletteLibrary={active:'',items:[]};try{const saved=JSON.parse(localStorage.getItem(PALETTE_KEY)||'null');if(saved&&Array.isArray(saved.items)&&saved.items.length&&saved.items.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Array.isArray(p.flights)&&Array.isArray(p.machines)))paletteLibrary=saved;}catch(e){}
if(!paletteLibrary.items.length){const draft=emptyPalette();paletteLibrary={active:draft.id,items:[draft]};}
for(const draft of paletteLibrary.items)delete draft.day;
function paletteDraft(){return paletteLibrary.items.find(p=>p.id===paletteLibrary.active)||paletteLibrary.items[0];}
function storePalette(){localStorage.setItem(PALETTE_KEY,JSON.stringify(paletteLibrary));}
const palettePage=document.createElement('div');palettePage.id='palette-page';palettePage.hidden=true;palettePage.innerHTML=`<div class="panel-title"><h1>ダイヤパレット</h1><div class="actions"><button id="palette-save-snapshot" class="primary">保存</button><button id="palette-new">＋ 新規</button><button id="palette-copy">複製</button><button id="palette-delete">削除</button></div></div><div class="actions palette-controls"><select id="palette-drafts" aria-label="作成したパレット"></select><input id="palette-name" maxlength="60" aria-label="パレット名"><label hidden>最低便間 <input id="palette-turn" type="number" min="0" max="240" style="width:55px"> 分</label></div><div class="actions palette-import"><label>年度 <select id="palette-source-year" aria-label="読み込むダイヤの年度">${Array.from({length:11},(_,i)=>2026+i).map(y=>`<option value="${y}">${y}年度</option>`).join('')}</select></label><label>シーズン <select id="palette-source-season" aria-label="読み込むダイヤのシーズン"><option value="S">夏ダイヤ</option><option value="W">冬ダイヤ</option></select></label><label>ダイヤコード <select id="palette-source" aria-label="読み込むダイヤコード"></select></label><button id="palette-load">読込</button><span class="muted">パレット内で保存・検証（運航カレンダーには反映しません）</span></div><section class="panel"><div class="panel-title"><span class="planner-page-label palette-page-label">ダイヤパレット</span><input id="palette-memo" class="timeline-memo" type="text" maxlength="500" placeholder="タイトル" aria-label="パレットのメモ"><div class="edit-history-controls palette-history" role="group" aria-label="パレットの編集履歴"><button id="palette-undo" title="戻る" aria-label="戻る">↶</button><button id="palette-redo" title="進む" aria-label="進む">↷</button></div><span id="palette-summary"></span></div><div class="scroll"><div id="palette-timeline" class="timeline"></div></div></section><div id="palette-checks" class="palette-checks"></div><section class="panel"><div class="panel-title"><h2>運航便の編集</h2><button id="palette-add" class="primary">＋ 便を追加</button></div><div class="scroll"><table><thead><tr><th>便名</th><th>出発空港</th><th>到着空港</th><th>出発</th><th>ブロックタイム</th><th>到着</th><th>機番</th><th>色</th><th></th></tr></thead><tbody id="palette-flights"></tbody></table></div></section>`;document.querySelector('main').appendChild(palettePage);
const paletteButton=document.createElement('button');paletteButton.id='palette-open';paletteButton.className='season-create';paletteButton.textContent='ダイヤパレット';document.querySelector('.sidebar-planning-menu').appendChild(paletteButton);
function rememberPalette(){const json=JSON.stringify(paletteDraft());if(paletteHistory[paletteHistoryIndex]!==json){paletteHistory.splice(paletteHistoryIndex+1);paletteHistory.push(json);if(paletteHistory.length>50)paletteHistory.shift();paletteHistoryIndex=paletteHistory.length-1;}}
function resetPaletteHistory(){paletteHistory=[];paletteHistoryIndex=-1;rememberPalette();paletteSelection.clear();}
function commitPalette(){try{storePalette();rememberPalette();renderPalette();}catch(e){toast('パレットを保存できませんでした。');}}
function paletteOriginalFlights(plan){const data=plan.id===selectedPlan()?.id?state:plan.data;return {data,flights:data.flights||data.periods?.[0]?.flights||Object.values(data.days||{}).find(fs=>fs.length)||[]};}
function paletteUniqueId(value,used){let id=value,n=1;while(used.has(id)){id=value+'-'+n++;}used.add(id);return id;}
function importPalettePlan(plan,append=false){
 if(!plan)return;const draft=paletteDraft(),{data,flights}=paletteOriginalFlights(plan);if(append&&draft.flights.length+flights.length>100){toast('便数は100便までです。');return;}
 if(!append){draft.flights=[];draft.machines=structuredClone(data.machines);draft.turn=data.turn;draft.constraints=structuredClone(data.constraints||[]);}
 const used=new Set(draft.flights.map(f=>f.id));for(const source of flights){const f=structuredClone(source),sourceMachine=data.machines.find(m=>m.id===f.aircraft);if(append){let machine=draft.machines.find(m=>m.name===sourceMachine?.name);if(sourceMachine&&!machine){const ids=new Set(draft.machines.map(m=>m.id));let i=1;while(ids.has('M'+i))i++;machine={...structuredClone(sourceMachine),id:'M'+i};draft.machines.push(machine);}f.aircraft=machine?.id||'';}f.id=paletteUniqueId(f.id,used);draft.flights.push(f);}paletteSelection.clear();commitPalette();
}
function renderPalette(){
 const p=paletteDraft(),fs=p.flights,machineOptions=id=>'<option value="">未割当</option>'+p.machines.map(m=>`<option value="${esc(m.id)}" ${m.id===id?'selected':''}>${esc(m.name+' / '+(m.type||''))}</option>`).join('');
 $('palette-drafts').innerHTML=paletteLibrary.items.map(d=>`<option value="${esc(d.id)}" ${d.id===p.id?'selected':''}>${esc(d.name)}</option>`).join('');$('palette-name').value=p.name;$('palette-memo').value=typeof p.memo==='string'?p.memo:'';$('palette-turn').value=p.turn;
 refreshPaletteSources();
 const issues=Toki.check(fs,p.machines,p.turn,[],'',p.constraints||[]),missing=fs.filter(f=>f.blockUnset),all=[...missing.map(f=>({type:'warning',text:f.id+'：ブロックタイム未入力'})),...issues];
 $('palette-checks').innerHTML=all.length?all.map(i=>`<div class="issue ${esc(i.type)}">${esc(i.text)}</div>`).join(''):'<div class="good">設定した条件内で不整合はありません。</div>';
 $('palette-summary').textContent=fs.length+'便 ／ '+formatBlock(fs.filter(f=>!f.blockUnset).reduce((n,f)=>n+minutes(f.arr)-minutes(f.dep),0))+' ／ チェック '+all.length+'件';
 const start=Math.min(360,...fs.map(f=>minutes(f.dep))),end=Math.max(1320,...fs.map(f=>minutes(f.arr))),span=end-start;
 $('palette-timeline').innerHTML=`<div class="axis"><span>機材</span><div class="hours">${Array.from({length:Math.floor(span/60)+1},(_,i)=>`<span>${clock(start+i*60)}</span>`).join('')}</div></div>`+[...p.machines,{id:'',name:'未割当'}].map(m=>{const rows=fs.filter(f=>f.aircraft===m.id).sort((a,b)=>minutes(a.dep)-minutes(b.dep)),ends=[];const bars=rows.map(f=>{let layer=ends.findIndex(e=>e<=minutes(f.dep));if(layer<0)layer=ends.length;ends[layer]=minutes(f.arr);const width=Math.max(0.5,(minutes(f.arr)-minutes(f.dep))/span*100);return `<button type="button" draggable="true" data-palette-flight="${esc(f.id)}" class="flight ${paletteSelection.has(f.id)?'palette-selected':''}" style="left:${(minutes(f.dep)-start)/span*100}%;width:${width}%;top:${8+layer*64}px;background:${barColor(f)};color:${barText(barColor(f))}" title="${esc(f.id+' '+f.from+'–'+f.to+' '+f.dep+'–'+f.arr)}"><span class="flight-bar-line">${esc(f.from+' - '+f.to)}</span><span class="flight-bar-line">${f.dep} - ${f.blockUnset?'':f.arr}</span><span class="flight-bar-line"><b>${esc(f.id)}</b> ${f.blockUnset?'':formatBlock(minutes(f.arr)-minutes(f.dep))}</span></button>`;}).join('');return `<div class="lane" style="min-height:${Math.max(100,ends.length*64+14)}px"><div class="lane-label">${m.id?paletteMachineInline(m,rows.length):`<strong>${esc(m.name)}</strong><span class="muted">${rows.length}便</span>`}</div><div class="track" data-palette-machine="${esc(m.id)}" data-palette-start="${start}" data-palette-span="${span}">${bars}</div></div>`;}).join('');
 $('palette-flights').innerHTML=fs.map((f,i)=>`<tr data-palette-index="${i}"><td><input data-palette-key="id" value="${esc(f.id)}" maxlength="24" aria-label="便名"></td><td><select data-palette-key="from">${airportOptions(f.from)}</select></td><td><select data-palette-key="to">${airportOptions(f.to)}</select></td><td><input type="time" data-palette-key="dep" value="${f.dep}"></td><td><input data-palette-key="block" value="${f.blockUnset?'':formatBlock(minutes(f.arr)-minutes(f.dep))}" placeholder=""></td><td>${f.blockUnset?'':f.arr}</td><td><select data-palette-key="aircraft">${machineOptions(f.aircraft)}</select></td><td><select data-palette-key="color" aria-label="バー色">${barPalette.map(([color,label])=>`<option value="${color}" ${barColor(f)===color?'selected':''}>${label}</option>`).join('')}</select><i class="palette-swatch" style="background:${barColor(f)}"></i></td><td><button data-palette-delete="${i}">削除</button></td></tr>`).join('');$('palette-undo').disabled=paletteHistoryIndex<=0;$('palette-redo').disabled=paletteHistoryIndex>=paletteHistory.length-1;renderSavedPalettes();
}
function showPalettePage(){if(Toki.charterMode)exitCharterMode();showSettingsPage(false);showingPalette=true;document.body.classList.add('palette-mode');$('planner-content').hidden=true;$('settings-page').hidden=true;$('integrated-page').hidden=true;document.querySelector('header.editing-header').hidden=true;palettePage.hidden=false;paletteButton.classList.add('palette-active');resetPaletteHistory();renderPalette();}
const settingsBeforePalette=showSettingsPage;showSettingsPage=function(show){showingPalette=false;document.body.classList.remove('palette-mode');palettePage.hidden=true;paletteButton.classList.remove('palette-active');settingsBeforePalette(show);};
paletteButton.onclick=showPalettePage;$('plan-list').addEventListener('click',e=>{if(showingPalette&&e.target.closest('[data-plan-id]'))showSettingsPage(false);});
const createBeforePalette=$('create-plan').onclick;$('create-plan').onclick=()=>{if(showingPalette){showSettingsPage(false);return;}return createBeforePalette();};
$('palette-new').onclick=()=>{if(paletteLibrary.items.length>=50){toast('パレットは50件までです。');return;}const p=emptyPalette('パレット'+(paletteLibrary.items.length+1));paletteLibrary.items.push(p);paletteLibrary.active=p.id;resetPaletteHistory();commitPalette();};
$('palette-copy').onclick=()=>{if(paletteLibrary.items.length>=50)return;const copy=structuredClone(paletteDraft());copy.id=emptyPalette().id;copy.name=copy.name+' コピー';paletteLibrary.items.push(copy);paletteLibrary.active=copy.id;resetPaletteHistory();commitPalette();};
$('palette-delete').onclick=()=>{if(!confirm('このパレットを削除しますか？'))return;paletteLibrary.items=paletteLibrary.items.filter(p=>p.id!==paletteDraft().id);if(!paletteLibrary.items.length)paletteLibrary.items.push(emptyPalette());paletteLibrary.active=paletteLibrary.items[0].id;resetPaletteHistory();commitPalette();};
$('palette-drafts').onchange=e=>{paletteLibrary.active=e.target.value;resetPaletteHistory();commitPalette();};$('palette-name').onchange=e=>{const name=e.target.value.trim();if(!name){renderPalette();return;}paletteDraft().name=name;commitPalette();};$('palette-turn').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<0||n>240){renderPalette();return;}paletteDraft().turn=n;commitPalette();};
$('palette-load').onclick=()=>{if(paletteDraft().flights.length&&!confirm('パレットの便を置き換えますか？'))return;importPalettePlan(planLibrary.items.find(p=>p.id===$('palette-source').value));};
$('palette-add').onclick=()=>{const p=paletteDraft();if(p.flights.length>=100)return;const used=new Set(p.flights.map(f=>f.id));p.flights.push({id:paletteUniqueId('BV',used),from:airports.KIJ?'KIJ':Object.keys(airports)[0],to:airports.NGO?'NGO':Object.keys(airports)[1],dep:'12:00',arr:'13:20',aircraft:p.machines[0]?.id||'',blockUnset:true});commitPalette();};
$('palette-flights').onchange=e=>{const field=e.target.dataset.paletteKey,row=e.target.closest('[data-palette-index]');if(!field||!row)return;const p=paletteDraft(),f=p.flights[Number(row.dataset.paletteIndex)],old=structuredClone(f);try{const value=e.target.value;if(field==='id'){const id=Toki.normalizeFlightNumber(value);if(!id||p.flights.some(g=>g!==f&&g.id===id))throw Error('便名を重複しない名前で入力してください。');f.id=id;if(Toki.applyFlightDefaults)Toki.applyFlightDefaults(f);paletteSelection.delete(old.id);}else if(field==='block'){if(!value.trim())f.blockUnset=true;else{f.arr=arrival(f.dep,parseBlock(value));f.blockUnset=false;}}else if(field==='dep'){f.arr=arrival(value,minutes(f.arr)-minutes(f.dep));f.dep=value;}else f[field]=value;commitPalette();}catch(error){Object.assign(f,old);renderPalette();toast(error.message);}};
$('palette-flights').onclick=e=>{const b=e.target.closest('[data-palette-delete]');if(!b)return;const p=paletteDraft(),index=Number(b.dataset.paletteDelete);paletteSelection.delete(p.flights[index].id);p.flights.splice(index,1);commitPalette();};
function movePaletteFlights(ids,delta,machine){const fs=paletteDraft().flights.filter(f=>ids.includes(f.id));if(fs.some(f=>minutes(f.dep)+delta<0||minutes(f.arr)+delta>=1440))throw Error('同じ日の00:00〜23:59に収めてください。');for(const f of fs){f.dep=clock(minutes(f.dep)+delta);f.arr=clock(minutes(f.arr)+delta);if(machine!==undefined)f.aircraft=machine;}commitPalette();}
$('palette-timeline').onclick=e=>{const bar=e.target.closest('[data-palette-flight]');if(!bar)return;const id=bar.dataset.paletteFlight;if(e.shiftKey)paletteSelection=new Set(paletteDraft().flights.map(f=>f.id));else if(e.ctrlKey||e.metaKey){if(paletteSelection.has(id))paletteSelection.delete(id);else paletteSelection.add(id);}else paletteSelection=new Set([id]);for(const b of $('palette-timeline').querySelectorAll('[data-palette-flight]'))b.classList.toggle('palette-selected',paletteSelection.has(b.dataset.paletteFlight));bar.focus();};
$('palette-timeline').ondragstart=e=>{const bar=e.target.closest('[data-palette-flight]');if(!bar)return;const id=bar.dataset.paletteFlight;if(!paletteSelection.has(id))paletteSelection=new Set([id]);paletteDrag={id,ids:[...paletteSelection],x:e.clientX};e.dataTransfer.setData('text/plain','パレット');e.dataTransfer.effectAllowed='move';};
$('palette-timeline').ondragover=e=>{if(paletteDrag&&e.target.closest('[data-palette-machine]'))e.preventDefault();};$('palette-timeline').ondrop=e=>{const track=e.target.closest('[data-palette-machine]'),drag=paletteDrag;if(!track||!drag)return;e.preventDefault();paletteDrag=null;try{const delta=Math.round((e.clientX-drag.x)/track.getBoundingClientRect().width*Number(track.dataset.paletteSpan)/5)*5;movePaletteFlights(drag.ids,delta,track.dataset.paletteMachine);}catch(error){toast(error.message);}};$('palette-timeline').ondragend=()=>{paletteDrag=null;};
$('palette-timeline').onkeydown=e=>{if(e.target.closest('input,select,textarea'))return;if(!['ArrowLeft','ArrowRight','Delete'].includes(e.key)||!paletteSelection.size)return;e.preventDefault();if(e.key==='Delete'){paletteDraft().flights=paletteDraft().flights.filter(f=>!paletteSelection.has(f.id));paletteSelection.clear();commitPalette();return;}try{const focus=e.target.dataset.paletteFlight;movePaletteFlights([...paletteSelection],e.key==='ArrowRight'?5:-5);[...$('palette-timeline').querySelectorAll('[data-palette-flight]')].find(b=>b.dataset.paletteFlight===focus)?.focus();}catch(error){toast(error.message);}};
function restorePalette(n){const index=paletteHistoryIndex+n;if(index<0||index>=paletteHistory.length)return;paletteHistoryIndex=index;const snapshot=JSON.parse(paletteHistory[index]);paletteLibrary.items[paletteLibrary.items.findIndex(p=>p.id===snapshot.id)]=snapshot;paletteSelection.clear();storePalette();renderPalette();}
$('palette-undo').onclick=()=>restorePalette(-1);$('palette-redo').onclick=()=>restorePalette(1);

// Keep keyboard undo inside the scratch page, including when sidebar buttons have focus.
document.addEventListener('keydown',e=>{if(!showingPalette||!(e.ctrlKey||e.metaKey)||e.altKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;const key=e.key.toLowerCase();if(key==='z'||key==='y'){e.preventDefault();e.stopImmediatePropagation();restorePalette(key==='y'||e.shiftKey?1:-1);}},true);

let paletteSourceInitialized=false;
function refreshPaletteSources(){
 if(!paletteSourceInitialized){const key=selectedPlan()?.seasonKey||selectedPlan()?.data?.season?.key||calendarSeason().key;if(/^[SW]20\d{2}$/.test(key)){$('palette-source-year').value=key.slice(1);$('palette-source-season').value=key[0];}paletteSourceInitialized=true;}
 const key=$('palette-source-season').value+$('palette-source-year').value,plans=planLibrary.items.filter(p=>(p.seasonKey||p.data?.season?.key)===key),prior=$('palette-source').value;
 $('palette-source').innerHTML=plans.length?plans.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''):'<option value="">作成済みコードなし</option>';
 $('palette-source').disabled=!plans.length;if(plans.some(p=>p.id===prior))$('palette-source').value=prior;else $('palette-source').value=plans.find(p=>p.id===selectedPlan()?.id)?.id||plans[0]?.id||'';
 $('palette-load').disabled=!plans.length;
}
$('palette-source-year').onchange=refreshPaletteSources;$('palette-source-season').onchange=refreshPaletteSources;

const paletteBarMenu=document.createElement('div');paletteBarMenu.id='palette-bar-menu';paletteBarMenu.className='plan-context-menu';paletteBarMenu.setAttribute('role','menu');paletteBarMenu.hidden=true;paletteBarMenu.innerHTML='<button id="palette-bar-delete" role="menuitem" class="danger-action">この便を削除</button>';document.body.appendChild(paletteBarMenu);
let paletteBarMenuIds=[],paletteBarMenuDraft='';
function closePaletteBarMenu(){paletteBarMenu.hidden=true;paletteBarMenuIds=[];paletteBarMenuDraft='';}
$('palette-timeline').oncontextmenu=e=>{const bar=e.target.closest('[data-palette-flight]');if(!bar)return;e.preventDefault();if(!paletteSelection.has(bar.dataset.paletteFlight))paletteSelection=new Set([bar.dataset.paletteFlight]);for(const b of $('palette-timeline').querySelectorAll('[data-palette-flight]'))b.classList.toggle('palette-selected',paletteSelection.has(b.dataset.paletteFlight));paletteBarMenuIds=[...paletteSelection];paletteBarMenuDraft=paletteDraft().id;$('palette-bar-delete').textContent=paletteBarMenuIds.length>1?'選択した'+paletteBarMenuIds.length+'便を削除':'この便を削除';paletteBarMenu.hidden=false;paletteBarMenu.style.left=Math.max(8,Math.min(e.clientX,window.innerWidth-210))+'px';paletteBarMenu.style.top=Math.max(8,Math.min(e.clientY,window.innerHeight-60))+'px';$('palette-bar-delete').focus();};
$('palette-bar-delete').onclick=()=>{if(!showingPalette||paletteDraft().id!==paletteBarMenuDraft){closePaletteBarMenu();return;}const ids=new Set(paletteBarMenuIds);closePaletteBarMenu();paletteDraft().flights=paletteDraft().flights.filter(f=>!ids.has(f.id));paletteSelection.clear();commitPalette();};
document.addEventListener('pointerdown',e=>{if(!paletteBarMenu.contains(e.target))closePaletteBarMenu();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closePaletteBarMenu();});document.addEventListener('scroll',closePaletteBarMenu,true);window.addEventListener('resize',closePaletteBarMenu);

// Never expose the regular page's date-specific event diagnostics in the palette.
const renderBeforePaletteIsolation=render;render=function(){renderBeforePaletteIsolation();if(showingPalette){$('planner-content').hidden=true;document.querySelector('header.editing-header').hidden=true;}};

$('palette-memo').onchange=()=>{paletteDraft().memo=$('palette-memo').value;commitPalette();};

const PALETTE_SAVED_KEY='toki-palette-saved-v1';let paletteSavedRecords=[],paletteSavedWritable=true;
try{const raw=localStorage.getItem(PALETTE_SAVED_KEY);if(raw){const saved=JSON.parse(raw);if(!Array.isArray(saved)||saved.some(r=>!r||typeof r.id!=='string'||!r.data||typeof r.data.name!=='string'||!Array.isArray(r.data.flights)||!Array.isArray(r.data.machines)))throw Error('invalid');paletteSavedRecords=saved;}}catch(e){paletteSavedWritable=false;toast('保存済みパレットの一覧を読み込めません。既存データは上書きしません。');}
const savedPaletteSection=document.createElement('section');savedPaletteSection.id='palette-saved-section';savedPaletteSection.className='panel';savedPaletteSection.innerHTML='<div class="panel-title"><h2>保存したダイヤ</h2><span id="palette-save-status" class="muted"></span></div><div id="palette-saved-list"></div>';palettePage.appendChild(savedPaletteSection);
function persistSavedPalettes(next){if(!paletteSavedWritable){toast('保存済み一覧を確認するまで変更できません。');return false;}try{localStorage.setItem(PALETTE_SAVED_KEY,JSON.stringify(next));paletteSavedRecords=next;return true;}catch(e){toast('ダイヤを保存できませんでした。');return false;}}
function renderSavedPalettes(){
 const current=paletteDraft(),saved=paletteSavedRecords.find(r=>r.id===current.id),dirty=!saved||JSON.stringify(saved.data)!==JSON.stringify(current);$('palette-save-status').textContent=saved?(dirty?'保存後の変更あり':'保存済み'):'未保存';
 $('palette-saved-list').innerHTML=paletteSavedRecords.length?[...paletteSavedRecords].sort((a,b)=>b.updated.localeCompare(a.updated)).map(r=>{const fs=r.data.flights,block=fs.filter(f=>!f.blockUnset).reduce((n,f)=>n+Math.max(0,minutes(f.arr)-minutes(f.dep)),0),when=new Date(r.updated);return `<div class="saved-palette-row"><div><strong>${esc(r.data.name)}</strong><span>${fs.length}便 ／ ${formatBlock(block)} ／ ${Number.isNaN(when.getTime())?'':esc(when.toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}))}</span>${r.data.memo?`<span class="saved-palette-memo">${esc(r.data.memo)}</span>`:''}</div><button data-load-saved-palette="${esc(r.id)}">読込</button><button data-delete-saved-palette="${esc(r.id)}">削除</button></div>`;}).join(''):'<p class="muted">保存したダイヤはありません。</p>';
}
$('palette-save-snapshot').onclick=()=>{
 const draft=paletteDraft();draft.name=$('palette-name').value.trim()||draft.name;draft.memo=$('palette-memo').value;
 if(!paletteSavedRecords.some(r=>r.id===draft.id)&&paletteSavedRecords.length>=100){toast('保存できるダイヤは100件までです。');return;}
 const record={id:draft.id,updated:new Date().toISOString(),data:structuredClone(draft)},next=paletteSavedRecords.filter(r=>r.id!==draft.id);next.push(record);
 if(persistSavedPalettes(next)){commitPalette();toast('「'+draft.name+'」を保存しました。');}
};
$('palette-saved-list').onclick=e=>{
 const load=e.target.closest('[data-load-saved-palette]'),del=e.target.closest('[data-delete-saved-palette]');
 if(load){const record=paletteSavedRecords.find(r=>r.id===load.dataset.loadSavedPalette);if(!record)return;const current=paletteDraft(),stored=paletteSavedRecords.find(r=>r.id===current.id);if((current.flights.length||current.memo)&&(!stored||JSON.stringify(stored.data)!==JSON.stringify(current))&&!confirm('編集中の内容を保存したダイヤに切り替えますか？'))return;
 const index=paletteLibrary.items.findIndex(d=>d.id===record.id);if(index<0&&paletteLibrary.items.length>=50){toast('編集中のパレットが50件あります。不要なパレットを削除してください。');return;}const restored=structuredClone(record.data);if(index<0)paletteLibrary.items.push(restored);else paletteLibrary.items[index]=restored;paletteLibrary.active=restored.id;resetPaletteHistory();commitPalette();$('palette-timeline').scrollIntoView({block:'nearest',behavior:'smooth'});}
 if(del){const id=del.dataset.deleteSavedPalette;if(!confirm('保存したダイヤを削除しますか？'))return;if(persistSavedPalettes(paletteSavedRecords.filter(r=>r.id!==id)))renderSavedPalettes();}
};

// Fold the range editor while keeping schedule diagnostics visible.
const periodPanel=document.querySelector('.period-panel');const periodFold=document.createElement('details');periodFold.id='period-range-fold';const periodFoldSummary=document.createElement('summary');periodFoldSummary.textContent='適用期間';periodFold.appendChild(periodFoldSummary);
try{periodFold.open=localStorage.getItem('toki-period-range-fold-open')!=='false';}catch(e){periodFold.open=true;}
periodPanel.insertBefore(periodFold,periodPanel.firstChild);
for(const selector of ['.primary-period-range','#period-extra-ranges','#period-add-range']){const element=periodPanel.querySelector(selector);if(element)periodFold.appendChild(element);}
periodFold.addEventListener('toggle',()=>{try{localStorage.setItem('toki-period-range-fold-open',String(periodFold.open));}catch(e){}});

const periodDiagnostics=document.createElement('div');periodDiagnostics.id='period-diagnostics';periodPanel.insertAdjacentElement('afterend',periodDiagnostics);for(const id of ['period-mode','issue-count','issues']){const element=$(id);if(element)periodDiagnostics.appendChild(element);}

// Edit scratch aircraft directly in the lane labels; IDs keep flight assignments stable.
const paletteFleetButton=document.createElement('button');paletteFleetButton.id='palette-fleet-open';paletteFleetButton.textContent='＋ 機材を追加';$('palette-summary').insertAdjacentElement('beforebegin',paletteFleetButton);
const paletteFleetTypes=document.createElement('datalist');paletteFleetTypes.id='palette-inline-types';paletteFleetTypes.innerHTML='<option value="ATR72"></option><option value="ATR42"></option>';palettePage.appendChild(paletteFleetTypes);
const paletteFleetNames=document.createElement('datalist');paletteFleetNames.id='palette-inline-names';palettePage.appendChild(paletteFleetNames);
function paletteMachineInline(machine,count){const id=esc(machine.id);return `<div class="palette-inline-name"><input data-inline-machine="${id}" data-machine-field="name" list="palette-inline-names" value="${esc(machine.name)}" maxlength="40" aria-label="機番・名称"><button type="button" data-inline-machine-delete="${id}" title="この機材を削除" aria-label="${esc(machine.name)}を削除">×</button></div><div class="palette-inline-type"><input data-inline-machine="${id}" data-machine-field="type" list="palette-inline-types" value="${esc(machine.type||'')}" maxlength="40" placeholder="機種" aria-label="機種"><span>${count}便</span></div><div class="palette-inline-airports"><select data-inline-machine="${id}" data-machine-field="start" aria-label="${esc(machine.name)}の出発空港" title="出発空港">${airportOptions(machine.start)}</select><span>→</span><select data-inline-machine="${id}" data-machine-field="end" aria-label="${esc(machine.name)}の最終到着空港" title="最終到着空港"><option value="" ${!machine.end?'selected':''}>同じ空港</option>${airportOptions(machine.end||'')}</select></div>`;}
$('palette-timeline').addEventListener('change',e=>{const input=e.target.closest('[data-inline-machine]');if(!input)return;const draft=paletteDraft(),machine=draft.machines.find(m=>m.id===input.dataset.inlineMachine),field=input.dataset.machineField;if(!machine||!['name','type','start','end'].includes(field))return;const value=input.value.trim();if(field==='name'&&(!value||draft.machines.some(m=>m!==machine&&m.name===value))){input.value=machine.name;toast('機番・名称は重複しない名前で入力してください。');return;}if((field==='start'&&!airports[value])||(field==='end'&&value&&!airports[value])){input.value=machine[field]||'';return;}machine[field]=value;commitPalette();});
$('palette-timeline').addEventListener('click',e=>{const button=e.target.closest('[data-inline-machine-delete]');if(!button)return;const draft=paletteDraft(),id=button.dataset.inlineMachineDelete,machine=draft.machines.find(m=>m.id===id);if(!machine)return;const used=draft.flights.some(f=>f.aircraft===id);if(used&&!confirm(machine.name+'を削除し、割当済みの便を未割当に移しますか？'))return;draft.machines=draft.machines.filter(m=>m.id!==id);for(const flight of draft.flights)if(flight.aircraft===id)flight.aircraft='';commitPalette();});
$('palette-fleet-open').onclick=()=>{const draft=paletteDraft();if(draft.machines.length>=20)return;const ids=new Set(draft.machines.map(m=>m.id)),names=new Set(draft.machines.map(m=>m.name));let n=1;while(ids.has('M'+n)||names.has('機材'+n))n++;draft.machines.push({id:'M'+n,name:'機材'+n,type:'',start:airports.KIJ?'KIJ':Object.keys(airports)[0],end:''});commitPalette();};
const renderBeforeInlineFleet=renderPalette;renderPalette=function(){renderBeforeInlineFleet();$('palette-fleet-open').disabled=paletteDraft().machines.length>=20;paletteFleetNames.innerHTML=[...new Set([...state.machines,...paletteDraft().machines].map(m=>m.name))].map(name=>`<option value="${esc(name)}"></option>`).join('');};
