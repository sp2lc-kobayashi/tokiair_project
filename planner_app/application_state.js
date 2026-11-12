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
