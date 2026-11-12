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
