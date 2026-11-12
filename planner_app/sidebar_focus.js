function focusSidebarItem(selector){const item=$('plan-sidebar').querySelector(selector);if(item){item.focus({preventScroll:true});item.scrollIntoView({block:'nearest'});}}
$('plan-sidebar').addEventListener('click',e=>{
 const plan=e.target.closest('[data-plan-id]'),day=e.target.closest('[data-calendar-date]');
 if(plan)focusSidebarItem(`[data-plan-id="${plan.dataset.planId}"]`);
 else if(day)focusSidebarItem(`[data-calendar-date="${day.dataset.calendarDate}"]`);
});
$('plan-sidebar').addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||e.target.closest('input,select,textarea'))return;
 const day=e.target.closest('[data-calendar-date]');
 if(day){e.preventDefault();const delta={ArrowUp:-7,ArrowDown:7,ArrowLeft:-1,ArrowRight:1}[e.key],next=new Date(Date.parse(day.dataset.calendarDate+'T00:00:00Z')+delta*86400000).toISOString().slice(0,10),button=$('calendar-grid').querySelector(`[data-calendar-date="${next}"]`);if(button&&!button.disabled){button.click();focusSidebarItem(`[data-calendar-date="${next}"]`);}return;}
 const plan=e.target.closest('[data-plan-id]'),event=e.target.closest('[data-open-event]'),season=e.target.closest('#season-S,#season-W');
 let items,selector;
 if(plan){items=[...$('plan-list').querySelectorAll('[data-plan-id]')];selector=plan;}
 else if(event){items=[...$('sidebar-event-list').querySelectorAll('[data-open-event]')];selector=event;}
 else if(season){items=[$('season-S'),$('season-W')].filter(b=>!b.disabled);selector=season;}
 else{items=[...$('plan-sidebar').querySelectorAll('button:not(:disabled)')].filter(b=>!b.hidden);selector=e.target.closest('button');}
 const index=items.indexOf(selector);if(index<0)return;e.preventDefault();const target=items[index+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1)];if(!target)return;
 if(plan){const id=target.dataset.planId;target.click();focusSidebarItem(`[data-plan-id="${id}"]`);}
 else if(season){const id=target.id;target.click();focusSidebarItem('#'+id);}
 else{target.focus({preventScroll:true});target.scrollIntoView({block:'nearest'});}
});
