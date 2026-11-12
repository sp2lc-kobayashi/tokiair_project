// Native desktop drag-and-drop; no external content is accepted.
let timelineDrag=null,dragUndo=null,suppressBarClickUntil=0;
function dropTime(event,track){
 const rect=track.getBoundingClientRect();
 const snap=event.shiftKey?1:5;
 const value=(event.clientX-rect.left)/rect.width*960+360-timelineDrag.offset;
 const block=minutes(timelineDrag.flight.arr)-minutes(timelineDrag.flight.dep);
 return Math.max(360,Math.min(1320-block,Math.round(value/snap)*snap));
}
function clearDropHighlight(){
 $('timeline').querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
}
function finishTimelineDrag(){
 clearDropHighlight();timelineDrag=null;
 $('drag-status').textContent='';
}
$('timeline').ondragstart=event=>{
 const bar=event.target.closest('.flight');if(!bar)return;
 const flight=currentFlights().find(f=>f.id===bar.dataset.focus);
 if(!flight)return;
 const rect=bar.getBoundingClientRect(),track=bar.closest('.track').getBoundingClientRect();
 timelineDrag={date,flight:{...flight},offset:(event.clientX-rect.left)/track.width*960};
 event.dataTransfer.effectAllowed='move';
 event.dataTransfer.setData('text/plain',flight.id);
 bar.classList.add('dragging');
 $('drag-status').textContent=flight.id+' をドラッグ中。機体の行へドロップしてください。';
};
$('timeline').ondragover=event=>{
 if(!timelineDrag||timelineDrag.date!==date)return;
 const track=event.target.closest('.track');if(!track)return;
 event.preventDefault();event.dataTransfer.dropEffect='move';
 clearDropHighlight();track.classList.add('drop-target');
 const dep=clock(dropTime(event,track)),block=minutes(timelineDrag.flight.arr)-minutes(timelineDrag.flight.dep);
 const machine=state.machines.find(m=>m.id===track.dataset.aircraft);
 $('drag-status').textContent=`${timelineDrag.flight.id} → ${machine?.name||'未割り当て'} ／ ${dep}–${arrival(dep,block)}（${formatBlock(block)}）`;
};
$('timeline').ondrop=event=>{
 if(!timelineDrag||timelineDrag.date!==date)return;
 const track=event.target.closest('.track');if(!track)return;
 event.preventDefault();
 const index=currentFlights().findIndex(f=>f.id===timelineDrag.flight.id);
 if(index<0){finishTimelineDrag();return;}
 const old={...currentFlights()[index]},aircraft=track.dataset.aircraft;
 if(aircraft!==''&&!state.machines.some(m=>m.id===aircraft)){finishTimelineDrag();return;}
 try{
  const block=minutes(old.arr)-minutes(old.dep),dep=clock(dropTime(event,track));
  currentFlights()[index]={...old,dep,arr:arrival(dep,block),aircraft};
  validate(state);dragUndo={date,index,flight:old};
  suppressBarClickUntil=Date.now()+500;finishTimelineDrag();commit();
  $('undo-drag').disabled=false;
  toast(`${old.id} を変更しました。運航のチェック結果を確認してください。`);
 }catch(err){currentFlights()[index]=old;finishTimelineDrag();render();toast(err.message);}
};
$('timeline').ondragend=()=>{
 $('timeline').querySelectorAll('.dragging').forEach(el=>el.classList.remove('dragging'));
 finishTimelineDrag();
};
$('undo-drag').onclick=()=>{
 if(!dragUndo)return;
 const {date:undoDate,flight}=dragUndo,index=state.days[undoDate].findIndex(f=>f.id===flight.id);
 if(index<0){toast('便が削除・変更されているため戻せません。');return;}
 state.days[undoDate][index]={...flight};date=undoDate;dragUndo=null;commit();$('undo-drag').disabled=true;toast('直前のドラッグ操作を元に戻しました。');
};

let paletteFlightId='',paletteDate='',palettePlanId='';
function closeColorPalette(){ $('bar-color-palette').hidden=true;paletteFlightId=''; }
function showColorPalette(button){
 const flight=currentFlights().find(f=>f.id===button.dataset.colorPicker);if(!flight)return;
 paletteFlightId=flight.id;paletteDate=date;palettePlanId=selectedPlan()?.id||'';
 const current=barColor(flight).toLowerCase(),choices=[...barPalette];
 if(!choices.some(([c])=>c===current))choices.push([current,'保存済み']);
 $('bar-color-options').innerHTML=choices.map(([color,name])=>`<button type="button" data-palette-color="${color}" title="${name} ${color}" aria-label="${name}" aria-pressed="${current===color}"><i style="background:${color};color:${barText(color)}">${current===color?'✓':''}</i><span>${name}</span></button>`).join('');
 const rect=button.getBoundingClientRect(),palette=$('bar-color-palette');palette.hidden=false;
 palette.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-308))+'px';
 palette.style.top=Math.max(8,Math.min(rect.bottom+6,window.innerHeight-palette.getBoundingClientRect().height-8))+'px';
 $('bar-color-options').querySelector('[aria-pressed="true"]')?.focus();
}
const flightsClickBeforePalette=$('flights').onclick;
$('flights').onclick=e=>{const swatch=e.target.closest('[data-inline-color]');if(swatch){const flight=currentFlights().find(f=>f.id===swatch.dataset.inlineFlight);if(!flight)return;const color=swatch.dataset.inlineColor;if(!/^#[0-9a-fA-F]{6}$/.test(color))return;const old=flight.color;flight.color=color;try{commit();}catch(err){if(old===undefined)delete flight.color;else flight.color=old;render();toast(err.message);}return;}const button=e.target.closest('[data-color-picker]');if(button){showColorPalette(button);return;}flightsClickBeforePalette(e);};
$('bar-color-options').onclick=e=>{
 const button=e.target.closest('[data-palette-color]');if(!button||date!==paletteDate||(selectedPlan()?.id||'')!==palettePlanId)return;
 const flight=currentFlights().find(f=>f.id===paletteFlightId);if(!flight)return;
 const color=button.dataset.paletteColor;if(!/^#[0-9a-f]{6}$/.test(color))return;
 const old=flight.color;flight.color=color;
 try{commit();closeColorPalette();}catch(err){if(old===undefined)delete flight.color;else flight.color=old;render();toast(err.message);}
};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#bar-color-palette')&&!e.target.closest('[data-color-picker]'))closeColorPalette();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeColorPalette();});
document.addEventListener('scroll',closeColorPalette,true);
window.addEventListener('resize',closeColorPalette);

let selectedBarId='',selectedBarDate='',selectedBarPlan='';
let selectedBarIds=new Set();
function currentBarPlan(){return typeof selectedPlan==='function'?selectedPlan()?.id||'':'';}
function ensureBarSelection(){if(selectedBarDate!==date||selectedBarPlan!==currentBarPlan()){selectedBarIds.clear();selectedBarId='';}selectedBarDate=date;selectedBarPlan=currentBarPlan();const existing=new Set(currentFlights().map(f=>f.id));selectedBarIds=new Set([...selectedBarIds].filter(id=>existing.has(id)));}
function markSelectedBar(focus=false){
 ensureBarSelection();
 let selected=null;
 $('timeline').querySelectorAll('[data-focus]').forEach(bar=>{const active=selectedBarIds.has(bar.dataset.focus);bar.classList.toggle('bar-selected',active);bar.setAttribute('aria-pressed',String(active));if(bar.dataset.focus===selectedBarId)selected=bar;});
 if(focus&&selected)selected.focus({preventScroll:true});
}
const renderBeforeTimelineEdit=render;
render=function(){renderBeforeTimelineEdit();markSelectedBar();};
$('timeline').onclick=e=>{
 if(Date.now()<suppressBarClickUntil)return;
 const bar=e.target.closest('[data-focus]');if(!bar)return;
 ensureBarSelection();selectedBarId=bar.dataset.focus;if(e.shiftKey)selectedBarIds=new Set(currentFlights().map(f=>f.id));else if(e.ctrlKey||e.metaKey){if(selectedBarIds.has(selectedBarId))selectedBarIds.delete(selectedBarId);else selectedBarIds.add(selectedBarId);}else selectedBarIds=new Set([selectedBarId]);markSelectedBar(true);
};
function moveSelectedBars(anchor,delta,focus=true){
 ensureBarSelection();
 if(!selectedBarIds.has(anchor))selectedBarIds=new Set([anchor]);
 const old=currentFlights().filter(f=>selectedBarIds.has(f.id)).map(f=>({...f}));
 try{
  const changes=old.map(f=>{const start=minutes(f.dep)+delta,block=minutes(f.arr)-minutes(f.dep);if(start<0||start>1439)throw Error('選択したすべての便が同日内に収まる時刻にしてください。');const dep=clock(start);return {...f,dep,arr:arrival(dep,block)};});
  for(const f of changes)Object.assign(currentFlights().find(row=>row.id===f.id),f);
  selectedBarId=anchor;commit();markSelectedBar(focus);return true;
 }catch(err){for(const f of old){const row=currentFlights().find(row=>row.id===f.id);if(row)Object.assign(row,f);}render();markSelectedBar(focus);toast(err.message);return false;}
}
function changeBarTime(id,delta){moveSelectedBars(id,delta);}
$('timeline').onkeydown=e=>{
 const gap=e.target.closest('[data-gap-next]');
 if(gap){if(e.key==='Enter'){e.preventDefault();gap.blur();}else if(e.key==='Escape'){e.preventDefault();render();}return;}
 if(!['ArrowLeft','ArrowRight'].includes(e.key)||e.ctrlKey||e.metaKey||e.altKey)return;
 const bar=e.target.closest('[data-focus]');if(!bar)return;
 e.preventDefault();changeBarTime(bar.dataset.focus,e.key==='ArrowRight'?5:-5);
};
$('timeline').onchange=e=>{
 const input=e.target.closest('[data-gap-next]');if(!input)return;
 const previous=currentFlights().find(f=>f.id===input.dataset.gapPrev),flight=currentFlights().find(f=>f.id===input.dataset.gapNext);
 if(!previous||!flight||!previous.aircraft||previous.aircraft!==flight.aircraft)return;
 const old={...flight};
 try{
  const value=input.value.trim();if(!/^-?\d{1,4}$/.test(value))throw Error('便間は分単位の整数で入力してください。');
  const start=minutes(previous.arr)+Number(value),block=minutes(flight.arr)-minutes(flight.dep);
  if(start<0||start>1439)throw Error('同日内に収まる便間を入力してください。');
  const dep=clock(start),arr=arrival(dep,block);flight.dep=dep;flight.arr=arr;
  ensureBarSelection();selectedBarId=flight.id;selectedBarIds=new Set([flight.id]);commit();markSelectedBar();
 }catch(err){Object.assign(flight,old);render();toast(err.message);}
};

const dragStartBeforeMulti=$('timeline').ondragstart;
$('timeline').ondragstart=e=>{
 ensureBarSelection();const bar=e.target.closest('.flight');if(!bar)return;
 const id=bar.dataset.focus;
 if(e.shiftKey)selectedBarIds=new Set(currentFlights().map(f=>f.id));
 else if(!selectedBarIds.has(id)){if(!(e.ctrlKey||e.metaKey))selectedBarIds.clear();selectedBarIds.add(id);}
 selectedBarId=id;markSelectedBar();dragStartBeforeMulti(e);
 if(timelineDrag)timelineDrag.groupIds=[...selectedBarIds];
};
const dragOverBeforeMulti=$('timeline').ondragover;
$('timeline').ondragover=e=>{dragOverBeforeMulti(e);if(timelineDrag?.groupIds?.length>1)$('drag-status').textContent=timelineDrag.groupIds.length+'便をまとめて移動';};
const dropBeforeMulti=$('timeline').ondrop;
$('timeline').ondrop=e=>{
 if(!timelineDrag||(timelineDrag.groupIds?.length||0)<2){dropBeforeMulti(e);return;}
 const track=e.target.closest('.track');if(!track||timelineDrag.date!==date)return;
 e.preventDefault();const id=timelineDrag.flight.id,delta=dropTime(e,track)-minutes(timelineDrag.flight.dep);
 selectedBarIds=new Set(timelineDrag.groupIds);suppressBarClickUntil=Date.now()+500;
 finishTimelineDrag();moveSelectedBars(id,delta);
};

let barMenuIds=[],barMenuDate='',barMenuPlan='';
function closeBarMenu(){ $('bar-context-menu').hidden=true;barMenuIds=[]; }
$('timeline').oncontextmenu=e=>{
 const bar=e.target.closest('[data-focus]');if(!bar)return;
 e.preventDefault();if(typeof closePlanMenu==='function')closePlanMenu();ensureBarSelection();
 const id=bar.dataset.focus;if(!selectedBarIds.has(id))selectedBarIds=new Set([id]);
 selectedBarId=id;markSelectedBar();
 barMenuIds=[...selectedBarIds];barMenuDate=date;barMenuPlan=currentBarPlan();
 $('bar-menu-delete').textContent=barMenuIds.length>1?`選択した${barMenuIds.length}便を削除`:'この便を削除';
 const menu=$('bar-context-menu');menu.hidden=false;menu.style.left=Math.max(8,Math.min(e.clientX,window.innerWidth-210))+'px';menu.style.top=Math.max(8,Math.min(e.clientY,window.innerHeight-65))+'px';$('bar-menu-delete').focus();
};
$('bar-menu-delete').onclick=()=>{
 if(date!==barMenuDate||currentBarPlan()!==barMenuPlan){closeBarMenu();return;}
 const ids=new Set(barMenuIds),old=currentFlights();closeBarMenu();
 try{state.flights=old.filter(f=>!ids.has(f.id));selectedBarIds.clear();selectedBarId='';commit();}
 catch(err){state.flights=old;render();toast(err.message);}
};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#bar-context-menu'))closeBarMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeBarMenu();});
document.addEventListener('scroll',closeBarMenu,true);
window.addEventListener('resize',closeBarMenu);

let barRangeSelection=null;
function intersectingBars(box,bars){return bars.filter(bar=>{const r=bar.getBoundingClientRect();return r.right>=box.left&&r.left<=box.right&&r.bottom>=box.top&&r.top<=box.bottom;}).map(bar=>bar.dataset.focus);}
function closeRangeSelection(cancel=false){
 const session=barRangeSelection;if(!session)return;
 barRangeSelection=null;$('bar-selection-box').hidden=true;
 if(cancel&&session.date===date&&session.plan===currentBarPlan()){selectedBarIds=new Set(session.before);markSelectedBar();}
 if($('timeline').hasPointerCapture?.(session.pointer))$('timeline').releasePointerCapture(session.pointer);
 document.body.classList.remove('selecting-bars');
}
$('timeline').onpointerdown=e=>{
 if(e.button!==0||e.target.closest('button,input,select,[data-focus]')||!e.target.closest('.track'))return;
 ensureBarSelection();
 barRangeSelection={x:e.clientX,y:e.clientY,pointer:e.pointerId,date,plan:currentBarPlan(),before:[...selectedBarIds],add:e.ctrlKey||e.metaKey||e.shiftKey,moved:false};
 $('timeline').setPointerCapture?.(e.pointerId);e.preventDefault();
};
$('timeline').onpointermove=e=>{
 const session=barRangeSelection;if(!session||session.pointer!==e.pointerId)return;
 if(session.date!==date||session.plan!==currentBarPlan()){closeRangeSelection(true);return;}
 if(!session.moved&&Math.hypot(e.clientX-session.x,e.clientY-session.y)<4)return;
 session.moved=true;e.preventDefault();document.body.classList.add('selecting-bars');
 const box={left:Math.min(session.x,e.clientX),right:Math.max(session.x,e.clientX),top:Math.min(session.y,e.clientY),bottom:Math.max(session.y,e.clientY)};
 const element=$('bar-selection-box');element.hidden=false;Object.assign(element.style,{left:box.left+'px',top:box.top+'px',width:(box.right-box.left)+'px',height:(box.bottom-box.top)+'px'});
 const hits=intersectingBars(box,[...$('timeline').querySelectorAll('[data-focus]')]);
 selectedBarIds=new Set([...(session.add?session.before:[]),...hits]);selectedBarId=hits.at(-1)||[...selectedBarIds].at(-1)||'';markSelectedBar();
};
$('timeline').onpointerup=e=>{
 const session=barRangeSelection;if(!session||session.pointer!==e.pointerId)return;
 if(!session.moved&&!session.add){selectedBarIds.clear();selectedBarId='';markSelectedBar();}
 closeRangeSelection();suppressBarClickUntil=Date.now()+350;markSelectedBar(true);
};
$('timeline').onpointercancel=()=>closeRangeSelection(true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&barRangeSelection){e.preventDefault();closeRangeSelection(true);}});
window.addEventListener('blur',()=>closeRangeSelection(true));

// Notes are independent of the flight template and applied schedule records.
let timelineMemos={};try{const raw=JSON.parse(localStorage.getItem('toki-timeline-memos-v1')||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))timelineMemos=raw;}catch(e){}
function timelineMemoKey(){return Toki.charterMode?(Toki.activeCharterGroupId?'charter-code:'+Toki.activeCharterGroupId:'charter:'+date):'regular:'+(selectedPlan()?.id||'draft');}
function renderTimelineMemo(){$('timeline-page-label').textContent=Toki.charterMode?'チャーター':'定期便';$('timeline-page-label').classList.toggle('charter-page-label',!!Toki.charterMode);const group=typeof activeCharterGroup==='function'?activeCharterGroup():null;const value=timelineMemos[timelineMemoKey()]??(Toki.charterMode?(timelineMemos['charter:'+date]??timelineMemos['charter:'+group?.day]):undefined);$('timeline-memo').value=typeof value==='string'?value:'';}
$('timeline-memo').oninput=()=>{const key=timelineMemoKey();timelineMemos[key]=$('timeline-memo').value;try{localStorage.setItem('toki-timeline-memos-v1',JSON.stringify(timelineMemos));}catch(e){toast('メモを保存できませんでした。');}};
const renderBeforeTimelineMemo=render;render=function(){renderBeforeTimelineMemo();renderTimelineMemo();};renderTimelineMemo();
