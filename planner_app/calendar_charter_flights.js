function calendarCharterFlights(day){return Toki.charterFlights?Toki.charterFlights(day):legacyCalendarCharterFlights(day);}
function legacyCalendarCharterFlights(day){
 if(typeof selectedPlan!=='function')return [];
 const current=selectedPlan(),owner=Toki.assignedPlanId?.(day),plan=planLibrary.items.find(p=>(owner===undefined||p.id===owner)&&Toki.isPlanApplied(p.id===current?.id?state:p.data,day));
 const data=plan?.id===current?.id?state:plan?.data;return (data?.days?.[day]||[]).filter(f=>f.charter);
}
function seasonFlightTotals(range){
 let count=0,block=0,issues=0,regularCount=0,charterCount=0;
 if(typeof selectedPlan!=='function')return {count,block,issues,regularCount,charterCount};
 const current=selectedPlan();
 for(const day of Toki.dateKeys()){
  if(day<range.from||day>range.to)continue;
  const owner=Toki.assignedPlanId?.(day);
  const plan=planLibrary.items.find(p=>(owner===undefined||p.id===owner)&&Toki.isPlanApplied(p.id===current?.id?state:p.data,day));
  const data=plan?(plan.id===current?.id?state:plan.data):state;
  const regular=plan?data.days[day]||[]:[],charters=Toki.charterFlights?.(day)||[];regularCount+=regular.length;charterCount+=charters.length;
  for(const flight of [...regular,...charters]){count++;block+=minutes(flight.arr)-minutes(flight.dep);}
  issues+=calendarIssuesForDate(day).length;
 }
 return {count,block,issues,regularCount,charterCount};
}
function calendarIssuesForDate(day){
 const current=typeof selectedPlan==='function'?selectedPlan():null;
 const owner=Toki.assignedPlanId?.(day);
 const plan=typeof selectedPlan==='function'?planLibrary.items.find(p=>(owner===undefined||p.id===owner)&&Toki.isPlanApplied(p.id===current?.id?state:p.data,day)):null;
 if(!plan&&!(Toki.charterFlights?.(day)||[]).length)return [];
 const data=plan?(plan.id===current?.id?state:plan.data):state;
 const flights=[...(plan?data.days[day]||[]:[]).map(f=>Toki.aircraftForDate?Toki.aircraftForDate(f,day,plan?.id):f),...(Toki.charterFlights?.(day)||[])];
 const applied=(data.periods||[]).find(p=>p.dates.includes(day));
 const snapshot={flights,machines:applied?.machines||data.machines,turn:applied?.turn??data.turn,constraints:applied?.constraints||data.constraints||[],acceptedIssueKeys:data.acceptedIssueKeys||applied?.acceptedIssueKeys||[]};
 return Toki.pendingIssues(Toki.check(flights,snapshot.machines,snapshot.turn,Toki.fleetEvents||[],day,snapshot.constraints),snapshot,Toki.fleetEvents||[],day);
}
function calendarSeason(){
 const selectedKey=Toki.planListSeasonKey;if(/^[SW]20\d{2}$/.test(selectedKey||'')&&typeof seasonRange==='function'){const chosen=seasonRange(Number(selectedKey.slice(1)),selectedKey[0]);if(chosen.available)return chosen;}
 const stored=state.season;
 if(stored&&validDate(stored.from)&&validDate(stored.to)&&stored.from<=stored.to)return stored;
 const y=Number(date.slice(0,4));
 const sunday=(year,month)=>{const d=new Date(Date.UTC(year,month,0));d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d.toISOString().slice(0,10);};
 const summer=sunday(y,3),winter=sunday(y,10),kind=date>=summer&&date<winter?'S':'W',year=date<summer?y-1:y;
 const start=sunday(year,kind==='S'?3:10),next=sunday(kind==='S'?year:year+1,kind==='S'?10:3),end=new Date(Date.parse(next+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 return {year,kind,from:start<START?START:start,to:end>END?END:end};
}
function calendarAppliedNames(range){
 const names=new Map(),current=typeof selectedPlan==='function'?selectedPlan():null;
 const add=(name,data,id)=>{if(!/^[A-Z][0-9]{0,3}$/.test(name))return;for(const p of data.periods||[])for(const d of p.dates||[]){if(d<range.from||d>range.to||!Toki.isPlanApplied(data,d)||(Toki.assignedPlanId&&Toki.assignedPlanId(d)!==undefined&&Toki.assignedPlanId(d)!==id))continue;if(!names.has(d))names.set(d,new Set());names.get(d).add(name);}};
 add(current?.name||'',state,current?.id);
 if(typeof planLibrary!=='undefined')for(const plan of planLibrary.items){if(plan.id===current?.id)continue;const season=plan.data?.season;if(season?.year===range.year&&season?.kind===range.kind)add(plan.name,plan.data,plan.id);}
 return names;
}
function renderCalendar(){
 const range=calendarSeason(),periods=new Map(),appliedNames=calendarAppliedNames(range);
 const totals=seasonFlightTotals(range);$('season-totals').innerHTML=`<span>期間総便数 <b>${totals.count.toLocaleString()}便</b> <small>（定期 ${totals.regularCount.toLocaleString()}／チャーター ${totals.charterCount.toLocaleString()}）</small></span><span>総ブロックタイム <b>${formatBlock(totals.block)}</b></span><span class="season-issue-total ${totals.issues===0?'issues-clear':'issues-present'}">総チェック件数 <b>${totals.issues.toLocaleString()}件</b></span>`;
 for(const p of state.periods||[])for(const d of p.dates)if(Toki.isPlanApplied(state,d))periods.set(d,p.name);
 const months=[];let cursor=range.from.slice(0,7)+'-01';
 while(cursor.slice(0,7)<=range.to.slice(0,7)){
  months.push(cursor.slice(0,7));const d=new Date(cursor+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);cursor=d.toISOString().slice(0,10);
 }
 let html='';
 for(const prefix of months){
  const year=Number(prefix.slice(0,4)),month=Number(prefix.slice(5,7)),first=new Date(Date.UTC(year,month-1,1)).getUTCDay(),count=new Date(Date.UTC(year,month,0)).getUTCDate();
  let cells=['日','月','火','水','木','金','土'].map((w,i)=>`<div class="cal-head ${i===0?'sun':i===6?'sat':''}">${w}</div>`).join('');
  for(let i=0;i<first;i++)cells+='<div class="cal-empty"></div>';
  for(let day=1;day<=count;day++){
   const d=prefix+'-'+String(day).padStart(2,'0'),h=Toki.holiday(d),dow=new Date(d+'T12:00:00+09:00').getUTCDay(),period=periods.get(d),flights=state.days[d]||[],enabled=validDate(d)&&d>=range.from&&d<=range.to;
   const charters=enabled?calendarCharterFlights(d):[];
   const dayIssues=enabled?calendarIssuesForDate(d):[];
   const dayEvents=(Toki.fleetEvents||[]).filter(e=>e.start<=d&&d<=e.end);
   const eventStart=dayEvents.length&&(dow===0||day===1||d===range.from||dayEvents[0].start===d),eventEnd=dayEvents.length&&(dow===6||day===count||d===range.to||dayEvents[0].end===d);
   const letters=[...(appliedNames.get(d)||[])].sort().join('・');
   const holiday=h?h.name+(h.provisional?'（暫定）':''):'',label=d+(holiday?' '+holiday:'')+(enabled?'':' ／ 期間外')+(period?' ／ '+period:'')+(letters?' ／ ダイヤ '+letters:'')+(dayIssues.length?' ／ チェック '+dayIssues.length+'件':'')+(charters.length?' ／ チャーター '+charters.map(f=>f.from+'−'+f.to+' '+f.dep+'〜'+f.arr).join('、'):'')+dayEvents.map(e=>' ／ '+e.aircraft+' '+e.title).join('');
   cells+=`<button class="cal-day ${charters.length?'charter-calendar-day':''} ${h||dow===0?'sun':dow===6?'sat':''} ${d===date?'selected':''} ${flights.length&&enabled?'has-flights':''} ${dayEvents.length&&enabled?'event-calendar-day':''} ${eventStart?'event-range-start':''} ${eventEnd?'event-range-end':''}" style="--event-color:${dayEvents.length?Toki.eventColor(dayEvents[0]):'transparent'}" data-calendar-date="${d}" ${enabled?'':'disabled'} aria-label="${esc(label)}" title="${esc(label)}"><b>${day}</b>${charters.length?'<i class="calendar-charter-mark" aria-label="チャーターあり">✈</i>':''}${dayIssues.length?'<i class="calendar-issue-dot" aria-label="チェック事項あり"></i>':''}${dayEvents.length>1&&enabled?`<span class="calendar-event-overlap" aria-label="イベント${dayEvents.length}件">${dayEvents.map(e=>`<i style="background:${Toki.eventColor(e)}"></i>`).join('')}<em>${dayEvents.length}</em></span>`:''}<span class="cal-holiday">${esc(holiday)}</span>${letters&&enabled?`<span class="cal-applied-name" data-applied-name="${letters}">${letters.split('・').map(letter=>`<span class="cal-letter" data-calendar-plan-name="${letter}" style="background:${Toki.planColor(letter)}">${letter}</span>`).join('')}</span>`:''}</button>`;
  }
  for(let i=(first+count)%7;i&&i<7;i++)cells+='<div class="cal-empty"></div>';
  html+=`<section class="calendar-month-card" data-month="${prefix}"><h3>${year}<span>年</span> ${month}<span>月</span></h3><div class="month-grid">${cells}</div></section>`;
 }
 $('calendar-grid').innerHTML=html;
 $('calendar-range').textContent=`${range.kind}${String(range.year).slice(-2)} ／ ${range.from.replaceAll('-','/')} 〜 ${range.to.replaceAll('-','/')}`;
 const h=Toki.holiday(date);$('selected-holiday').textContent=h?h.name+(h.provisional?'（暫定）':''):'';
 const weekdayNumber=new Date(date+'T00:00:00Z').getUTCDay();$('weekday').classList.toggle('weekday-red',weekdayNumber===0||!!h);$('weekday').classList.toggle('weekday-blue',weekdayNumber===6&&!h);
}

const originalRenderWithCalendar=render;
render=function(){originalRenderWithCalendar();renderCalendar();};
$('calendar-grid').onclick=e=>{const b=e.target.closest('[data-calendar-date]');if(b&&!b.disabled&&validDate(b.dataset.calendarDate))$('date').onchange({target:{value:b.dataset.calendarDate}});};
renderCalendar();

Toki.refreshSeasonCalendar=renderCalendar;
