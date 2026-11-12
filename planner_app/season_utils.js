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
