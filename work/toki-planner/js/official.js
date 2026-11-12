// Official W26 baseline: TOKI AIR release of 2026-08-06. Registrations not published.
function importOfficialW26(){
 const marker='toki-official-w26-20260806';if(localStorage.getItem(marker))return;
 const season=seasonRange(2026,'W'),groups=new Map();
 for(const day of Toki.dateKeys().filter(d=>d>=season.from&&d<=season.to)){
  const flights=schedule(day),key=JSON.stringify(flights);if(!groups.has(key))groups.set(key,{flights,dates:[]});groups.get(key).dates.push(day);
 }
 const used=usedSeasonLetters(season.key),letters=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).filter(l=>!used.has(l));
 if(letters.length<groups.size||planLibrary.items.length+groups.size>100){toast('公表ダイヤ取込用の空きダイヤコードが足りません。');return;}
 capturePlan();let index=0,firstId;
 for(const group of groups.values()){
  const name=letters[index++],id=planId(),data=fresh(),ranges=[];
  for(const day of Object.keys(data.days))data.days[day]=[];
  for(const day of group.dates){data.days[day]=structuredClone(group.flights);const last=ranges.at(-1);if(last&&Date.parse(day+'T00:00:00Z')-Date.parse(last.end+'T00:00:00Z')===86400000)last.end=day;else ranges.push({start:day,end:day});}
  const pid='Pofficial'+id.toLowerCase();data.season=season;data.flights=structuredClone(group.flights);data.periods=[{id:pid,name,start:group.dates[0],end:group.dates.at(-1),ranges,weekdays:[0,1,2,3,4,5,6],dates:group.dates,flights:structuredClone(group.flights),machines:structuredClone(data.machines),turn:data.turn}];data.editingPeriodId=pid;
  data.officialSource={url:'https://prtimes.jp/main/html/rd/p/000000137.000143251.html',published:'2026-08-06'};
  planLibrary.items.push({id,name,seasonKey:season.key,date:group.dates[0],updated:new Date().toISOString(),data:compactPlan(data)});
  for(const day of group.dates)planLibrary.assignments[day]=id;
  if(!firstId)firstId=id;
 }
 persistLibrary();localStorage.setItem(marker,'1');renderSidebar();toast('W26の公表ダイヤを取り込みました。機番は未割り当てです。');
}
// Superseded by complete 2026 importer.

// Restore visibility of existing 2027 alternatives after the initial W26 import.
if(!localStorage.getItem('toki-w26-view-recovery-v1')){
 const previous=planLibrary.items.find(p=>p.name==='A'&&p.data?.season?.year===2027&&p.data?.season?.kind==='S')||planLibrary.items.find(p=>p.name==='A'&&p.data?.season?.year===2027);
 if(previous&&selectedPlan()?.data?.officialSource){openPlan(previous.id);toast('2027年のダイヤコードを表示しました。');}
 localStorage.setItem('toki-w26-view-recovery-v1','1');
}

function importOfficial2026(){
 const marker='toki-official-2026-complete-v1';if(localStorage.getItem(marker))return;
 // Preserve the exact existing library before adding baseline alternatives.
 try{const raw=localStorage.getItem(LIBRARY_KEY);if(raw&&!localStorage.getItem('toki-before-official2026-backup'))localStorage.setItem('toki-before-official2026-backup',raw);}catch(e){toast('バックアップを保存できないため公表ダイヤ取込を中止しました。');return;}
 if(!libraryWritable){toast('保存済み一覧の復旧が必要なため、公表ダイヤは取り込んでいません。');return;}
 capturePlan();const batches=[];
 for(const kind of ['S','W']){
  const season=seasonRange(2026,kind),groups=new Map();
  for(const day of Toki.dateKeys().filter(d=>d>=season.from&&d<=season.to)){const flights=schedule(day),key=JSON.stringify(flights);if(!groups.has(key))groups.set(key,{flights,dates:[]});groups.get(key).dates.push(day);}
  const used=usedSeasonLetters(season.key),letters=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).filter(l=>!used.has(l));
  if(letters.length<groups.size){toast(season.key+'の空きコード不足のため取込を中止しました。');return;}
  batches.push({season,groups,letters});
 }
 if(planLibrary.items.length+batches.reduce((n,b)=>n+b.groups.size,0)>100){toast('ダイヤ一覧の空きが不足しています。');return;}
 const before=structuredClone(planLibrary);
 try{
 for(const {season,groups,letters} of batches){let index=0;
 for(const {flights,dates} of groups.values()){
  const name=letters[index++],id=planId(),pid='P'+id.slice(1),data=fresh(),ranges=[];
  for(const day of Object.keys(data.days))data.days[day]=[];
  for(const day of dates){data.days[day]=structuredClone(flights);const last=ranges.at(-1);if(last&&Date.parse(day+'T00:00:00Z')-Date.parse(last.end+'T00:00:00Z')===86400000)last.end=day;else ranges.push({start:day,end:day});}
  data.season=season;data.flights=structuredClone(flights);data.periods=[{id:pid,name,start:dates[0],end:dates.at(-1),ranges,weekdays:[0,1,2,3,4,5,6],dates,flights:structuredClone(flights),machines:structuredClone(data.machines),turn:data.turn,constraints:[]}];data.editingPeriodId=pid;
  data.officialSource={url:'https://tokiair.com/schedules/',sources:['https://tokiair.com/news/6448/','https://tokiair.com/news/6577/','https://tokiair.com/news/6715/','https://tokiair.com/news/6735/','https://tokiair.com/news/6856/','https://tokiair.com/news/6806/','https://tokiair.com/news/7016/'],checked:'2026-10-25',noFlights:flights.length===0};
  validate(data);planLibrary.items.push({id,name,seasonKey:season.key,date:dates[0],updated:new Date().toISOString(),data:compactPlan(data)});
  for(const day of dates)planLibrary.assignments[day]=id;
 }
 }
 if(!persistLibrary())throw Error('公表ダイヤを保存できませんでした。');localStorage.setItem(marker,'1');render();renderSidebar();toast('2026年夏・冬の公表ダイヤを取り込みました。既存コードは保持しています。');
 }catch(e){planLibrary=before;persistLibrary();toast('取込を中止しました：'+e.message);}
}
importOfficial2026();

// Planning allocation only; not a claim about actual operated registrations.
function allocateOfficialFlights(flights,machines,turn,events,day){
 const sorted=structuredClone(flights).sort((a,b)=>minutes(a.dep)-minutes(b.dep)),positions=machines.map(m=>({id:m.id,at:m.start,ready:0,blocked:events.some(e=>e.blocks&&e.aircraft===m.name&&e.start<=day&&day<=e.end)}));
 let best=[],bestCount=-1,bestHome=-1;const path=[];
 function search(i,count){
  if(count+sorted.length-i<bestCount)return;
  if(i===sorted.length){const home=positions.filter((p,j)=>p.at===(machines[j].end||machines[j].start)).length;if(count>bestCount||count===bestCount&&home>bestHome){bestCount=count;bestHome=home;best=path.slice();}return;}
  const f=sorted[i],seen=new Set();
  for(const pos of positions){if(f.charter&&machines.find(m=>m.id===pos.id)?.type!=='ATR42')continue;const equivalent=(machines.find(m=>m.id===pos.id)?.type||'')+':'+pos.at+':'+pos.ready+':'+pos.blocked;if(seen.has(equivalent))continue;seen.add(equivalent);if(pos.blocked||pos.at!==f.from||pos.ready>minutes(f.dep))continue;
   const previous={...pos};pos.at=f.to;pos.ready=minutes(f.arr)+turn;path.push(pos.id);search(i+1,count+1);path.pop();Object.assign(pos,previous);
  }
  if(count+sorted.length-i-1>=bestCount){path.push('');search(i+1,count);path.pop();}
 }
 search(0,0);return sorted.map((f,i)=>({...f,aircraft:best[i]||''}));
}
function autoAllocateOfficial2026(){
 const marker='toki-official2026-allocation-v1';if(localStorage.getItem(marker)||!libraryWritable)return;
 capturePlan();const before=structuredClone(planLibrary);let count=0,unassigned=0;
 try{
  for(const plan of planLibrary.items){const data=plan.data;if(!data.officialSource||data.season?.year!==2026)continue;
   const period=data.periods?.[0];if(!period)continue;
   const events=Toki.fleetEvents||[],blocked=events.filter(e=>e.blocks&&period.dates.some(d=>e.start<=d&&d<=e.end));
   // One pattern per code: avoid every machine unavailable on any applied date.
   const machines=data.machines,unavailable=new Set(blocked.map(e=>e.aircraft));
   const synthetic=machines.filter(m=>unavailable.has(m.name)).map((m,i)=>({aircraft:m.name,blocks:true,start:period.dates[0],end:period.dates[0]}));
   const fs=allocateOfficialFlights(data.flights||period.flights||[],machines,data.turn,synthetic,period.dates[0]);
   data.flights=fs;period.flights=structuredClone(fs);period.machines=structuredClone(machines);period.turn=data.turn;
   for(const day of period.dates)data.days[day]=structuredClone(fs);
   data.allocationSource='automatic-planning';count+=fs.length;unassigned+=fs.filter(f=>!f.aircraft).length;
  }
  if(!persistLibrary())throw Error('保存できませんでした。');
  const current=selectedPlan();if(current?.data?.officialSource&&current.data.season?.year===2026){state=migrateAircraftNames(validate(expandDates(structuredClone(current.data))));periodLoadedState=null;saveBeforeLibrary();}
  localStorage.setItem(marker,'1');render();refreshPeriods();renderSidebar();toast('2026年公表ダイヤの機材を自動割り当てしました。'+(unassigned?'未割り当て便はチェックに表示しています。':''));
 }catch(e){planLibrary=before;persistLibrary();toast('機材割当を中止しました：'+e.message);}
}
autoAllocateOfficial2026();

// Per-date aircraft substitutions never modify a regular timetable template.
const AIRCRAFT_CHANGE_KEY='toki-aircraft-substitutions-v1';
let aircraftSubstitutions={};try{const value=JSON.parse(localStorage.getItem(AIRCRAFT_CHANGE_KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))aircraftSubstitutions=value;}catch(e){}
Toki.aircraftForDate=function(f,day,planId){
 if(f.charter)return f;
 const change=aircraftSubstitutions[planId]?.[day]?.[f.id];
 if(!change||change.from!==f.from||change.to!==f.to)return f;
 const changed=change.aircraft!==f.aircraft;
 return {...f,aircraft:change.aircraft,aircraftChanged:changed,originalAircraft:f.aircraft};
};
function displayedRegularFlight(f){return Toki.aircraftForDate(f,date,selectedPlan()?.id);}
function saveAircraftSubstitutions(){localStorage.setItem(AIRCRAFT_CHANGE_KEY,JSON.stringify(aircraftSubstitutions));}
const aircraftChangeButton=document.createElement('button');aircraftChangeButton.id='aircraft-change-open';aircraftChangeButton.textContent='機材変更';document.querySelector('.timeline-heading').appendChild(aircraftChangeButton);
const aircraftChangeDialog=document.createElement('dialog');aircraftChangeDialog.id='aircraft-change-dialog';aircraftChangeDialog.innerHTML='<h2>機材変更</h2><p id="aircraft-change-heading"></p><div id="aircraft-change-ranges"></div><button id="aircraft-change-add-range" type="button">＋ 適用期間を追加</button><p class="muted">選択中のダイヤコードが適用されている日だけ変更します。</p><div id="aircraft-change-rows"></div><div class="actions"><button id="aircraft-change-save" class="primary">指定期間に適用</button><button id="aircraft-change-reset">元の機材に戻す</button><button id="aircraft-change-close">閉じる</button></div>';document.body.appendChild(aircraftChangeDialog);
function openAircraftChanges(){
 if(Toki.charterMode){toast('定期便の画面で設定してください。');return;}
 const plan=selectedPlan();if(!plan||Toki.dateViewUnset){toast('ダイヤがある日付を選択してください。');return;}
 const flights=currentFlights().filter(f=>!f.charter);if(!flights.length){toast('定期便を設定してください。');return;}
 aircraftChangeDialog._plan=plan.id;aircraftChangeDialog._day=date;aircraftChangeDialog._flights=structuredClone(flights);aircraftChangeDialog._ranges=[{start:date,end:date}];renderAircraftChangeRanges();
 $('aircraft-change-heading').textContent=date+' ／ ダイヤコード '+plan.name+'（時刻・コードは変更しません）';
 const name=id=>state.machines.find(m=>m.id===id)?.name||'未割当';
 $('aircraft-change-rows').innerHTML='<table><thead><tr><th>便名</th><th>路線・時刻</th><th>元の機番</th><th>変更先の機番</th></tr></thead><tbody>'+flights.map((f,i)=>{const actual=displayedRegularFlight(f);return `<tr><td>${esc(f.id)}</td><td>${esc(f.from+'–'+f.to+' '+f.dep+'–'+f.arr)}</td><td>${esc(name(f.aircraft))}</td><td><select data-aircraft-change="${i}" ${plan.locked?'disabled':''}>${machineOptions(actual.aircraft)}</select></td></tr>`;}).join('')+'</tbody></table>';
 $('aircraft-change-save').disabled=!!plan.locked;$('aircraft-change-reset').disabled=!!plan.locked;aircraftChangeDialog.showModal();
}
aircraftChangeButton.onclick=openAircraftChanges;$('aircraft-change-close').onclick=()=>aircraftChangeDialog.close();
function renderAircraftChangeRanges(){
 const ranges=aircraftChangeDialog._ranges||[],locked=!!selectedPlan()?.locked,lower=state.season?.from||START,upper=state.season?.to||END;
 $('aircraft-change-ranges').innerHTML=ranges.map((r,i)=>`<div class="aircraft-change-range"><span>適用期間 ${i+1}</span><input type="date" data-aircraft-range="${i}" data-range-field="start" value="${r.start}" min="${lower}" max="${upper}" aria-label="適用期間${i+1}の開始日" ${locked?'disabled':''}><span>〜</span><input type="date" data-aircraft-range="${i}" data-range-field="end" value="${r.end}" min="${lower}" max="${upper}" aria-label="適用期間${i+1}の終了日" ${locked?'disabled':''}><button type="button" data-remove-aircraft-range="${i}" ${locked||ranges.length<2?'disabled':''}>削除</button></div>`).join('');$('aircraft-change-add-range').disabled=locked;
}
$('aircraft-change-ranges').onchange=e=>{const index=Number(e.target.dataset.aircraftRange),key=e.target.dataset.rangeField;if(aircraftChangeDialog._ranges[index]&&['start','end'].includes(key))aircraftChangeDialog._ranges[index][key]=e.target.value;};
$('aircraft-change-ranges').onclick=e=>{const b=e.target.closest('[data-remove-aircraft-range]');if(b&&!b.disabled&&aircraftChangeDialog._ranges.length>1){aircraftChangeDialog._ranges.splice(Number(b.dataset.removeAircraftRange),1);renderAircraftChangeRanges();}};
$('aircraft-change-add-range').onclick=()=>{const ranges=aircraftChangeDialog._ranges,last=ranges.at(-1),upper=state.season?.to||END,next=new Date(Date.parse(last.end+'T00:00:00Z')+86400000);const value=Number.isFinite(next.getTime())?next.toISOString().slice(0,10):date;ranges.push({start:value<=upper?value:date,end:value<=upper?value:date});renderAircraftChangeRanges();};
function finishAircraftChanges(reset){
 const plan=selectedPlan();if(!plan||plan.id!==aircraftChangeDialog._plan||plan.locked){toast('ロック中のダイヤは変更できません。');return;}
 const before=structuredClone(aircraftSubstitutions);
 try{
 const ranges=aircraftChangeDialog._ranges||[],lower=state.season?.from||START,upper=state.season?.to||END;
 if(!ranges.length||ranges.some(r=>!validDate(r.start)||!validDate(r.end)||r.start>r.end||r.start<lower||r.end>upper))throw Error('適用期間は '+lower+'〜'+upper+' の範囲で、開始日から終了日の順に指定してください。');
 const days=Toki.dateKeys().filter(day=>ranges.some(r=>day>=r.start&&day<=r.end)&&Toki.assignedPlanId(day)===plan.id&&Toki.isPlanApplied(state,day));
 if(!days.length)throw Error('指定期間に、このダイヤコードが適用された日がありません。');
 const choices=[...aircraftChangeDialog.querySelectorAll('[data-aircraft-change]')].map(el=>({flight:aircraftChangeDialog._flights[Number(el.dataset.aircraftChange)],target:el.value}));
 for(const day of days){
 if(reset){if(aircraftSubstitutions[plan.id])delete aircraftSubstitutions[plan.id][day];continue;}
 aircraftSubstitutions[plan.id]||={};aircraftSubstitutions[plan.id][day]||={};
 for(const {flight:f,target} of choices){const applied=(state.days[day]||[]).find(g=>g.id===f.id&&g.from===f.from&&g.to===f.to);if(!applied)continue;
 if(target===f.aircraft)delete aircraftSubstitutions[plan.id][day][f.id];else aircraftSubstitutions[plan.id][day][f.id]={from:f.from,to:f.to,aircraft:target};}
 }
 saveAircraftSubstitutions();render();renderSidebar();aircraftChangeDialog.close();toast(days.length+'日分の機材'+(reset?'を元に戻しました。':'変更を保存しました。ダイヤコードはそのままです。'));
 }catch(e){aircraftSubstitutions=before;toast(e.message||'機材変更を保存できませんでした。');}
}
$('aircraft-change-save').onclick=()=>finishAircraftChanges(false);$('aircraft-change-reset').onclick=()=>finishAircraftChanges(true);
// Install before this final render so persisted changes and their frames appear on reload.
render();

const barAircraftOptions=document.createElement('div');barAircraftOptions.id='bar-aircraft-options';$('bar-context-menu').insertBefore(barAircraftOptions,$('bar-menu-delete'));
const barContextBeforeAircraft=$('timeline').oncontextmenu;
$('timeline').oncontextmenu=e=>{
 barContextBeforeAircraft(e);if($('bar-context-menu').hidden)return;
 barAircraftOptions.hidden=!!Toki.charterMode;
 const locked=!!selectedPlan()?.locked;
 barAircraftOptions.innerHTML='<div class="bar-aircraft-menu-title">当日の機材変更</div>'+state.machines.map(m=>`<button type="button" role="menuitem" data-bar-aircraft="${esc(m.id)}" ${locked?'disabled':''}>${esc(m.name)} <small>${esc(m.type||'')}</small></button>`).join('')+`<button type="button" role="menuitem" data-bar-aircraft-reset ${locked?'disabled':''}>元の機材に戻す</button>`;
 const menu=$('bar-context-menu');menu.style.top=Math.max(8,Math.min(e.clientY,window.innerHeight-menu.offsetHeight-8))+'px';
};
barAircraftOptions.addEventListener('click',e=>{
 const button=e.target.closest('[data-bar-aircraft],[data-bar-aircraft-reset]');if(!button||button.disabled)return;
 const plan=selectedPlan(),ids=[...barMenuIds],day=barMenuDate;
 if(!plan||plan.locked||Toki.charterMode||day!==date||currentBarPlan()!==barMenuPlan){closeBarMenu();return;}
 const before=structuredClone(aircraftSubstitutions);
 try{
 aircraftSubstitutions[plan.id]||={};aircraftSubstitutions[plan.id][day]||={};
 for(const f of currentFlights().filter(f=>ids.includes(f.id)&&!f.charter)){
 const target=button.dataset.barAircraft;
 if(button.hasAttribute('data-bar-aircraft-reset')||target===f.aircraft)delete aircraftSubstitutions[plan.id][day][f.id];
 else aircraftSubstitutions[plan.id][day][f.id]={from:f.from,to:f.to,aircraft:target};
 }
 saveAircraftSubstitutions();closeBarMenu();render();renderSidebar();toast('選択した便の当日の機材を変更しました。ダイヤコードはそのままです。');
 }catch(error){aircraftSubstitutions=before;toast('機材変更を保存できませんでした。');}
});
