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
  const dep=clock(start),arr=arrival('00:00',block);flight.dep=dep;flight.arr=arr;
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
