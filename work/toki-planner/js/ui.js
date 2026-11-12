function calendarCharterFlights(day){return Toki.charterFlights?Toki.charterFlights(day):legacyCalendarCharterFlights(day);}
function legacyCalendarCharterFlights(day){
 if(typeof selectedPlan!=='function')return [];
 const current=selectedPlan(),owner=Toki.assignedPlanId?.(day),plan=planLibrary.items.find(p=>(owner===undefined||p.id===owner)&&Toki.isPlanApplied(p.id===current?.id?state:p.data,day));
 const data=plan?.id===current?.id?state:plan?.data;return (data?.days?.[day]||[]).filter(f=>f.charter);
}
function seasonFlightTotals(range){
 let count=0,block=0,issues=0,regularCount=0,charterCount=0;
 if(typeof selectedPlan!=='function')return {count,block,issues,regularCount,charterCount};
 const current=selectedPlan();
 for(const day of Toki.dateKeys()){
  if(day<range.from||day>range.to)continue;
  const owner=Toki.assignedPlanId?.(day);
  const plan=planLibrary.items.find(p=>(owner===undefined||p.id===owner)&&Toki.isPlanApplied(p.id===current?.id?state:p.data,day));
  const data=plan?(plan.id===current?.id?state:plan.data):state;
  const regular=plan?data.days[day]||[]:[],charters=Toki.charterFlights?.(day)||[];regularCount+=regular.length;charterCount+=charters.length;
  for(const flight of [...regular,...charters]){count++;block+=minutes(flight.arr)-minutes(flight.dep);}
  issues+=calendarIssuesForDate(day).length;
 }
 return {count,block,issues,regularCount,charterCount};
}
function calendarIssuesForDate(day){
 const current=typeof selectedPlan==='function'?selectedPlan():null;
 const owner=Toki.assignedPlanId?.(day);
 const plan=typeof selectedPlan==='function'?planLibrary.items.find(p=>(owner===undefined||p.id===owner)&&Toki.isPlanApplied(p.id===current?.id?state:p.data,day)):null;
 if(!plan&&!(Toki.charterFlights?.(day)||[]).length)return [];
 const data=plan?(plan.id===current?.id?state:plan.data):state;
 const flights=[...(plan?data.days[day]||[]:[]).map(f=>Toki.aircraftForDate?Toki.aircraftForDate(f,day,plan?.id):f),...(Toki.charterFlights?.(day)||[])];
 const applied=(data.periods||[]).find(p=>p.dates.includes(day));
 const snapshot={flights,machines:applied?.machines||data.machines,turn:applied?.turn??data.turn,constraints:applied?.constraints||data.constraints||[],acceptedIssueKeys:data.acceptedIssueKeys||applied?.acceptedIssueKeys||[]};
 return Toki.pendingIssues(Toki.check(flights,snapshot.machines,snapshot.turn,Toki.fleetEvents||[],day,snapshot.constraints),snapshot,Toki.fleetEvents||[],day);
}
function calendarSeason(){
 const selectedKey=Toki.planListSeasonKey;if(/^[SW]20\d{2}$/.test(selectedKey||'')&&typeof seasonRange==='function'){const chosen=seasonRange(Number(selectedKey.slice(1)),selectedKey[0]);if(chosen.available)return chosen;}
 const stored=state.season;
 if(stored&&validDate(stored.from)&&validDate(stored.to)&&stored.from<=stored.to)return stored;
 const y=Number(date.slice(0,4));
 const sunday=(year,month)=>{const d=new Date(Date.UTC(year,month,0));d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d.toISOString().slice(0,10);};
 const summer=sunday(y,3),winter=sunday(y,10),kind=date>=summer&&date<winter?'S':'W',year=date<summer?y-1:y;
 const start=sunday(year,kind==='S'?3:10),next=sunday(kind==='S'?year:year+1,kind==='S'?10:3),end=new Date(Date.parse(next+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 return {year,kind,from:start<START?START:start,to:end>END?END:end};
}
function calendarAppliedNames(range){
 const names=new Map(),current=typeof selectedPlan==='function'?selectedPlan():null;
 const add=(name,data,id)=>{if(!/^[A-Z][0-9]{0,3}$/.test(name))return;for(const p of data.periods||[])for(const d of p.dates||[]){if(d<range.from||d>range.to||!Toki.isPlanApplied(data,d)||(Toki.assignedPlanId&&Toki.assignedPlanId(d)!==undefined&&Toki.assignedPlanId(d)!==id))continue;if(!names.has(d))names.set(d,new Set());names.get(d).add(name);}};
 add(current?.name||'',state,current?.id);
 if(typeof planLibrary!=='undefined')for(const plan of planLibrary.items){if(plan.id===current?.id)continue;const season=plan.data?.season;if(season?.year===range.year&&season?.kind===range.kind)add(plan.name,plan.data,plan.id);}
 return names;
}
function renderCalendar(){
 const range=calendarSeason(),periods=new Map(),appliedNames=calendarAppliedNames(range);
 const totals=seasonFlightTotals(range);$('season-totals').innerHTML=`<span>期間総便数 <b>${totals.count.toLocaleString()}便</b> <small>（定期 ${totals.regularCount.toLocaleString()}／チャーター ${totals.charterCount.toLocaleString()}）</small></span><span>総ブロックタイム <b>${formatBlock(totals.block)}</b></span><span class="season-issue-total ${totals.issues===0?'issues-clear':'issues-present'}">総チェック件数 <b>${totals.issues.toLocaleString()}件</b></span>`;
 for(const p of state.periods||[])for(const d of p.dates)if(Toki.isPlanApplied(state,d))periods.set(d,p.name);
 const months=[];let cursor=range.from.slice(0,7)+'-01';
 while(cursor.slice(0,7)<=range.to.slice(0,7)){
  months.push(cursor.slice(0,7));const d=new Date(cursor+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);cursor=d.toISOString().slice(0,10);
 }
 let html='';
 for(const prefix of months){
  const year=Number(prefix.slice(0,4)),month=Number(prefix.slice(5,7)),first=new Date(Date.UTC(year,month-1,1)).getUTCDay(),count=new Date(Date.UTC(year,month,0)).getUTCDate();
  let cells=['日','月','火','水','木','金','土'].map((w,i)=>`<div class="cal-head ${i===0?'sun':i===6?'sat':''}">${w}</div>`).join('');
  for(let i=0;i<first;i++)cells+='<div class="cal-empty"></div>';
  for(let day=1;day<=count;day++){
   const d=prefix+'-'+String(day).padStart(2,'0'),h=Toki.holiday(d),dow=new Date(d+'T12:00:00+09:00').getUTCDay(),period=periods.get(d),flights=state.days[d]||[],enabled=validDate(d)&&d>=range.from&&d<=range.to;
   const charters=enabled?calendarCharterFlights(d):[];
   const dayIssues=enabled?calendarIssuesForDate(d):[];
   const dayEvents=(Toki.fleetEvents||[]).filter(e=>e.start<=d&&d<=e.end);
   const eventStart=dayEvents.length&&(dow===0||day===1||d===range.from||dayEvents[0].start===d),eventEnd=dayEvents.length&&(dow===6||day===count||d===range.to||dayEvents[0].end===d);
   const letters=[...(appliedNames.get(d)||[])].sort().join('・');
   const holiday=h?h.name+(h.provisional?'（暫定）':''):'',label=d+(holiday?' '+holiday:'')+(enabled?'':' ／ 期間外')+(period?' ／ '+period:'')+(letters?' ／ ダイヤ '+letters:'')+(dayIssues.length?' ／ チェック '+dayIssues.length+'件':'')+(charters.length?' ／ チャーター '+charters.map(f=>f.from+'−'+f.to+' '+f.dep+'〜'+f.arr).join('、'):'')+dayEvents.map(e=>' ／ '+e.aircraft+' '+e.title).join('');
   cells+=`<button class="cal-day ${charters.length?'charter-calendar-day':''} ${h||dow===0?'sun':dow===6?'sat':''} ${d===date?'selected':''} ${flights.length&&enabled?'has-flights':''} ${dayEvents.length&&enabled?'event-calendar-day':''} ${eventStart?'event-range-start':''} ${eventEnd?'event-range-end':''}" style="--event-color:${dayEvents.length?Toki.eventColor(dayEvents[0]):'transparent'}" data-calendar-date="${d}" ${enabled?'':'disabled'} aria-label="${esc(label)}" title="${esc(label)}"><b>${day}</b>${charters.length?'<i class="calendar-charter-mark" aria-label="チャーターあり">✈</i>':''}${dayIssues.length?'<i class="calendar-issue-dot" aria-label="チェック事項あり"></i>':''}${dayEvents.length>1&&enabled?`<span class="calendar-event-overlap" aria-label="イベント${dayEvents.length}件">${dayEvents.map(e=>`<i style="background:${Toki.eventColor(e)}"></i>`).join('')}<em>${dayEvents.length}</em></span>`:''}<span class="cal-holiday">${esc(holiday)}</span>${letters&&enabled?`<span class="cal-applied-name" data-applied-name="${letters}">${letters.split('・').map(letter=>`<span class="cal-letter" data-calendar-plan-name="${letter}" style="background:${Toki.planColor(letter)}">${letter}</span>`).join('')}</span>`:''}</button>`;
  }
  for(let i=(first+count)%7;i&&i<7;i++)cells+='<div class="cal-empty"></div>';
  html+=`<section class="calendar-month-card" data-month="${prefix}"><h3>${year}<span>年</span> ${month}<span>月</span></h3><div class="month-grid">${cells}</div></section>`;
 }
 $('calendar-grid').innerHTML=html;
 $('calendar-range').textContent=`${range.kind}${String(range.year).slice(-2)} ／ ${range.from.replaceAll('-','/')} 〜 ${range.to.replaceAll('-','/')}`;
 const h=Toki.holiday(date);$('selected-holiday').textContent=h?h.name+(h.provisional?'（暫定）':''):'';
 const weekdayNumber=new Date(date+'T00:00:00Z').getUTCDay();$('weekday').classList.toggle('weekday-red',weekdayNumber===0||!!h);$('weekday').classList.toggle('weekday-blue',weekdayNumber===6&&!h);
}

const originalRenderWithCalendar=render;
render=function(){originalRenderWithCalendar();renderCalendar();};
$('calendar-grid').onclick=e=>{const b=e.target.closest('[data-calendar-date]');if(b&&!b.disabled&&validDate(b.dataset.calendarDate))$('date').onchange({target:{value:b.dataset.calendarDate}});};
renderCalendar();

Toki.refreshSeasonCalendar=renderCalendar;

// Named plans share one local library; compact snapshots omit empty dates.
const LIBRARY_KEY='toki-plan-library-v1';
let planLibrary={version:1,activeId:'',items:[]},libraryWritable=true,librarySaved=true;
const planId=()=> 'D'+Date.now().toString(36)+Math.random().toString(36).slice(2,9);
function compactPlan(s){const copy=structuredClone(s);copy.days=Object.fromEntries(Object.entries(copy.days).filter(([,fs])=>fs.length));return copy;}
function validateLibrary(library){
 if(!library||library.version!==1||!Array.isArray(library.items)||library.items.length>100)throw Error('ダイヤ一覧の形式が正しくありません。');
 const ids=new Set();
 for(const p of library.items){
  if(!p||typeof p.id!=='string'||!/^D[a-z0-9]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60)throw Error('ダイヤ一覧が正しくありません。');
  for(const period of p.data?.periods||[])if(/^PofficialD[a-z0-9]+$/.test(period.id)){const previous=period.id;period.id='Pofficial'+previous.slice(9).toLowerCase();if(p.data.editingPeriodId===previous)p.data.editingPeriodId=period.id;}
  ids.add(p.id);validate(expandDates(structuredClone(p.data)));
 }
 if(!ids.has(library.activeId))library.activeId=library.items[0]?.id||'';
 return library;
}
function selectedPlan(){return planLibrary.items.find(p=>p.id===planLibrary.activeId);}
try{
 const stored=localStorage.getItem(LIBRARY_KEY);
 if(stored){planLibrary=validateLibrary(JSON.parse(stored));const p=selectedPlan();if(p){state=migrateAircraftNames(validate(expandDates(structuredClone(p.data))));date=validDate(p.date)?p.date:START;}else{state=fresh();for(const d of Object.keys(state.days))state.days[d]=[];state.periods=[];date=START;}}
 else{const id=planId();planLibrary={version:1,activeId:id,items:[{id,name:'これまでの検討ダイヤ',updated:new Date().toISOString(),date,data:compactPlan(state)}]};}
}catch(err){
 libraryWritable=false;librarySaved=false;
 const id=planId();planLibrary={version:1,activeId:id,items:[{id,name:'現在の検討ダイヤ',date,data:compactPlan(state)}]};
 toast('保存済みの一覧を読み込めませんでした。既存の一覧は上書きせず、現在のダイヤを表示しています。');
}
function persistLibrary(){
 if(!libraryWritable){librarySaved=false;return false;}
 try{localStorage.setItem(LIBRARY_KEY,JSON.stringify(planLibrary));librarySaved=true;return true;}
 catch(err){librarySaved=false;return false;}
}
function initializeAssignments(){
 if(planLibrary.assignments&&typeof planLibrary.assignments==='object'&&!Array.isArray(planLibrary.assignments))return;
 planLibrary.assignments={};
 const ordered=[...planLibrary.items].sort((a,b)=>(a.updated||'').localeCompare(b.updated||''));
 for(const plan of ordered)for(const period of plan.data.periods||[])for(const day of period.dates||[])if(Toki.isPlanApplied(plan.data,day))planLibrary.assignments[day]=plan.id;
}
initializeAssignments();
Toki.assignedPlanId=day=>{const owner=planLibrary.assignments?.[day];return owner&&!planLibrary.items.some(p=>p.id===owner)?null:owner;};
Toki.assignAppliedDates=dates=>{
 initializeAssignments();
 if(typeof activeHistory==='function'){const h=activeHistory();if(h)h.entries[h.index].assignments=JSON.stringify(planLibrary.assignments);}
 const owner=selectedPlan()?.id;if(!owner)return;
 for(const day of dates){if(planLibrary.assignments[day]!==owner)Toki.assignmentChanged=true;planLibrary.assignments[day]=owner;}
};
function capturePlan(){const p=selectedPlan();if(p){p.data=compactPlan(state);p.date=date;p.updated=new Date().toISOString();}}
function renderPlanList(){
 const scope=Toki.planListSeasonKey===undefined?(selectedPlan()?.data?.season?.key||'legacy'):Toki.planListSeasonKey;
 const visible=planLibrary.items.filter(p=>scope==='legacy'?!p.data?.season&&!p.seasonKey:scope&&(p.data?.season?.key||p.seasonKey)===scope);
 $('plan-list').innerHTML=visible.map(p=>{
  const days=Object.keys(p.data.days),flights=Object.values(p.data.days).reduce((sum,fs)=>sum+fs.length,0),periods=p.data.periods?.length||0;
  const range=days.length?`${days.sort()[0]}〜${days.at(-1)}`:'便は未設定';
  return `<button draggable="true" class="plan-card ${p.id===planLibrary.activeId?'active':''} ${p.locked?'plan-locked':''}" data-plan-id="${p.id}" style="--plan-color:${Toki.planColor(p.name)}" title="${esc(p.name)} ／ ${esc(range)} ／ ${days.length}日・${flights}便（右クリックで変更・コピー・削除）" aria-haspopup="menu" aria-pressed="${p.id===planLibrary.activeId}"><strong>${esc(p.name)}</strong>${p.locked?'<i class="plan-lock-mark" aria-label="ロック中">🔒</i>':''}</button>`;
 }).join('')||'<div class="sidebar-no-events">'+(scope?'ダイヤ未作成':'夏・冬を選択')+'</div>';
}
function renderSidebar(){renderPlanList();
 $('library-status').textContent=librarySaved?'':'一覧を保存できません。検討案をファイル保存してください。';
 $('library-status').style.color=librarySaved?'#b6c2d4':'#ff939d';
 const current=selectedPlan();
 if(Toki.charterMode){$('active-plan-name').textContent=Toki.currentCharterCode?.()||'チャーター未選択';}else{
 $('active-plan-name').innerHTML='<span class="header-plan-code" style="background:'+Toki.planColor(Toki.dateViewUnset?'':current?.name||'')+'">'+esc(Toki.dateViewUnset?'未設定':current?.name||'ダイヤ未選択')+'</span>';
 }
 const season=current?.data?.season;
 $('editing-season').classList.toggle('winter-season',season?.kind==='W');
 $('editing-season').textContent=season&&Number.isInteger(season.year)&&['S','W'].includes(season.kind)?`${season.kind}${String(season.year).slice(-2)}`:'シーズン未指定';
 const formatDate=d=>{const [y,m,day]=d.split('-').map(Number);return `${y}年${m}月${day}日`;};
 const configuredPeriods=current?.data?.periods||[];
 const flightDates=Object.keys(current?.data?.days||{}).sort();
 const starts=configuredPeriods.map(p=>p.start).filter(validDate),ends=configuredPeriods.map(p=>p.end).filter(validDate);
 const from=season?.from||(starts.length?starts.sort()[0]:flightDates[0]);
 const to=season?.to||(ends.length?ends.sort().at(-1):flightDates.at(-1));
 $('editing-range').textContent=validDate(from)&&validDate(to)?`${formatDate(from)} 〜 ${formatDate(to)}`:'期間未設定';

}
const saveBeforeLibrary=save;
save=function(){
 if(!selectedPlan()){const id=planId();planLibrary.activeId=id;planLibrary.items.push({id,name:'新しいダイヤ',date,data:compactPlan(state)});}
 saveBeforeLibrary();capturePlan();persistLibrary();
 if(!librarySaved)$('storage').textContent=' ダイヤ一覧への自動保存に失敗しました。検討案をファイルにも保存してください。';
 renderSidebar();
};
function openPlan(id){
 Toki.dateViewUnset=false;
 if(id===planLibrary.activeId)return;
 const target=planLibrary.items.find(p=>p.id===id);if(!target)return;
 try{
  const next=migrateAircraftNames(validate(expandDates(structuredClone(target.data))));
  capturePlan();planLibrary.activeId=id;state=next;state.periods=state.periods||[];date=validDate(target.date)?target.date:START;
  activePeriodId='';dragUndo=null;$('undo-drag').disabled=true;
  save();render();refreshPeriods();renderSidebar();
 }catch(err){toast('ダイヤを開けません：'+err.message);}
}
$('plan-list').onclick=e=>{const button=e.target.closest('[data-plan-id]');if(button)openPlan(button.dataset.planId);};
$('create-plan').onclick=()=>{
 const name=$('new-plan-name').value.trim();
 if(!name||name.length>60){toast('新しいダイヤの名前を1〜60文字で入力してください。');return;}
 if(planLibrary.items.length>=100){toast('ダイヤは最大100件です。');return;}
 capturePlan();const source=$('new-plan-source').value,next=source==='current'?structuredClone(state):fresh();
 if(source==='blank'){for(const d of Object.keys(next.days))next.days[d]=[];next.periods=[];}
 const id=planId(),nextDate=source==='baseline'?'2026-12-05':date;
 planLibrary.items.push({id,name,date:nextDate,updated:new Date().toISOString(),data:compactPlan(next)});
 planLibrary.activeId=id;state=next;state.periods=state.periods||[];date=nextDate;activePeriodId='';dragUndo=null;$('undo-drag').disabled=true;
 $('new-plan-name').value='';save();render();refreshPeriods();renderSidebar();toast('「'+name+'」を作成しました。');
};
// A named JSON backup retains compatibility with the existing import workflow.
$('download').onclick=()=>{const p=selectedPlan();if(!p){toast('保存するダイヤを作成してください。');return;}const name=p.name.replace(/[\\/:*?"<>|]/g,'_');download(name+'-検討案.json',JSON.stringify({...state,planName:p.name},null,2),'application/json');};
if(libraryWritable)persistLibrary();
activePeriodId='';state.periods=state.periods||[];render();refreshPeriods();renderSidebar();

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

// A stable, compact date picker with explicit year/month selectors.
let pickerTarget=null,pickerYear=2026,pickerMonth=4;
function renderDatePicker(){
 const min=pickerTarget?.min||START,max=pickerTarget?.max||END;
 $('picker-year').innerHTML=Array.from({length:11},(_,i)=>{const y=2026+i;return `<option value="${y}" ${y===pickerYear?'selected':''} ${y<Number(min.slice(0,4))||y>Number(max.slice(0,4))?'disabled':''}>${y}年</option>`;}).join('');
 $('picker-month').innerHTML=Array.from({length:12},(_,i)=>{const m=i+1,prefix=`${pickerYear}-${String(m).padStart(2,'0')}`;return `<option value="${m}" ${m===pickerMonth?'selected':''} ${prefix<min.slice(0,7)||prefix>max.slice(0,7)?'disabled':''}>${m}月</option>`;}).join('');
 const prefix=`${pickerYear}-${String(pickerMonth).padStart(2,'0')}`,first=new Date(Date.UTC(pickerYear,pickerMonth-1,1)).getUTCDay(),count=new Date(Date.UTC(pickerYear,pickerMonth,0)).getUTCDate();
 let html=['日','月','火','水','木','金','土'].map((w,i)=>`<span class="${i===0?'sun':i===6?'sat':''}">${w}</span>`).join('');
 for(let i=0;i<first;i++)html+='<span></span>';
 for(let day=1;day<=count;day++){const d=prefix+'-'+String(day).padStart(2,'0'),h=Toki.holiday(d),dow=new Date(d+'T00:00:00Z').getUTCDay();html+=`<button type="button" data-pick-date="${d}" ${d<min||d>max?'disabled':''} class="${h||dow===0?'sun':dow===6?'sat':''} ${d===pickerTarget?.value?'picked':''}" title="${h?esc(h.name):d}">${day}</button>`;}
 $('picker-days').innerHTML=html;
 $('picker-prev').disabled=prefix<=min.slice(0,7);$('picker-next').disabled=prefix>=max.slice(0,7);
}
function openDatePicker(input){
 pickerTarget=input;let d=validDate(input.value)?input.value:(input.min||START);
 if(d<(input.min||START))d=input.min;if(d>(input.max||END))d=input.max;
 pickerYear=Number(d.slice(0,4));pickerMonth=Number(d.slice(5,7));renderDatePicker();$('date-picker-dialog').showModal();
}
function shiftPickerMonth(n){const d=new Date(Date.UTC(pickerYear,pickerMonth-1+n,1));pickerYear=d.getUTCFullYear();pickerMonth=d.getUTCMonth()+1;renderDatePicker();}
$('picker-prev').onclick=()=>shiftPickerMonth(-1);$('picker-next').onclick=()=>shiftPickerMonth(1);
$('picker-year').onchange=e=>{pickerYear=Number(e.target.value);const min=pickerTarget.min||START,max=pickerTarget.max||END;if(pickerYear===Number(min.slice(0,4)))pickerMonth=Math.max(pickerMonth,Number(min.slice(5,7)));if(pickerYear===Number(max.slice(0,4)))pickerMonth=Math.min(pickerMonth,Number(max.slice(5,7)));renderDatePicker();};
$('picker-month').onchange=e=>{pickerMonth=Number(e.target.value);renderDatePicker();};
$('picker-close').onclick=()=>$('date-picker-dialog').close();
$('picker-days').onclick=e=>{const button=e.target.closest('[data-pick-date]');if(!button||button.disabled||!pickerTarget)return;const target=pickerTarget;target.value=button.dataset.pickDate;$('date-picker-dialog').close();target.dispatchEvent(new Event('change',{bubbles:true}));};
document.addEventListener('pointerdown',e=>{if(e.button!==0||!e.target.matches('input[type="date"]'))return;e.preventDefault();openDatePicker(e.target);},true);
document.addEventListener('keydown',e=>{if(e.target.matches('input[type="date"]')&&((e.altKey&&e.key==='ArrowDown')||e.key===' ')){e.preventDefault();openDatePicker(e.target);}},true);

document.addEventListener('click',e=>{if(e.target.matches('input[type="date"]'))e.preventDefault();},true);

function focusSidebarItem(selector){const item=$('plan-sidebar').querySelector(selector);if(item){item.focus({preventScroll:true});item.scrollIntoView({block:'nearest'});}}
$('plan-sidebar').addEventListener('click',e=>{
 const plan=e.target.closest('[data-plan-id]'),day=e.target.closest('[data-calendar-date]');
 if(plan)focusSidebarItem(`[data-plan-id="${plan.dataset.planId}"]`);
 else if(day)focusSidebarItem(`[data-calendar-date="${day.dataset.calendarDate}"]`);
});
$('plan-sidebar').addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||e.target.closest('input,select,textarea'))return;
 const day=e.target.closest('[data-calendar-date]');
 if(day){e.preventDefault();const delta={ArrowUp:-7,ArrowDown:7,ArrowLeft:-1,ArrowRight:1}[e.key],next=new Date(Date.parse(day.dataset.calendarDate+'T00:00:00Z')+delta*86400000).toISOString().slice(0,10),button=$('calendar-grid').querySelector(`[data-calendar-date="${next}"]`);if(button&&!button.disabled){button.click();focusSidebarItem(`[data-calendar-date="${next}"]`);}return;}
 const plan=e.target.closest('[data-plan-id]'),event=e.target.closest('[data-open-event]'),season=e.target.closest('#season-S,#season-W');
 let items,selector;
 if(plan){items=[...$('plan-list').querySelectorAll('[data-plan-id]')];selector=plan;}
 else if(event){items=[...$('sidebar-event-list').querySelectorAll('[data-open-event]')];selector=event;}
 else if(season){items=[$('season-S'),$('season-W')].filter(b=>!b.disabled);selector=season;}
 else{items=[...$('plan-sidebar').querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden);selector=e.target.closest('button');}
 const index=items.indexOf(selector);if(index<0)return;e.preventDefault();const target=items[index+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1)];if(!target)return;
 if(plan){const id=target.dataset.planId;target.click();focusSidebarItem(`[data-plan-id="${id}"]`);}
 else if(season){const id=target.id;target.click();focusSidebarItem('#'+id);}
 else{target.focus({preventScroll:true});target.scrollIntoView({block:'nearest'});}
});

// Shared header placement for regular and charter Apply/Revert controls.
const headerApplyActions=document.createElement('div');headerApplyActions.id='header-apply-actions';headerApplyActions.className='actions';$('charter-lock-toggle').insertAdjacentElement('afterend',headerApplyActions);
for(const id of ['period-save','period-revert','charter-apply','charter-revert-applied'])headerApplyActions.appendChild($(id));
$('period-revert').textContent='適用済みダイヤに戻す';
function renderHeaderApplyActions(){const charter=!!Toki.charterMode;$('period-save').hidden=charter;$('period-revert').hidden=charter;$('charter-apply').hidden=!charter;$('charter-revert-applied').hidden=!charter;}
const renderBeforeHeaderApply=render;render=function(){renderBeforeHeaderApply();renderHeaderApplyActions();};const sidebarBeforeHeaderApply=renderSidebar;renderSidebar=function(){sidebarBeforeHeaderApply();renderHeaderApplyActions();};renderHeaderApplyActions();

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

// Upgrade existing accept records to the applied daily snapshots once.
if(!localStorage.getItem('toki-accept-applied-repair-v1')&&libraryWritable){
 const before=structuredClone(planLibrary);let changed=false;
 for(const plan of planLibrary.items){const data=plan.id===selectedPlan()?.id?state:plan.data;if(!(data.acceptedIssueKeys||[]).length)continue;Toki.expandAppliedAcceptances(data,Toki.fleetEvents||[]);plan.data=compactPlan(data);changed=true;}
 if(!changed||persistLibrary()){localStorage.setItem('toki-accept-applied-repair-v1','1');if(typeof lockedSnapshot!=='undefined'&&lockedSnapshot?.id===selectedPlan()?.id)lockedSnapshot.data=structuredClone(state);render();renderSidebar();}else planLibrary=before;
}
