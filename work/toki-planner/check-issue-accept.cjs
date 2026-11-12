const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=require('./js/main.js'),nodes={},storage=new Map();
const make=id=>nodes[id]||(nodes[id]={value:'',textContent:'',innerHTML:'',style:{},dataset:{},disabled:false,focus(){},select(){},setAttribute(){},classList:{toggle(){},add(){},remove(){}},querySelectorAll(){return [];}});
const weekdays=[0,1,2,3,4,5,6].map(value=>({value:String(value),checked:true}));
make('period-weekdays').querySelectorAll=selector=>selector==='input:checked'?weekdays.filter(i=>i.checked):weekdays;
const context={Toki:core,document:{getElementById:make,addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},structuredClone,setTimeout,clearTimeout,Blob,URL,confirm:()=>true};
vm.createContext(context);
for(const file of ['app.js','drag.js','period.js','calendar.js','sidebar.js','seasons.js','history.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),context);



vm.runInContext(fs.readFileSync(__dirname+'/issue-accept.js','utf8'),context);
make('season-year').value='2027';make('season-S').onclick();vm.runInContext("createSeasonPlan('A')",context);make('add').onclick();assert(make('stats').innerHTML.includes('id="accept-issues"'));
make('stats').onclick({target:{closest:()=>({})}});assert(!make('stats').innerHTML.includes('id="accept-issues"'));
assert(make('issues').innerHTML.includes('✓ Accept済'));assert(make('issues').innerHTML.includes('未割り当て'));assert(make('stats').innerHTML.includes('Accept済 1件'));
make('issues').onclick({target:{closest:()=>({dataset:{revokeAccept:'0'}})}});assert(make('stats').innerHTML.includes('id="accept-issues"'));assert(!make('issues').innerHTML.includes('✓ Accept済'));make('stats').onclick({target:{closest:()=>({})}});console.log('PASS: accepted warning remains visible with count, and individual revoke restores pending warning.');

make('period-start').value='2027-04-01';make('period-end').value='2027-04-03';make('period-save').onclick();assert.equal(vm.runInContext("calendarIssuesForDate('2027-04-01').length",context),0);
vm.runInContext("currentFlights()[0].dep='12:05';commit()",context);assert(make('stats').innerHTML.includes('id="accept-issues"'));assert.equal(vm.runInContext("calendarIssuesForDate('2027-04-01').length",context),0);
make('period-save').onclick();assert(vm.runInContext("calendarIssuesForDate('2027-04-01').length",context)>0);
console.log('PASS: Accept only with pending issues, confirmation persisted by Apply, edited flights require acceptance again.');

vm.runInContext(fs.readFileSync(__dirname+'/new-flight-airports.js','utf8'),context);
make('new-flight-to').onchange({target:{value:'UKB'}});assert.equal(JSON.parse(storage.get('toki-new-flight-airports-v1')).to,'UKB');
vm.runInContext('state.flights=[]',context);make('add').onclick();assert.equal(vm.runInContext('currentFlights()[0].from',context),'KIJ');assert.equal(vm.runInContext('currentFlights()[0].to',context),'UKB');
make('new-flight-from').onchange({target:{value:'UKB'}});assert.equal(context.Toki.newFlightAirports.from,'KIJ');console.log('PASS: initial airports persist and apply to new flights; identical airports rejected.');

assert(vm.runInContext("createSeasonPlan('A1')",context));assert.equal(vm.runInContext('selectedPlan().name',context),'A1');assert.equal(vm.runInContext("createSeasonPlan('A1')",context),false);assert(vm.runInContext("createSeasonPlan('a2')",context));assert.equal(vm.runInContext('selectedPlan().name',context),'A2');make('add').onclick();make('period-start').value='2027-04-05';make('period-end').value='2027-04-06';make('period-save').onclick();assert(vm.runInContext("calendarAppliedNames(calendarSeason()).get('2027-04-05').has('A2')",context));assert.equal(core.planColor('A2'),core.planColor('A'));console.log('PASS: alphanumeric codes create, normalize, prevent duplicates, display on calendar, preserve base-letter color.');

vm.runInContext(fs.readFileSync(__dirname+'/plan-menu.js','utf8'),context);
vm.runInContext("copyNamedPlan(planLibrary.items.find(p=>p.name==='A1'&&p.data.season.key==='S2027').id)",context);assert.equal(vm.runInContext('selectedPlan().name',context),'A3');
vm.runInContext('copyNamedPlan(selectedPlan().id)',context);assert.equal(vm.runInContext('selectedPlan().name',context),'A4');console.log('PASS: copying A1 skips existing A2 to A3; copying A3 creates A4 in same season.');

vm.runInContext(fs.readFileSync(__dirname+'/events.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/event-menu.js','utf8'),context);
vm.runInContext("aircraftEvents=[{id:'Etest',title:'花火大会',type:'other',aircraft:'',start:'2027-06-01',end:'2027-06-02',blocks:false,note:'memo',color:'#7654a4',seasonKey:'S2027'}];Toki.fleetEvents=aircraftEvents;contextEventId='Etest'",context);
make('event-menu-copy').onclick();const copied=vm.runInContext('structuredClone(aircraftEvents[1])',context);assert.equal(copied.title,'花火大会 のコピー');assert.equal(copied.color,'#7654a4');assert.equal(copied.seasonKey,'S2027');assert.notEqual(copied.id,'Etest');
vm.runInContext(`contextEventId='${copied.id}'`,context);make('event-menu-delete').onclick();assert.equal(vm.runInContext('aircraftEvents.length',context),1);console.log('PASS: event context menu copies properties with unique ID and deletes only selected event.');

vm.runInContext(fs.readFileSync(__dirname+'/plan-reorder.js','utf8'),context);
const orderIds=vm.runInContext("planLibrary.items.filter(p=>p.data.season?.key==='S2027').map(p=>p.id)",context),activeBefore=vm.runInContext('planLibrary.activeId',context);
assert(vm.runInContext(`reorderSidebarPlan('${orderIds.at(-1)}','${orderIds[0]}',false)`,context));const savedOrder=JSON.parse(storage.get('toki-plan-library-v1')).items.filter(p=>p.data.season?.key==='S2027');assert.equal(savedOrder[0].id,orderIds.at(-1));assert.equal(vm.runInContext('planLibrary.activeId',context),activeBefore);assert.equal(vm.runInContext(`reorderSidebarPlan('${orderIds[0]}','${orderIds[0]}',false)`,context),false);console.log('PASS: sidebar reorder persists order and preserves active plan.');

context.document.querySelector=make;
vm.runInContext(fs.readFileSync(__dirname+'/plan-lock.js','utf8'),context);
vm.runInContext("openPlan(planLibrary.items.find(p=>p.name==='A2'&&p.data.season?.key==='S2027').id)",context);make('period-save').onclick();
make('plan-lock-toggle').onclick();assert.equal(vm.runInContext('selectedPlan().locked',context),true);assert.equal(make('planner-content').inert,true);const lockedData=vm.runInContext('JSON.stringify(state.flights)',context),lockedId=vm.runInContext('selectedPlan().id',context);
vm.runInContext("state.flights[0].dep='01:00';commit()",context);assert.equal(vm.runInContext('JSON.stringify(state.flights)',context),lockedData);
vm.runInContext('restoreEdit(-1)',context);assert.equal(vm.runInContext('JSON.stringify(state.flights)',context),lockedData);
vm.runInContext(`deleteNamedPlan('${lockedId}')`,context);assert(vm.runInContext(`planLibrary.items.some(p=>p.id==='${lockedId}')`,context));assert(JSON.parse(storage.get('toki-plan-library-v1')).items.find(p=>p.id===lockedId).locked);
make('plan-lock-toggle').onclick();assert.equal(vm.runInContext('selectedPlan().locked',context),false);assert.equal(make('planner-content').inert,false);console.log('PASS: lock persists, prevents editing/undo/delete, and unlock restores editing.');

make('plan-list').addEventListener=()=>{};
vm.runInContext(fs.readFileSync(__dirname+'/flight-defaults.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/constraints.js','utf8'),context);vm.runInContext(fs.readFileSync(__dirname+'/settings-page.js','utf8'),context);
make('settings-open').onclick();assert.equal(make('settings-page').hidden,false);assert.equal(make('planner-content').hidden,true);
make('airport-code').value='sdj';make('airport-name').value='仙台';make('airport-save').onclick();assert.equal(core.airports.SDJ,'仙台');assert.equal(JSON.parse(storage.get('toki-airports-v1')).SDJ,'仙台');assert(make('new-flight-to').innerHTML.includes('仙台'));
make('settings-back').onclick();assert.equal(make('planner-content').hidden,false);assert.equal(make('settings-page').hidden,true);console.log('PASS: settings pane navigation, airport registration/persistence and dropdown availability.');

make('settings-back').onclick();vm.runInContext("state.flights[0].dep='12:15';commit()",context);make('plan-lock-toggle').onclick();assert.equal(vm.runInContext('selectedPlan().locked',context),true);
const frozen=vm.runInContext('JSON.stringify(state)',context);make('add').onclick();make('period-save').onclick();make('period-revert').onclick();assert.equal(vm.runInContext('JSON.stringify(state)',context),frozen);
vm.runInContext("state.flights[0].dep='01:00';render();save()",context);assert.equal(vm.runInContext('JSON.stringify(state)',context),frozen);console.log('PASS: lock works with draft changes; Add/Apply/Revert and render-before-save cannot modify locked data.');

make('plan-lock-toggle').onclick();make('period-save').onclick();
const preAccept=vm.runInContext('seasonFlightTotals(calendarSeason()).issues',context);make('stats').onclick({target:{closest:()=>({})}});const postAccept=vm.runInContext('seasonFlightTotals(calendarSeason()).issues',context);assert(postAccept<preAccept);make('issues').onclick({target:{closest:()=>({dataset:{revokeAccept:'0'}})}});assert(vm.runInContext('seasonFlightTotals(calendarSeason()).issues',context)>postAccept);console.log('PASS: Accept immediately reduces season issue total without Apply; revoking restores count.');
