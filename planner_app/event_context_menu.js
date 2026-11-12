let contextEventId='';
function closeEventMenu(){$('event-context-menu').hidden=true;contextEventId='';}
function showEventMenu(id,x,y){if(!aircraftEvents.some(e=>e.id===id))return;closePlanMenu();contextEventId=id;const menu=$('event-context-menu');menu.hidden=false;menu.style.left=Math.max(8,Math.min(x,window.innerWidth-210))+'px';menu.style.top=Math.max(8,Math.min(y,window.innerHeight-110))+'px';$('event-menu-copy').focus();}
$('sidebar-event-list').oncontextmenu=e=>{const b=e.target.closest('[data-open-event]');if(!b)return;e.preventDefault();showEventMenu(b.dataset.openEvent,e.clientX,e.clientY);};
$('sidebar-event-list').onkeydown=e=>{if(e.key!=='ContextMenu'&&!(e.shiftKey&&e.key==='F10'))return;const b=e.target.closest('[data-open-event]');if(!b)return;e.preventDefault();const r=b.getBoundingClientRect();showEventMenu(b.dataset.openEvent,r.right,r.top);};
$('event-menu-copy').onclick=()=>{
 const source=aircraftEvents.find(e=>e.id===contextEventId);closeEventMenu();if(!source)return;
 const base=source.title.slice(0,64),existing=new Set(aircraftEvents.filter(e=>e.seasonKey===source.seasonKey).map(e=>e.title));let title=base+' のコピー',n=2;while(existing.has(title))title=base+' のコピー '+n++;
 const copy={...structuredClone(source),id:'E'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),title};
 if(saveFleetEvents([...aircraftEvents,copy]))toast('イベントをコピーしました。');
};
$('event-menu-delete').onclick=()=>{const event=aircraftEvents.find(e=>e.id===contextEventId);closeEventMenu();if(!event)return;if(confirm('「'+event.title+'」を削除しますか？')){if(saveFleetEvents(aircraftEvents.filter(e=>e.id!==event.id)))toast('イベントを削除しました。');}};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#event-context-menu'))closeEventMenu();});
document.addEventListener('keydown',e=>{if($('event-context-menu').hidden)return;if(e.key==='Escape'){e.preventDefault();const id=contextEventId;closeEventMenu();$('sidebar-event-list').querySelector(`[data-open-event="${id}"]`)?.focus();}else if(e.key==='ArrowDown'){e.preventDefault();$('event-menu-delete').focus();}else if(e.key==='ArrowUp'){e.preventDefault();$('event-menu-copy').focus();}});
window.addEventListener('resize',closeEventMenu);document.addEventListener('scroll',closeEventMenu,true);
