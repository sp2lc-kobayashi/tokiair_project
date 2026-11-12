let showingIntegrated=false,integratedModel=null;
function integratedDaily(day){
 const owner=Toki.assignedPlanId?.(day),current=selectedPlan(),plan=planLibrary.items.find(p=>(owner===undefined||p.id===owner)&&Toki.isPlanApplied(p.id===current?.id?state:p.data,day));
 const data=plan?(plan.id===current?.id?state:plan.data):state,period=(data.periods||[]).find(p=>p.dates.includes(day)),regular=(plan?data.days[day]||[]:[]).map(f=>Toki.aircraftForDate?Toki.aircraftForDate(f,day,plan?.id):f),charters=Toki.charterFlights?.(day)||[],machines=period?.machines||data.machines;
 return {day,planId:plan?.id||'',code:plan?.name||'',regular,charters,flights:[...regular,...charters],machines,events:(Toki.fleetEvents||[]).filter(e=>e.start<=day&&day<=e.end)};
}
function buildIntegratedSchedule(from,to,seats72,seats42){
 if(!validDate(from)||!validDate(to)||from>to)throw Error('表示期間を確認してください。');
 const days=Toki.dateKeys().filter(d=>d>=from&&d<=to).map(integratedDaily),rows=[],cell=(text='',color='')=>({text,color}),add=(group,label,detail,values)=>rows.push({group,label,detail,cells:values.map(v=>typeof v==='object'?v:cell(v))});
 const events=[...new Map(days.flatMap(d=>d.events).map(e=>[e.id,e])).values()];
 add('全体','チャーター','チャーター名',days.map(d=>{if(!d.charters.length)return cell('');const groups=[...new Set(d.charters.map(f=>f.charterGroupId||''))],titles=groups.map(id=>{const group=typeof charterGroups!=='undefined'?charterGroups.items.find(g=>g.id===id):null;return (typeof timelineMemos!=='undefined'?(timelineMemos['charter-code:'+id]??timelineMemos['charter:'+d.day]??timelineMemos['charter:'+group?.day]):'')||group?.code||'チャーター';});return {text:[...new Set(titles)].join(' ／ '),color:'#eee5fa',detail:[...new Set(titles)].join(' ／ ')+'\n'+d.charters.map(f=>f.id+' '+f.from+'−'+f.to+' '+f.dep+'−'+f.arr).join('\n')};}));
 for(const event of events.filter(e=>!e.aircraft))add('全体','イベント',event.title,days.map(d=>d.events.some(e=>e.id===event.id)?cell(event.title,Toki.eventColor(event)+'22'):''));
 const machines=[...new Map(days.flatMap(d=>d.machines).map(m=>[m.name,m])).values()];
 for(const machine of machines){
  add('機材整備・イベント',machine.name,'整備・イベント',days.map(d=>{const events=d.events.filter(e=>e.aircraft===machine.name);return {text:events.map(e=>e.title).join('\n'),color:events.length?Toki.eventColor(events[0])+'22':'',detail:events.map(e=>e.title+' '+e.start+'〜'+e.end).join('\n')};}));
 }
 for(const machine of machines){
  add('機材',machine.name,'便数・稼働時間',days.map(d=>{const m=d.machines.find(m=>m.name===machine.name),fs=d.flights.filter(f=>f.aircraft===m?.id).sort((a,b)=>minutes(a.dep)-minutes(b.dep));return {text:fs.length?fs.length+'便\n'+fs[0].dep+'–'+fs.at(-1).arr:'—',color:fs.length?'#edf4fb':'#f7f8fa',detail:fs.map(f=>f.id+' '+f.from+'−'+f.to+' '+f.dep+'〜'+f.arr).join('\n')};}));
 }
 add('機材','使用不可機材','全日運航不可',days.map(d=>d.events.filter(e=>e.blocks&&e.aircraft).map(e=>e.aircraft).join('\n')));
 add('ダイヤ','定期便','ダイヤコード',days.map(d=>cell(d.code,d.code?Toki.planColor(d.code)+'22':'')));
 add('ダイヤ','チャーターコード','チャーターコード',days.map(d=>{const codes=[...new Set(d.charters.map(f=>typeof charterGroups!=='undefined'?charterGroups.items.find(g=>g.id===f.charterGroupId)?.code:'').filter(Boolean))];return cell(codes.join(' / '),codes.length?'#eee5fa':'');}));
 add('運航集計','総便数','定期便＋チャーター',days.map(d=>d.flights.length||''));
 add('運航集計','総ブロックタイム','時間＋分',days.map(d=>d.flights.length?formatBlock(d.flights.filter(f=>!f.blockUnset).reduce((n,f)=>n+Math.max(0,minutes(f.arr)-minutes(f.dep)),0)):''));
 add('運航集計','チェック','Accept済みを除く',days.map(d=>{const n=calendarIssuesForDate(d.day).length;return cell(n,n?'#fff0f1':'#edf6ef');}));
 const flights=[...new Map(days.flatMap(d=>d.regular).map(f=>[f.id+'|'+f.from+'|'+f.to,{id:f.id,from:f.from,to:f.to}])).values()].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true})||(a.from+a.to).localeCompare(b.from+b.to));
 let missingCapacity=0;const capacities=new Map();
 function capacity(d,f){const machine=d.machines.find(m=>m.id===f.aircraft);if(!machine)return null;return Number.isFinite(f.seats)?f.seats:machine.type==='ATR72'?seats72:machine.type==='ATR42'?seats42:null;}
 for(const flight of flights){const key=flight.id+'|'+flight.from+'|'+flight.to,cells=days.map(d=>{const match=d.regular.find(f=>f.id===flight.id&&f.from===flight.from&&f.to===flight.to);if(!match)return cell('');const base=capacity(d,match),value=typeof buildSeatRequestCell==='function'?buildSeatRequestCell(d,match,base):{text:base===null?'未設定':base,effectiveSeats:base};if(value.effectiveSeats===null)missingCapacity++;return value;});capacities.set(key,cells.map(c=>c.effectiveSeats===null?'未設定':c.effectiveSeats??c.text));add('計画提供座席数',flight.from+'−'+flight.to,flight.id,cells);}
 add('計画提供座席数','合計','定期便',days.map((d,i)=>{const values=[...capacities.values()].map(v=>v[i]);return values.includes('未設定')?'未設定':values.reduce((n,v)=>n+(typeof v==='number'?v:0),0);}));
 for(const flight of flights)add('予約座席数',flight.from+'−'+flight.to,flight.id,days.map(()=>''));
 add('予約座席数','合計','予約データ未登録',days.map(()=>''));add('予約座席数','Load Factor','予約データ未登録',days.map(()=>''));

 return {from,to,days,rows,missingCapacity,totalFlights:days.reduce((n,d)=>n+d.flights.length,0)};
}
function renderIntegratedSchedule(){
 try{const seats72=Number($('integrated-seats72').value),seats42=Number($('integrated-seats42').value);if(!Number.isInteger(seats72)||seats72<1||seats72>100||!Number.isInteger(seats42)||seats42<1||seats42>100)throw Error('座席数は1〜100の整数で指定してください。');
 const model=buildIntegratedSchedule($('integrated-from').value,$('integrated-to').value,seats72,seats42);integratedModel=model;
 const weekday=d=>'日月火水木金土'[new Date(d+'T00:00:00Z').getUTCDay()],holiday=d=>Toki.holiday(d)?.name||'',dayClass=d=>holiday(d)||weekday(d)==='日'?'int-sun':weekday(d)==='土'?'int-sat':'';
 let months='';for(let i=0;i<model.days.length;){let end=i+1;while(end<model.days.length&&model.days[end].day.slice(0,7)===model.days[i].day.slice(0,7))end++;months+=`<th class="int-month-header" colspan="${end-i}"><span class="int-month-label">${model.days[i].day.slice(0,7).replace('-','年')}月</span></th>`;i=end;}
 const headers=`<thead><tr><th class="int-label int-group" rowspan="3">区分</th><th class="int-label int-item" rowspan="3">項目</th><th class="int-label int-detail" rowspan="3">内容・便名</th>${months}</tr><tr>${model.days.map(d=>`<th class="${dayClass(d.day)}">${Number(d.day.slice(8))}</th>`).join('')}</tr><tr>${model.days.map(d=>`<th class="${dayClass(d.day)}" title="${esc(holiday(d.day))}">${weekday(d.day)}</th>`).join('')}</tr></thead>`;
 const mergedLabel=(index,field,className)=>{const row=model.rows[index],prior=model.rows[index-1],same=other=>other&&other.group===row.group&&(field==='group'||other.label===row.label);if(same(prior))return '';let count=1;while(same(model.rows[index+count]))count++;return `<th class="int-label ${className}" rowspan="${count}" scope="rowgroup">${esc(row[field])}</th>`;};
 $('integrated-grid').innerHTML=`<table class="integrated-table">${headers}<tbody>${model.rows.map((r,i)=>`<tr class="${i===0||model.rows[i-1].group!==r.group?'int-section-start':''}">${mergedLabel(i,'group','int-group')}${mergedLabel(i,'label','int-item')}<th class="int-label int-detail">${esc(r.detail)}</th>${r.cells.map((c,j)=>`<td class="${r.group==='機材'?'int-fleet-cell':''} ${c.seatStatus?'seat-status-'+c.seatStatus:''} ${r.group==='全体'&&r.label==='チャーター'?'int-charter-name':''} ${r.detail==='便数・稼働時間'&&model.days[j].flights.some(f=>f.aircraftChanged&&f.aircraft===model.days[j].machines.find(m=>m.name===r.label)?.id)?'int-aircraft-changed':''}" ${r.detail==='便数・稼働時間'?`tabindex="0" data-fleet-day="${model.days[j].day}" data-fleet-machine="${esc(r.label)}" draggable="${c.text!=='—'}"`: ''} style="background:${c.color||''}" ${r.group==='全体'&&r.label==='チャーター'&&c.text?`tabindex="0" data-charter-preview-day="${model.days[j].day}"`: ''} ${c.seatRequestKey?`tabindex="0" data-seat-request-key="${esc(c.seatRequestKey)}" data-seat-request-row="${i}" data-seat-request-day="${j}" aria-label="座席数セル（右クリックで座席ブロック）"`: ''} title="${esc(model.days[j].day+' '+r.label+' '+r.detail+'\n'+(c.detail||c.text))}">${esc(c.text)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 $('integrated-summary').textContent=model.from+' 〜 '+model.to+' ／ '+model.days.length+'日 ／ '+model.totalFlights.toLocaleString()+'便（定期便 '+model.days.reduce((n,d)=>n+d.regular.length,0).toLocaleString()+'便 ／ チャーター '+model.days.reduce((n,d)=>n+d.charters.length,0).toLocaleString()+'便） ／ ブロックタイム '+formatBlock(model.days.reduce((total,d)=>total+d.flights.filter(f=>!f.blockUnset).reduce((n,f)=>n+Math.max(0,minutes(f.arr)-minutes(f.dep)),0),0));
 if(typeof integratedPreviewDay!=='undefined'&&integratedPreviewDay)showIntegratedDayPreview(integratedPreviewDay);
 $('integrated-note').textContent='適用済みの定期便・登録済みチャーター・イベントを反映。予約座席数・搭乗率はデータ未登録のため空欄。'+(model.missingCapacity?' 機材未割当などによる座席数未設定：'+model.missingCapacity+'便。':'');
 }catch(e){toast(e.message);}
}
function setIntegratedRange(){const key=$('integrated-period').value,match=/^([SW])(\d{4})$/.exec(key);const range=match?seasonRange(Number(match[2]),match[1]):calendarSeason();$('integrated-from').value=range.from;$('integrated-to').value=range.to;}
function showIntegratedPage(){if(Toki.charterMode)exitCharterMode();showSettingsPage(false);showingIntegrated=true;$('planner-content').hidden=true;$('settings-page').hidden=true;$('integrated-page').hidden=false;document.querySelector('header.editing-header').hidden=true;$('integrated-period').value=calendarSeason().key;setIntegratedRange();renderIntegratedSchedule();const preview=integratedModel?.days.find(d=>d.day===date)||integratedModel?.days.find(d=>d.flights.length)||integratedModel?.days[0];if(preview)showIntegratedDayPreview(preview.day);}
$('integrated-open').onclick=showIntegratedPage;
$('integrated-period').onchange=()=>{setIntegratedRange();renderIntegratedSchedule();};for(const id of ['integrated-from','integrated-to','integrated-seats72','integrated-seats42'])$(id).onchange=renderIntegratedSchedule;
const showSettingsBeforeIntegrated=showSettingsPage;showSettingsPage=function(show){showingIntegrated=false;$('integrated-page').hidden=true;showSettingsBeforeIntegrated(show);};
$('plan-list').addEventListener('click',e=>{if(showingIntegrated&&e.target.closest('[data-plan-id]')){showingIntegrated=false;$('integrated-page').hidden=true;showSettingsPage(false);}});
const createBeforeIntegrated=$('create-plan').onclick;$('create-plan').onclick=()=>{if(showingIntegrated){showSettingsPage(false);return;}return createBeforeIntegrated();};
$('integrated-excel').onclick=()=>{renderIntegratedSchedule();if(!integratedModel)return;const m=integratedModel,rows=[['統合スケジュール',m.from+'〜'+m.to,'',...m.days.map(d=>d.day)],['区分','項目','内容・便名',...m.days.map(d=>'日月火水木金土'[new Date(d.day+'T00:00:00Z').getUTCDay()])],...m.rows.map(r=>[r.group,r.label,r.detail,...r.cells.map(c=>c.seatRequestKey?(c.effectiveSeats===null?'未設定':c.effectiveSeats):c.text)]),...m.rows.filter(r=>r.cells.some(c=>c.seatAudit)).map(r=>['座席数変更・確認記録',r.label,r.detail,...r.cells.map(c=>c.seatAudit||'')])];download('統合スケジュール_'+m.from+'_'+m.to+'.xlsx',exportIntegratedExcel(rows,[22,23,32,...m.days.map(()=>10)]),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');};

// Only season ranges are available; aircraft capacities are global settings.
$('integrated-period').innerHTML=Array.from({length:11},(_,i)=>2026+i).flatMap(year=>['S','W'].map(kind=>`<option value="${kind}${year}">${year}年 ${kind==='S'?'夏':'冬'}ダイヤ</option>`)).join('');
$('integrated-period').value=calendarSeason().key;
$('integrated-from').hidden=true;$('integrated-to').hidden=true;const rangeSeparator=$('integrated-from').nextElementSibling;if(rangeSeparator?.tagName==='SPAN')rangeSeparator.hidden=true;
const capacitySettings=document.createElement('section');capacitySettings.className='panel';
for(const id of ['integrated-seats72','integrated-seats42'])capacitySettings.appendChild($(id).closest('label'));
$('settings-page').appendChild(capacitySettings);makeSettingsFold(capacitySettings,'aircraft-capacity','機種別座席数');
let savedCapacities={};try{savedCapacities=JSON.parse(localStorage.getItem('toki-aircraft-capacities-v1')||'{}');}catch(e){}
for(const [id,key,fallback] of [['integrated-seats72','ATR72',72],['integrated-seats42','ATR42',46]]){
 const input=$(id),n=Number(savedCapacities[key]);input.value=Number.isInteger(n)&&n>=1&&n<=100?n:fallback;
 input.onchange=()=>{const value=Number(input.value);if(!Number.isInteger(value)||value<1||value>100){input.value=savedCapacities[key]||fallback;toast('座席数は1〜100の整数で指定してください。');return;}
 savedCapacities[key]=value;try{localStorage.setItem('toki-aircraft-capacities-v1',JSON.stringify(savedCapacities));if(showingIntegrated)renderIntegratedSchedule();}catch(e){toast('座席数を保存できませんでした。');}};
}

let integratedAircraftDrag=null;
function moveIntegratedAircraft(day,sourceName,targetName,options={}){
 if(sourceName===targetName)return 0;
 const daily=integratedDaily(day),source=daily.machines.find(m=>m.name===sourceName),target=daily.machines.find(m=>m.name===targetName);if(!source||!target)throw Error('機材を確認してください。');
 const flights=daily.flights.filter(f=>f.aircraft===source.id&&(!options.ids||options.ids.includes(f.id)));if(!flights.length)return 0;
 const owner=Toki.assignedPlanId(day),plan=planLibrary.items.find(p=>p.id===owner),data=plan?.id===selectedPlan()?.id?state:plan?.data;
 if(flights.some(f=>!f.charter)&&(!plan||plan.locked))throw Error('ロック中の定期便は機材変更できません。');
 if(flights.some(f=>f.charter)&&charterDayLocked(day))throw Error('ロック中のチャーターは機材変更できません。');
 if(options.dryRun)return flights.length;
 const before=structuredClone(aircraftSubstitutions),beforeCharters=structuredClone(charterRecords);
 try{
 for(const flight of flights.filter(f=>!f.charter)){
 const original=(data.flights||data.days[day]||[]).find(f=>f.id===flight.id&&f.from===flight.from&&f.to===flight.to)||flight;
 aircraftSubstitutions[owner]||={};aircraftSubstitutions[owner][day]||={};
 if(original.aircraft===target.id)delete aircraftSubstitutions[owner][day][flight.id];else aircraftSubstitutions[owner][day][flight.id]={from:flight.from,to:flight.to,aircraft:target.id};
 }
 if(!options.defer)saveAircraftSubstitutions();
 if(flights.some(f=>f.charter)){const ids=new Set(flights.filter(f=>f.charter).map(f=>f.recordId));const next=charterRecords.map(c=>ids.has(c.recordId)?{...c,aircraft:target.id}:c);if(options.defer)charterRecords=next;else saveCharters(next);}
 if(!options.defer){renderIntegratedSchedule();render();renderSidebar();}return flights.length;
 }catch(e){aircraftSubstitutions=before;charterRecords=beforeCharters;try{saveAircraftSubstitutions();localStorage.setItem(CHARTERS_KEY,JSON.stringify(beforeCharters));}catch(ignore){}throw e;}
}

let integratedFleetSelection=new Set(),integratedFleetAnchor=null,integratedMarquee=null;
const fleetCellKey=cell=>cell.dataset.fleetDay+'|'+cell.dataset.fleetMachine;
function integratedFleetCells(){return [...$('integrated-grid').querySelectorAll('[data-fleet-day]')];}
function markIntegratedFleetSelection(){for(const cell of integratedFleetCells())cell.classList.toggle('int-fleet-selected',integratedFleetSelection.has(fleetCellKey(cell)));}
function selectIntegratedFleetCell(cell,add=false,range=false){
 const key=fleetCellKey(cell);
 if(range&&integratedFleetAnchor){const anchor=integratedFleetCells().find(c=>fleetCellKey(c)===integratedFleetAnchor);if(anchor){const machines=[...new Set(integratedFleetCells().map(c=>c.dataset.fleetMachine))],a=machines.indexOf(anchor.dataset.fleetMachine),b=machines.indexOf(cell.dataset.fleetMachine),from=[anchor.dataset.fleetDay,cell.dataset.fleetDay].sort();if(!add)integratedFleetSelection.clear();for(const c of integratedFleetCells())if(c.draggable!==false&&c.getAttribute('draggable')==='true'&&c.dataset.fleetDay>=from[0]&&c.dataset.fleetDay<=from[1]&&machines.indexOf(c.dataset.fleetMachine)>=Math.min(a,b)&&machines.indexOf(c.dataset.fleetMachine)<=Math.max(a,b))integratedFleetSelection.add(fleetCellKey(c));markIntegratedFleetSelection();return;}}
 if(!add)integratedFleetSelection.clear();if(add&&integratedFleetSelection.has(key))integratedFleetSelection.delete(key);else if(cell.getAttribute('draggable')==='true')integratedFleetSelection.add(key);integratedFleetAnchor=key;markIntegratedFleetSelection();
}
const integratedSelectionBox=document.createElement('div');integratedSelectionBox.id='integrated-fleet-selection-box';integratedSelectionBox.hidden=true;document.body.appendChild(integratedSelectionBox);
$('integrated-grid').addEventListener('pointerdown',e=>{
 if(e.button!==0)return;const cell=e.target.closest('[data-fleet-day]');if(!cell)return;
 if(e.shiftKey){e.preventDefault();selectIntegratedFleetCell(cell,e.ctrlKey||e.metaKey,true);return;}
 if(integratedFleetSelection.has(fleetCellKey(cell))&&!e.ctrlKey&&!e.metaKey)return;
 e.preventDefault();integratedMarquee={x:e.clientX,y:e.clientY,cell,add:e.ctrlKey||e.metaKey,before:new Set(integratedFleetSelection),moved:false};
});
document.addEventListener('pointermove',e=>{
 const m=integratedMarquee;if(!m)return;if(Math.abs(e.clientX-m.x)+Math.abs(e.clientY-m.y)<5&&!m.moved)return;m.moved=true;
 const left=Math.min(m.x,e.clientX),top=Math.min(m.y,e.clientY),right=Math.max(m.x,e.clientX),bottom=Math.max(m.y,e.clientY);integratedSelectionBox.hidden=false;Object.assign(integratedSelectionBox.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
 integratedFleetSelection=m.add?new Set(m.before):new Set();for(const cell of integratedFleetCells()){const r=cell.getBoundingClientRect();if(cell.getAttribute('draggable')==='true'&&r.right>left&&r.left<right&&r.bottom>top&&r.top<bottom)integratedFleetSelection.add(fleetCellKey(cell));}markIntegratedFleetSelection();
});
document.addEventListener('pointerup',()=>{if(!integratedMarquee)return;const m=integratedMarquee;integratedMarquee=null;integratedSelectionBox.hidden=true;if(!m.moved){selectIntegratedFleetCell(m.cell,m.add,false);if(!m.add)showIntegratedDayPreview(m.cell.dataset.fleetDay);}else{integratedFleetAnchor=fleetCellKey(m.cell);integratedPreviewIgnoreClickUntil=Date.now()+250;}});
document.addEventListener('pointercancel',()=>{integratedMarquee=null;integratedSelectionBox.hidden=true;});
function moveIntegratedFleetSelection(entries,target){
 const selectedByDay=new Map();for(const entry of new Set(entries)){const split=entry.indexOf('|'),day=entry.slice(0,split),machine=entry.slice(split+1);if(machine===target)continue;if(!selectedByDay.has(day))selectedByDay.set(day,new Set());selectedByDay.get(day).add(machine);}
 const jobs=[],swaps=[];
 for(const [day,names] of selectedByDay){if(names.size>1)throw Error('入れ替える元の機番は、1日につき1機選択してください。');const machine=[...names][0],daily=integratedDaily(day),source=daily.machines.find(m=>m.name===machine),dest=daily.machines.find(m=>m.name===target);if(!source||!dest)throw Error('機材を確認してください。');const outgoing=daily.flights.filter(f=>f.aircraft===source.id).map(f=>f.id),incoming=daily.flights.filter(f=>f.aircraft===dest.id).map(f=>f.id);if(!outgoing.length)continue;jobs.push({day,machine,target,ids:outgoing},{day,machine:target,target:machine,ids:incoming});swaps.push({day,machine});}
 // Capture both sets before any assignment changes, then validate the complete exchange.
 for(const job of jobs)if(job.ids.length)moveIntegratedAircraft(job.day,job.machine,job.target,{ids:job.ids,dryRun:true});
 const before=structuredClone(aircraftSubstitutions),chartersBefore=structuredClone(charterRecords),appliedBefore=typeof appliedCharterRecords!=='undefined'?structuredClone(appliedCharterRecords):null;let count=0;
 try{for(const job of jobs)if(job.ids.length)count+=moveIntegratedAircraft(job.day,job.machine,job.target,{ids:job.ids,defer:true});saveAircraftSubstitutions();localStorage.setItem(CHARTERS_KEY,JSON.stringify(charterRecords));if(typeof syncAppliedCharterAllocations==='function')syncAppliedCharterAllocations();}
 catch(e){aircraftSubstitutions=before;charterRecords=chartersBefore;try{saveAircraftSubstitutions();localStorage.setItem(CHARTERS_KEY,JSON.stringify(charterRecords));if(appliedBefore){appliedCharterRecords=appliedBefore;localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(appliedBefore));}}catch(ignore){}throw e;}
 integratedFleetSelection=new Set(swaps.map(j=>j.day+'|'+target));renderIntegratedSchedule();markIntegratedFleetSelection();render();renderSidebar();return count;
}
$('integrated-grid').addEventListener('dragstart',e=>{const cell=e.target.closest('[data-fleet-day]');if(!cell)return;if(integratedMarquee){e.preventDefault();return;}if(!integratedFleetSelection.has(fleetCellKey(cell)))selectIntegratedFleetCell(cell);integratedAircraftDrag={entries:[...integratedFleetSelection]};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','機材変更');for(const c of integratedFleetCells())if(integratedFleetSelection.has(fleetCellKey(c)))c.classList.add('int-fleet-dragging');});
$('integrated-grid').addEventListener('dragover',e=>{const cell=e.target.closest('[data-fleet-day]');if(!integratedAircraftDrag||!cell)return;e.preventDefault();e.dataTransfer.dropEffect='move';document.querySelectorAll('.int-fleet-drop').forEach(c=>c.classList.remove('int-fleet-drop'));cell.classList.add('int-fleet-drop');});
function clearIntegratedAircraftDrag(){integratedAircraftDrag=null;document.querySelectorAll('.int-fleet-drop,.int-fleet-dragging').forEach(c=>c.classList.remove('int-fleet-drop','int-fleet-dragging'));}
$('integrated-grid').addEventListener('drop',e=>{const cell=e.target.closest('[data-fleet-day]'),drag=integratedAircraftDrag;if(!cell||!drag)return;e.preventDefault();clearIntegratedAircraftDrag();try{const count=moveIntegratedFleetSelection(drag.entries,cell.dataset.fleetMachine);if(count)toast('機材を入れ替えました（合計'+count+'便）。日付・時刻・ダイヤコードはそのままです。');}catch(error){toast(error.message);}});
$('integrated-grid').addEventListener('dragend',clearIntegratedAircraftDrag);
document.addEventListener('keydown',e=>{if(showingIntegrated&&e.key==='Escape'){integratedFleetSelection.clear();markIntegratedFleetSelection();integratedMarquee=null;integratedSelectionBox.hidden=true;clearIntegratedAircraftDrag();}});

let integratedPreviewDay='',integratedPreviewIgnoreClickUntil=0;
const integratedDayPreview=document.createElement('section');integratedDayPreview.id='integrated-day-preview';integratedDayPreview.className='panel';integratedDayPreview.hidden=true;integratedDayPreview.innerHTML='<div class="panel-title"><div><strong id="integrated-preview-title"></strong> <span class="tag">表示のみ</span></div><button id="integrated-preview-open-regular" type="button">定期便の設定へ</button><button id="integrated-preview-close" aria-label="ダイヤ表示を閉じる">×</button></div><div class="scroll"><div id="integrated-preview-timeline" class="timeline"></div></div>';$('integrated-page').appendChild(integratedDayPreview);
$('integrated-preview-close').onclick=()=>{integratedPreviewDay='';integratedDayPreview.hidden=true;};
function showIntegratedDayPreview(day){
 if(!validDate(day))return;const daily=integratedDaily(day),fs=daily.flights;
 integratedPreviewDay=day;integratedDayPreview.hidden=false;$('integrated-preview-open-regular').disabled=!daily.planId;
 const weekday='日月火水木金土'[new Date(day+'T00:00:00Z').getUTCDay()];$('integrated-preview-title').textContent=day+'（'+weekday+'）'+(daily.code?' ／ ダイヤコード '+daily.code:'')+' ／ '+fs.length+'便';
 const start=Math.min(360,...fs.map(f=>minutes(f.dep))),end=Math.max(1320,...fs.map(f=>minutes(f.arr))),span=Math.max(60,end-start);
 const axis='<div class="axis"><span>機材 ／ 開始空港</span><div class="hours">'+Array.from({length:Math.floor(span/60)+1},(_,i)=>'<span>'+clock(start+i*60)+'</span>').join('')+'</div></div>';
 $('integrated-preview-timeline').innerHTML=axis+[...daily.machines,{id:'',name:'未割当',type:'',start:''}].map(machine=>{
 const rows=fs.filter(f=>f.aircraft===machine.id).sort((a,b)=>minutes(a.dep)-minutes(b.dep)),ends=[],layers=new Map();
 const maintenance=daily.events.filter(e=>e.aircraft&&e.aircraft===machine.name),servicing=maintenance.some(e=>['maintenance','inspection','airworthiness'].includes(e.type));
 const bars=rows.map(f=>{let layer=ends.findIndex(t=>t<=minutes(f.dep));if(layer<0)layer=ends.length;ends[layer]=Math.max(minutes(f.arr),minutes(f.dep)+1);layers.set(f.id,layer);const color=barColor(f),width=Math.max(.5,(minutes(f.arr)-minutes(f.dep))/span*100);return `<div class="flight ${f.aircraftChanged?'preview-aircraft-changed':''}" style="left:${(minutes(f.dep)-start)/span*100}%;width:${width}%;top:${8+layer*64}px;background:${color};color:${barText(color)}" title="${esc(f.id+' '+f.from+'–'+f.to+' '+f.dep+'–'+f.arr+(f.charter?' ／ チャーター':'')+(f.aircraftChanged?' ／ 当日の機材変更':''))}"><span class="flight-bar-line">${esc(f.from+' - '+f.to)}</span><span class="flight-bar-line">${f.dep} - ${f.blockUnset?'':f.arr}</span><span class="flight-bar-line"><b>${esc(f.id)}</b> ${f.blockUnset?'':formatBlock(Math.max(0,minutes(f.arr)-minutes(f.dep)))}</span></div>`;}).join('');
 const gaps=rows.slice(1).map((next,i)=>{const prior=rows[i],gap=minutes(next.dep)-minutes(prior.arr),center=((minutes(prior.arr)+minutes(next.dep))/2-start)/span*100;return `<span class="preview-flight-gap" style="left:${center}%;top:${28+(layers.get(next.id)||0)*64}px">${gap}</span>`;}).join('');
 return `<div class="lane ${servicing?'maintenance-lane':''}" style="min-height:${Math.max(78,ends.length*64+14)}px"><div class="lane-label"><strong>${esc(machine.name)}</strong><span class="muted">${esc(machine.type||'')} ／ ${rows.length}便</span><span class="muted">${esc(airports[machine.start]||'')}</span>${maintenance.map(e=>`<span class="aircraft-event-tag">${esc(e.title)}</span>`).join('')}</div><div class="track">${bars}${gaps}</div></div>`;
 }).join('');
}
$('integrated-grid').addEventListener('click',e=>{const cell=e.target.closest('[data-fleet-day]');if(!cell||e.ctrlKey||e.metaKey||e.shiftKey||Date.now()<integratedPreviewIgnoreClickUntil)return;showIntegratedDayPreview(cell.dataset.fleetDay);});
$('integrated-grid').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const cell=e.target.closest('[data-fleet-day]');if(!cell)return;e.preventDefault();showIntegratedDayPreview(cell.dataset.fleetDay);});

const integratedPeriodLabel=$('integrated-period').closest('label');integratedPeriodLabel.classList.add('integrated-period-heading');$('integrated-page').querySelector('.panel-title h1').insertAdjacentElement('afterend',integratedPeriodLabel);

let integratedLiveTimer=null;
function scheduleIntegratedLiveRefresh(){
 if(!showingIntegrated||integratedLiveTimer!==null)return;
 integratedLiveTimer=setTimeout(()=>{
 integratedLiveTimer=null;if(!showingIntegrated)return;
 if(integratedAircraftDrag||integratedMarquee){scheduleIntegratedLiveRefresh();return;}
 const grid=$('integrated-grid'),left=grid.scrollLeft,top=grid.scrollTop;
 renderIntegratedSchedule();grid.scrollLeft=left;grid.scrollTop=top;markIntegratedFleetSelection();
 },30);
}
const renderBeforeIntegratedLive=render;render=function(){renderBeforeIntegratedLive();scheduleIntegratedLiveRefresh();};
const sidebarBeforeIntegratedLive=renderSidebar;renderSidebar=function(){sidebarBeforeIntegratedLive();scheduleIntegratedLiveRefresh();};
const persistBeforeIntegratedLive=persistLibrary;persistLibrary=function(){const result=persistBeforeIntegratedLive();if(result)scheduleIntegratedLiveRefresh();return result;};

$('integrated-preview-open-regular').onclick=()=>{const day=integratedPreviewDay;if(!day)return;const applied=integratedDaily(day);if(!applied.planId){toast('この日に適用されている定期便ダイヤがありません。');return;}if(Toki.charterMode)exitCharterMode();showSettingsPage(false);selectAppliedDate(day);render();renderSidebar();};

$('integrated-grid').addEventListener('click',e=>{const cell=e.target.closest('[data-charter-preview-day]');if(cell)showIntegratedDayPreview(cell.dataset.charterPreviewDay);});
$('integrated-grid').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const cell=e.target.closest('[data-charter-preview-day]');if(cell){e.preventDefault();showIntegratedDayPreview(cell.dataset.charterPreviewDay);}});
