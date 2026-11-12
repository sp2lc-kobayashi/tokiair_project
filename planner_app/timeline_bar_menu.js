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
