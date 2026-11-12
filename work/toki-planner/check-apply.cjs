const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=require('./js/main.js'),nodes={},storage=new Map();
const make=id=>nodes[id]||(nodes[id]={value:'',textContent:'',innerHTML:'',style:{},dataset:{},disabled:false,focus(){},select(){},setAttribute(){},classList:{toggle(){},add(){},remove(){}},querySelectorAll(){return [];}});
const weekdays=[0,1,2,3,4,5,6].map(value=>({value:String(value),checked:true}));
make('period-weekdays').querySelectorAll=selector=>selector==='input:checked'?weekdays.filter(i=>i.checked):weekdays;
const context={Toki:core,document:{getElementById:make,addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},structuredClone,setTimeout,clearTimeout,Blob,URL,confirm:()=>true};
vm.createContext(context);
for(const file of ['app.js','drag.js','period.js','calendar.js','sidebar.js','seasons.js','history.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),context);
make('season-year').value='2027';make('season-S').onclick();vm.runInContext("createSeasonPlan('A')",context);
make('period-name').value='春の区間';make('period-start').value='2027-03-28';make('period-end').value='2027-05-30';make('period-end').onchange();
const state=()=>JSON.parse(storage.get('toki-dec2026-v1'));
make('add').onclick();
assert.equal(state().days['2027-03-28'].length,1);assert.equal(state().days['2027-03-29'].length,0);
assert.equal(state().days['2027-05-30'].length,0);assert.equal(state().periods.length,0);
make('period-save').onclick();
assert.equal(state().periods.length,1);assert.equal(state().days['2027-03-29'].length,1);assert.equal(state().days['2027-05-30'].length,1);assert.equal(state().days['2027-05-31'].length,0);
const edit=(key,value)=>make('flights').onchange({target:{dataset:{key},value,closest:()=>({dataset:{index:'0'}})}});
edit('block','1+30');assert.equal(state().days['2027-03-28'][0].arr,'13:30');assert.equal(state().days['2027-03-29'][0].arr,'13:20');
make('period-save').onclick();assert.equal(state().days['2027-03-29'][0].arr,'13:30');
make('edit-undo').onclick();assert.equal(state().days['2027-03-29'][0].arr,'13:20');assert.equal(state().days['2027-03-28'][0].arr,'13:30');
make('edit-redo').onclick();assert.equal(state().days['2027-03-29'][0].arr,'13:30');
// Invalid dates never apply, and changing weekdays alone never changes flights.
make('period-end').value='2027-11-01';make('period-save').onclick();assert.equal(state().periods[0].end,'2027-05-30');
make('period-end').value='2027-05-30';weekdays.find(i=>i.value==='1').checked=false;make('period-weekdays').onchange();assert.equal(state().periods[0].weekdays.length,7);
edit('color','#c81827');assert.equal(state().days['2027-03-29'][0].color,undefined);make('period-save').onclick();assert.equal(state().days['2027-03-30'][0].color,'#c81827');assert.equal(state().days['2027-03-29'][0].color,undefined);
core.validate(state());
console.log('PASS: explicit Apply, no automatic propagation, exact interval and weekdays, invalid range, bulk undo/redo and saved-state validation.');

assert.equal(vm.runInContext("createSeasonPlan('A')",context),false);
assert.equal(vm.runInContext("createSeasonPlan('AA')",context),false);
assert.equal(vm.runInContext("createSeasonPlan('a')",context),false);
make('create-plan-dialog').showModal=()=>{};make('create-plan').onclick();assert.equal(make('new-plan-name').value,'B');assert(make('new-plan-name').innerHTML.includes('value="A" disabled'));
assert.equal(vm.runInContext("createSeasonPlan('B')",context),true);
make('season-year').value='2028';make('season-year').onchange();make('season-S').onclick();assert.equal(vm.runInContext("createSeasonPlan('A')",context),true);
console.log('PASS: A-Z-only names, duplicate prevention, disabled used letters and separate seasonal availability.');

make('season-year').value='2027';make('season-S').onclick();assert.equal(vm.runInContext("createSeasonPlan('C')",context),true);
for(const w of weekdays)w.checked=true;
make('period-name').value='Aパターンの適用期間';make('period-start').value='2027-03-28';make('period-end').value='2027-05-31';make('add').onclick();
make('period-add-range').onclick();make('period-extra-ranges').onchange({target:{dataset:{rangeIndex:'0',rangeKey:'start'},value:'2027-07-01'}});make('period-extra-ranges').onchange({target:{dataset:{rangeIndex:'0',rangeKey:'end'},value:'2027-08-31'}});
vm.runInContext("state.days['2027-06-15']=[{id:'BV999',from:'KIJ',to:'NGO',dep:'10:00',arr:'11:20',aircraft:'M1'}]",context);
make('period-save').onclick();let multi=state();
assert.equal(multi.days['2027-03-28'].length,1);assert.equal(multi.days['2027-05-31'].length,1);assert.equal(multi.days['2027-07-01'].length,1);assert.equal(multi.days['2027-08-31'].length,1);
assert.equal(multi.days['2027-06-01'].length,0);assert.equal(multi.days['2027-09-01'].length,0);assert.equal(multi.days['2027-06-15'][0].id,'BV999');assert.equal(multi.periods[0].ranges.length,2);
vm.runInContext('useSeasonRange(state.season)',context);assert.equal(make('period-end').value,'2027-05-31');assert(make('period-extra-ranges').innerHTML.includes('2027-07-01'));
edit('block','1+35');make('period-save').onclick();multi=state();assert.equal(multi.days['2027-07-01'][0].arr,'13:35');assert.equal(multi.days['2027-06-15'][0].id,'BV999');
core.validate(multi);console.log('PASS: noncontiguous date ranges, saved ranges, reapplying one pattern to multiple periods and preserving the gaps.');

assert.equal(make('period-remove-first').disabled,false);make('period-remove-first').onclick();assert.equal(make('period-start').value,'2027-07-01');assert.equal(make('period-end').value,'2027-08-31');assert.equal(make('period-remove-first').disabled,true);make('period-remove-first').onclick();assert.equal(make('period-start').value,'2027-07-01');make('period-save').onclick();assert.equal(state().periods[0].ranges.length,1);assert.equal(state().periods[0].ranges[0].start,'2027-07-01');console.log('PASS: deleting the first range promotes the next and retains at least one range.');

vm.runInContext('renderCalendar()',context);assert(make('calendar-grid').innerHTML.includes('data-applied-name="C"'));
const calendarCell=d=>make('calendar-grid').innerHTML.match(new RegExp('<button[^>]*data-calendar-date="'+d+'"[^>]*>[\\s\\S]*?</button>'))?.[0]||'';
assert(calendarCell('2027-07-01').includes('data-applied-name="C"'));assert(!calendarCell('2027-06-01').includes('data-applied-name="C"'));
console.log('PASS: applied plan letters appear on applicable calendar dates only.');

vm.runInContext(fs.readFileSync(__dirname+'/date-navigation.js','utf8'),context);
// Apply A to all weekdays, including the reported Monday April 5.
vm.runInContext("openPlan(planLibrary.items.find(p=>p.name==='A'&&p.data.season.key==='S2027').id)",context);for(const w of weekdays)w.checked=true;make('period-save').onclick();
// C has July assigned; B is a separate blank plan in the same season.
const planB=vm.runInContext("planLibrary.items.find(p=>p.name==='B'&&p.data.season.key==='S2027').id",context);
vm.runInContext('openPlan('+JSON.stringify(planB)+')',context);
make('date').onchange({target:{value:'2027-07-05'}});
assert.equal(vm.runInContext('selectedPlan().name',context),'C');assert.equal(make('date').value,'2027-07-05');assert(make('flights').innerHTML.includes('BV1'));
// A was applied to March-May earlier. Select April 5 from another plan.
make('date').onchange({target:{value:'2027-04-05'}});assert.equal(vm.runInContext('selectedPlan().name',context),'A');assert(make('flights').innerHTML.includes('BV1'));
// A letter badge explicitly selects its plan when periods overlap.
vm.runInContext('openPlan('+JSON.stringify(planB)+')',context);make('calendar-grid').onclick({target:{closest:selector=>selector==='[data-calendar-date]'?{disabled:false,dataset:{calendarDate:'2027-04-05'}}:selector==='[data-calendar-plan-name]'?{dataset:{calendarPlanName:'A'}}:null}});
assert.equal(vm.runInContext('selectedPlan().name',context),'A');assert.equal(make('date').value,'2027-04-05');
make('date').onchange({target:{value:'2027-03-27'}});make('next').onclick();assert.equal(make('date').value,'2027-03-28');assert.equal(vm.runInContext('selectedPlan().name',context),'A');
console.log('PASS: April 5 and other applied dates open the correct named plan via calendar, date field and previous/next navigation.');

vm.runInContext(fs.readFileSync(__dirname+'/events.js','utf8'),context);
make('date').onchange({target:{value:'2027-04-05'}});edit('aircraft','M1');
make('events-dialog').showModal=()=>{};make('events-dialog').close=()=>{};make('events-open').onclick();make('event-aircraft').value='JA01QQ';make('event-type').value='maintenance';make('event-title').value='重整備';make('event-start').value='2027-04-04';make('event-end').value='2027-04-06';make('event-note').value='格納庫作業';make('event-save').onclick();
const registeredEvents=JSON.parse(storage.get('toki-fleet-events-v1'));assert.equal(registeredEvents.length,1);core.validateEvents(registeredEvents);assert(make('issues').innerHTML.includes('重整備'));assert(make('timeline').innerHTML.includes('aircraft-event-tag'));assert(make('calendar-grid').innerHTML.includes('calendar-event-dot'));
const example=[{id:'BV999',from:'KIJ',to:'NGO',dep:'08:00',arr:'09:20',aircraft:'M1'}],machines=[{id:'M1',name:'JA01QQ',start:'KIJ'},{id:'M2',name:'JA02QQ',start:'KIJ'}];
for(const date of ['2027-04-04','2027-04-05','2027-04-06'])assert(core.check(example,machines,30,registeredEvents,date).some(i=>i.text.includes('重整備')));
assert(!core.check(example,machines,30,registeredEvents,'2027-04-07').some(i=>i.text.includes('重整備')));
assert.equal(core.assign(example,machines,30,registeredEvents,'2027-04-05')[0].aircraft,'M2');
const invalidEvent=structuredClone(registeredEvents);invalidEvent[0].end='2027-04-01';assert.throws(()=>core.validateEvents(invalidEvent));
make('event-list').onclick({target:{closest:selector=>selector==='[data-edit-event]'?{dataset:{editEvent:registeredEvents[0].id}}:null}});make('event-title').value='Cチェック';make('event-save').onclick();assert.equal(JSON.parse(storage.get('toki-fleet-events-v1'))[0].title,'Cチェック');
make('event-list').onclick({target:{closest:selector=>selector==='[data-delete-event]'?{dataset:{deleteEvent:registeredEvents[0].id}}:null}});assert.equal(JSON.parse(storage.get('toki-fleet-events-v1')).length,0);
console.log('PASS: fleet event creation/edit/delete, persistent storage, inclusive dates, calendar marks, timeline labels, conflict detection and auto-assignment exclusion.');

make('events-open').onclick();make('event-aircraft').value='JA02QQ';make('event-title').value='重整備テスト';make('event-type').value='maintenance';make('event-start').value='2027-04-29';make('event-end').value='2027-05-03';make('event-note').value='';make('event-save').onclick();
assert(make('sidebar-event-list').innerHTML.includes('重整備テスト'));assert(make('sidebar-event-list').innerHTML.includes('JA02QQ'));assert(make('calendar-grid').innerHTML.includes('event-calendar-day'));
assert(calendarCell('2027-04-29').includes('event-range-start'));assert(calendarCell('2027-05-01').includes('event-range-start'));assert(calendarCell('2027-05-03').includes('event-range-end'));
const latestEvent=JSON.parse(storage.get('toki-fleet-events-v1'))[0];make('sidebar-event-list').onclick({target:{closest:()=>({dataset:{openEvent:latestEvent.id}})}});assert.equal(make('event-title').value,'重整備テスト');
console.log('PASS: framed event periods across month boundaries and sidebar event list with direct editing.');

vm.runInContext("Toki.fleetEvents=[{id:'Ejunetest',title:'重整備',type:'maintenance',aircraft:'JA01QQ',start:'2027-06-01',end:'2027-06-30',blocks:true,note:''}];renderCalendar()",context);
const framedDays=[...make('calendar-grid').innerHTML.matchAll(/<button class="([^"]*)"[^>]*data-calendar-date="([^"]+)"/g)].filter(m=>m[1].split(' ').includes('event-calendar-day')).map(m=>m[2]);assert.equal(framedDays.length,30);assert(framedDays.every(d=>d>='2027-06-01'&&d<='2027-06-30'));assert(!framedDays.includes('2027-03-28'));
context.Event=Event;vm.runInContext(fs.readFileSync(__dirname+'/date-picker.js','utf8'),context);make('date-picker-dialog').showModal=()=>{};make('date-picker-dialog').close=()=>{};
const pickerInput={value:'2027-11-15',min:'2026-04-01',max:'2036-03-31',dispatchEvent(e){assert.equal(e.type,'change');}};context.pickerInputForTest=pickerInput;
vm.runInContext('openDatePicker(pickerInputForTest)',context);assert(make('picker-month').innerHTML.includes('value="11" selected'));assert(make('picker-days').innerHTML.includes('2027-11-30'));
make('picker-year').onchange({target:{value:'2028'}});make('picker-month').onchange({target:{value:'2'}});assert(make('picker-days').innerHTML.includes('2028-02-29'));
make('picker-days').onclick({target:{closest:()=>({dataset:{pickDate:'2028-02-29'},disabled:false})}});assert.equal(pickerInput.value,'2028-02-29');
console.log('PASS: June event exact dates, November month selector, year/month changes and leap-day date selection.');

vm.runInContext(fs.readFileSync(__dirname+'/timeline-edit.js','utf8'),context);
vm.runInContext("state.days[date]=[{id:'BV101',from:'KIJ',to:'NGO',dep:'08:00',arr:'09:20',aircraft:'M1'},{id:'BV102',from:'NGO',to:'KIJ',dep:'09:55',arr:'11:15',aircraft:'M1'}];save();render()",context);
const barTarget={closest:selector=>selector==='[data-focus]'?{dataset:{focus:'BV102'}}:null};
make('timeline').onkeydown({target:barTarget,key:'ArrowRight',preventDefault(){}});assert.equal(state().days[make('date').value][1].dep,'10:00');assert.equal(state().days[make('date').value][1].arr,'11:20');
make('timeline').onkeydown({target:barTarget,key:'ArrowLeft',preventDefault(){}});assert.equal(state().days[make('date').value][1].dep,'09:55');
const changeGap=value=>make('timeline').onchange({target:{closest:()=>({dataset:{gapPrev:'BV101',gapNext:'BV102'},value})}});
changeGap('20');assert.equal(state().days[make('date').value][1].dep,'09:40');assert.equal(state().days[make('date').value][1].arr,'11:00');
make('edit-undo').onclick();assert.equal(state().days[make('date').value][1].dep,'09:55');make('edit-redo').onclick();assert.equal(state().days[make('date').value][1].dep,'09:40');
changeGap('abc');assert.equal(state().days[make('date').value][1].dep,'09:40');changeGap('1400');assert.equal(state().days[make('date').value][1].dep,'09:40');
assert(make('timeline').innerHTML.includes('data-gap-next="BV102"'));console.log('PASS: 1-minute arrow-key moves, direct gap entry, preserved block time, bounds checking and undo/redo.');

const s27a=vm.runInContext("planLibrary.items.find(p=>p.name==='A'&&p.data.season.key==='S2027').id",context),s28a=vm.runInContext("planLibrary.items.find(p=>p.name==='A'&&p.data.season.key==='S2028').id",context);
make('season-year').value='2027';make('season-year').onchange();assert(!make('plan-list').innerHTML.includes('data-plan-id='));make('season-S').onclick();assert(make('plan-list').innerHTML.includes(s27a));assert(!make('plan-list').innerHTML.includes(s28a));
make('season-W').onclick();assert(!make('plan-list').innerHTML.includes(s27a));assert.equal(vm.runInContext("createSeasonPlan('A')",context),true);
const w27a=vm.runInContext('selectedPlan().id',context);assert(make('plan-list').innerHTML.includes(w27a));assert(!make('plan-list').innerHTML.includes(s27a));
make('season-year').value='2028';make('season-year').onchange();make('season-S').onclick();assert(make('plan-list').innerHTML.includes(s28a));assert(!make('plan-list').innerHTML.includes(w27a));assert(!make('plan-list').innerHTML.includes(s27a));
make('season-year').value='2027';make('season-year').onchange();make('season-S').onclick();assert(make('plan-list').innerHTML.includes(s27a));
console.log('PASS: plan lists isolated by selected year/season; identical A names can coexist across seasons and return when switching back.');

make('season-year').value='2027';make('season-year').onchange();make('season-W').onclick();assert(!make('sidebar-event-list').innerHTML.includes('重整備テスト'));assert(make('calendar-range').textContent.includes('W27'));
make('events-open').onclick();assert.equal(make('event-start').min,'2027-10-31');assert.equal(make('event-end').max,'2028-03-25');
const beforeInvalidSeason=JSON.parse(storage.get('toki-fleet-events-v1')).length;
make('event-aircraft').value='JA01QQ';make('event-title').value='冬に入れない夏整備';make('event-start').value='2027-06-01';make('event-end').value='2027-06-30';make('event-save').onclick();assert.equal(JSON.parse(storage.get('toki-fleet-events-v1')).length,beforeInvalidSeason);
make('event-title').value='冬季整備';make('event-start').value='2027-11-01';make('event-end').value='2027-11-30';make('event-save').onclick();const winterEvent=JSON.parse(storage.get('toki-fleet-events-v1')).find(e=>e.title==='冬季整備');assert.equal(winterEvent.seasonKey,'W2027');assert(make('sidebar-event-list').innerHTML.includes('冬季整備'));
make('season-S').onclick();assert(!make('sidebar-event-list').innerHTML.includes('冬季整備'));assert(make('sidebar-event-list').innerHTML.includes('重整備テスト'));
const wrongSeason=structuredClone(winterEvent);wrongSeason.start='2027-06-01';assert.throws(()=>core.validateEvents([wrongSeason]));
console.log('PASS: event season ownership, summer/winter list isolation, picker limits and rejection of out-of-season maintenance.');

vm.runInContext("state.days[date]=[{id:'BV101',from:'KIJ',to:'NGO',dep:'08:00',arr:'09:20',aircraft:'M1'},{id:'BV102',from:'NGO',to:'KIJ',dep:'10:00',arr:'11:20',aircraft:'M1'},{id:'BV103',from:'KIJ',to:'UKB',dep:'12:00',arr:'13:20',aircraft:'M2'}];save();render();suppressBarClickUntil=0",context);
const clickBar=(id,mod={})=>make('timeline').onclick({target:{closest:()=>({dataset:{focus:id}})},...mod});
clickBar('BV101',{shiftKey:true});assert.equal(vm.runInContext('selectedBarIds.size',context),3);
make('timeline').onkeydown({target:{closest:selector=>selector==='[data-focus]'?{dataset:{focus:'BV101'}}:null},key:'ArrowRight',preventDefault(){}});
assert.equal(state().days[make('date').value][0].dep,'08:05');assert.equal(state().days[make('date').value][1].dep,'10:05');assert.equal(state().days[make('date').value][2].dep,'12:05');
clickBar('BV101');clickBar('BV103',{ctrlKey:true});assert.equal(vm.runInContext('selectedBarIds.size',context),2);
make('timeline').onkeydown({target:{closest:selector=>selector==='[data-focus]'?{dataset:{focus:'BV101'}}:null},key:'ArrowRight',preventDefault(){}});assert.equal(state().days[make('date').value][0].dep,'08:10');assert.equal(state().days[make('date').value][1].dep,'10:05');assert.equal(state().days[make('date').value][2].dep,'12:10');
const multiTrack={dataset:{aircraft:'M1'},getBoundingClientRect:()=>({left:0,width:960}),classList:{add(){},remove(){}}};
make('timeline').querySelectorAll=()=>[];
const anchorMinute=490,anchorX=anchorMinute-360+20,multiBar={dataset:{focus:'BV101'},getBoundingClientRect:()=>({left:anchorMinute-360}),closest:()=>multiTrack,classList:{add(){}}};
make('timeline').ondragstart({target:{closest:()=>multiBar},clientX:anchorX,dataTransfer:{setData(){}}});make('timeline').ondrop({target:{closest:()=>multiTrack},clientX:anchorX+30,preventDefault(){}});
assert.equal(state().days[make('date').value][0].dep,'08:40');assert.equal(state().days[make('date').value][1].dep,'10:05');assert.equal(state().days[make('date').value][2].dep,'12:40');assert.equal(state().days[make('date').value][2].aircraft,'M2');
make('edit-undo').onclick();assert.equal(state().days[make('date').value][0].dep,'08:10');assert.equal(state().days[make('date').value][2].dep,'12:10');
const beforeOutOfBounds=JSON.stringify(state().days[make('date').value]);vm.runInContext("moveSelectedBars('BV101',-1000)",context);assert.equal(JSON.stringify(state().days[make('date').value]),beforeOutOfBounds);
vm.runInContext('suppressBarClickUntil=0',context);clickBar('BV101',{ctrlKey:true});assert.equal(vm.runInContext('selectedBarIds.size',context),1);
console.log('PASS: Shift all-selection, Ctrl add/remove, grouped 5-minute keys and dragging, preserved spacing/aircraft, atomic bounds and grouped undo.');

vm.runInContext(fs.readFileSync(__dirname+'/bar-menu.js','utf8'),context);make('bar-menu-delete').focus=()=>{};
const countBeforeBarDelete=state().days[make('date').value].length;
make('timeline').oncontextmenu({target:{closest:()=>({dataset:{focus:'BV102'}})},preventDefault(){},clientX:400,clientY:300});make('bar-menu-delete').onclick();assert.equal(state().days[make('date').value].length,countBeforeBarDelete-1);assert(!state().days[make('date').value].some(f=>f.id==='BV102'));
make('edit-undo').onclick();assert.equal(state().days[make('date').value].length,countBeforeBarDelete);
vm.runInContext('suppressBarClickUntil=0',context);clickBar('BV101',{shiftKey:true});make('timeline').oncontextmenu({target:{closest:()=>({dataset:{focus:'BV101'}})},preventDefault(){},clientX:400,clientY:300});make('bar-menu-delete').onclick();assert.equal(state().days[make('date').value].length,0);make('edit-undo').onclick();assert.equal(state().days[make('date').value].length,countBeforeBarDelete);
console.log('PASS: bar right-click deletion, selected-group deletion and undo restoration.');

context.document.body={classList:{add(){},remove(){}}};vm.runInContext(fs.readFileSync(__dirname+'/range-select.js','utf8'),context);
const rangeBars=['BV101','BV102','BV103'].map((id,i)=>({dataset:{focus:id},classList:{toggle(){}},setAttribute(){},focus(){},getBoundingClientRect:()=>({left:10+i*150,right:110+i*150,top:10,bottom:65})}));make('timeline').querySelectorAll=()=>rangeBars;
make('timeline').onpointerdown({button:0,target:{closest:selector=>selector==='.track'?{}:null},pointerId:1,clientX:5,clientY:5,preventDefault(){}});make('timeline').onpointermove({pointerId:1,clientX:280,clientY:70,preventDefault(){}});make('timeline').onpointerup({pointerId:1});assert.equal(vm.runInContext('selectedBarIds.size',context),2);assert.equal(vm.runInContext("selectedBarIds.has('BV103')",context),false);
const rangeBefore=state().days[make('date').value].map(f=>f.dep);vm.runInContext("moveSelectedBars('BV101',5)",context);const rangeAfter=state().days[make('date').value];assert.equal(core.minutes(rangeAfter[0].dep),core.minutes(rangeBefore[0])+5);assert.equal(core.minutes(rangeAfter[1].dep),core.minutes(rangeBefore[1])+5);assert.equal(rangeAfter[2].dep,rangeBefore[2]);
make('timeline').onpointerdown({button:0,target:{closest:selector=>selector==='.track'?{}:null},ctrlKey:true,pointerId:2,clientX:300,clientY:5,preventDefault(){}});make('timeline').onpointermove({pointerId:2,clientX:430,clientY:70,preventDefault(){}});make('timeline').onpointerup({pointerId:2});assert.equal(vm.runInContext('selectedBarIds.size',context),3);
console.log('PASS: mouse rectangle selection, selected-only grouped movement and Ctrl-range add selection.');
