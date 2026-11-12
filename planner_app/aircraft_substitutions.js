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
