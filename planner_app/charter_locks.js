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
