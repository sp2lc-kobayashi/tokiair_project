function syncEventAircraft(reset=true){const selected=!!$('event-aircraft').value;$('event-block').disabled=!selected;if(!selected)$('event-block').checked=false;else if(reset)$('event-block').checked=true;}
$('event-aircraft').onchange=()=>syncEventAircraft();
// Fleet events are shared across named schedule alternatives in this browser.
const EVENTS_KEY='toki-fleet-events-v1';let aircraftEvents=[],eventEditingId='',eventFormSeason=null;let eventStorageWritable=true;
try{const saved=localStorage.getItem(EVENTS_KEY);if(saved)aircraftEvents=Toki.validateEvents(JSON.parse(saved));}catch(err){eventStorageWritable=false;toast('保存済みイベントを読み込めません。既存データは上書きしません。');}
function chosenEventSeason(){const key=Toki.planListSeasonKey;if(!/^[SW]20\d{2}$/.test(key||''))return null;const season=seasonRange(Number(key.slice(1)),key[0]);return season.available?season:null;}
function eventsForSeason(season=chosenEventSeason()){return season?aircraftEvents.filter(e=>e.seasonKey===season.key):[];}
// Older events are assigned by their actual dates, not by the open schedule.
for(const event of aircraftEvents)if(!event.seasonKey){for(let year=2026;year<=2036;year++)for(const kind of ['S','W']){const season=seasonRange(year,kind);if(season.available&&event.start>=season.from&&event.end<=season.to)event.seasonKey=season.key;}}
Toki.fleetEvents=aircraftEvents;
function renderEventList(){
 $('event-list').innerHTML=[...eventsForSeason(eventFormSeason||chosenEventSeason())].sort((a,b)=>a.start.localeCompare(b.start)).map(e=>`<div class="fleet-event-row"><div><strong>${esc(e.title)}</strong><span>${esc(e.aircraft||'機体指定なし')} ／ ${e.start} 〜 ${e.end}</span>${e.note?`<span>${esc(e.note)}</span>`:''}</div><button data-edit-event="${e.id}">編集</button><button data-delete-event="${e.id}">削除</button></div>`).join('')||'<div class="muted">イベント未設定</div>';
}
function resetEventForm(){eventEditingId='';$('event-title').value='';$('event-type').value='';const season=eventFormSeason||chosenEventSeason();const initial=season?(date<season.from?season.from:date>season.to?season.to:date):date;for(const id of ['event-start','event-end']){$(id).min=season?.from||START;$(id).max=season?.to||END;$(id).value=initial;}$('event-note').value='';$('event-color').value='#ba6b21';$('event-aircraft').value='';syncEventAircraft();}
function saveFleetEvents(next){
 Toki.validateEvents(next);if(!eventStorageWritable){toast('イベントの保存を利用できません。');return false;}
 try{localStorage.setItem(EVENTS_KEY,JSON.stringify(next));aircraftEvents=next;Toki.fleetEvents=aircraftEvents;renderEventList();render();return true;}catch(err){toast('イベントを保存できませんでした。');return false;}
}
$('events-open').onclick=()=>{
 eventFormSeason=chosenEventSeason();if(!eventFormSeason){toast('年と夏・冬ダイヤを選択してください。');return;}
 $('events-title').textContent='イベント設定 ／ '+eventFormSeason.kind+String(eventFormSeason.year).slice(-2);
 const names=[...new Set(['JA01QQ','JA02QQ','JA03QQ',...state.machines.map(m=>m.name)])];
 $('event-aircraft').innerHTML='<option value="">指定なし</option>'+names.map(n=>`<option>${esc(n)}</option>`).join('');
 resetEventForm();renderEventList();$('events-dialog').showModal();
};
$('events-close').onclick=()=>$('events-dialog').close();
$('event-clear').onclick=resetEventForm;
$('event-save').onclick=()=>{
 if(!eventFormSeason){toast('シーズンを選択してください。');return;}
 const event={seasonKey:eventFormSeason.key,id:eventEditingId||'E'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),title:$('event-title').value.trim(),type:$('event-type').value,aircraft:$('event-aircraft').value,start:$('event-start').value,end:$('event-end').value,blocks:!!$('event-aircraft').value&&$('event-block').checked,note:$('event-note').value.trim(),color:$('event-color').value};
 try{if(event.start<eventFormSeason.from||event.end>eventFormSeason.to)throw Error('イベント期間は '+eventFormSeason.from+'〜'+eventFormSeason.to+' のシーズン内で指定してください。');Toki.validateEvents([event]);const next=aircraftEvents.filter(e=>e.id!==event.id);next.push(event);if(saveFleetEvents(next)){resetEventForm();toast('イベントを登録しました。');}}catch(err){toast(err.message);}
};
$('event-list').onclick=e=>{
 const edit=e.target.closest('[data-edit-event]'),del=e.target.closest('[data-delete-event]');
 if(edit){const event=aircraftEvents.find(e=>e.id===edit.dataset.editEvent);if(!event)return;eventEditingId=event.id;for(const [field,key] of [['title','title'],['type','type'],['aircraft','aircraft'],['start','start'],['end','end'],['note','note']])$('event-'+field).value=event[key]||'';$('event-color').value=Toki.eventColor(event);$('event-block').checked=event.blocks;syncEventAircraft(false);}
 if(del&&confirm('このイベントを削除しますか？'))saveFleetEvents(aircraftEvents.filter(e=>e.id!==del.dataset.deleteEvent));
};
render();

function renderEventSidebar(){
 $('sidebar-event-list').innerHTML=[...eventsForSeason()].sort((a,b)=>a.start.localeCompare(b.start)).map(e=>`<button class="sidebar-event-card" data-open-event="${e.id}" style="--event-color:${Toki.eventColor(e)}"><strong>${esc(e.title)}</strong><span>${esc(e.aircraft||'機体指定なし')}</span><span>${e.start} 〜 ${e.end}</span></button>`).join('')||'<div class="sidebar-no-events">未設定</div>';
}
const sidebarBeforeEvents=renderSidebar;
renderSidebar=function(){sidebarBeforeEvents();renderEventSidebar();};
const eventListBeforeSidebar=renderEventList;
renderEventList=function(){eventListBeforeSidebar();renderEventSidebar();};
$('sidebar-event-list').onclick=e=>{const button=e.target.closest('[data-open-event]');if(!button)return;$('events-open').onclick();$('event-list').onclick({target:{closest:selector=>selector==='[data-edit-event]'?{dataset:{editEvent:button.dataset.openEvent}}:null}});};
renderEventSidebar();

Toki.refreshEventSidebar=renderEventSidebar;
