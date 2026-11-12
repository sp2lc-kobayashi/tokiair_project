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
