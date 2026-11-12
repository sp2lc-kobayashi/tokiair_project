const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=require('./js/main.js'),nodes={},storage=new Map();
const make=id=>nodes[id]||(nodes[id]={value:'',textContent:'',innerHTML:'',style:{},dataset:{},disabled:false,focus(){},select(){},setAttribute(){},classList:{toggle(){},add(){},remove(){}},querySelectorAll(){return [];}});
const weekdays=[0,1,2,3,4,5,6].map(value=>({value:String(value),checked:true}));
make('period-weekdays').querySelectorAll=selector=>selector==='input:checked'?weekdays.filter(i=>i.checked):weekdays;
const context={Toki:core,document:{getElementById:make,addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},structuredClone,setTimeout,clearTimeout,Blob,URL,confirm:()=>true};
vm.createContext(context);
for(const file of ['app.js','drag.js','period.js','calendar.js','sidebar.js','seasons.js','history.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),context);



const rows=d=>core.schedule(d),id=(d,n)=>rows(d).find(f=>f.id==='BV'+n);
assert.equal(rows('2026-03-29').length,10);assert.equal(rows('2026-04-01').length,6);assert.equal(rows('2026-04-29').length,10);assert.equal(rows('2026-05-05').length,10);assert.equal(rows('2026-06-02').length,6);assert.equal(rows('2026-07-01').length,0);assert.equal(rows('2026-07-17').length,10);assert.equal(rows('2026-07-21').length,4);assert.equal(rows('2026-08-18').length,8);assert.equal(rows('2026-09-18').length,10);assert.equal(id('2026-09-18','407').dep,'16:20');assert.equal(rows('2026-10-19').length,10);assert.equal(rows('2026-10-23').length,12);
assert(id('2026-10-27','551'));assert(id('2026-10-29','552'));assert(id('2026-11-03','451'));assert(id('2026-11-05','452'));assert(id('2026-12-16','403'));assert(!id('2026-12-16','404'));assert(id('2026-12-17','404'));assert.equal(rows('2026-12-29').length,12);assert(id('2027-01-06','403'));assert(id('2027-01-21','404'));
make('season-year').value='2027';make('season-S').onclick();vm.runInContext("createSeasonPlan('A');createSeasonPlan('B')",context);const original=vm.runInContext('planLibrary.items.map(p=>p.id)',context);
vm.runInContext(fs.readFileSync(__dirname+'/official-2026.js','utf8'),context);
const imported=vm.runInContext('planLibrary.items.filter(p=>p.data.officialSource)',context);let days=0;
for(const plan of imported){core.validate(core.expandDates(structuredClone(plan.data)));days+=plan.data.periods[0].dates.length;for(const day of plan.data.periods[0].dates){assert.equal(plan.data.days[day]?.length||0,rows(day).length);assert.equal(vm.runInContext(`Toki.assignedPlanId('${day}')`,context),plan.id);}}
assert.equal(days,364);for(const id of original)assert(vm.runInContext(`planLibrary.items.some(p=>p.id==='${id}')`,context));assert.equal(vm.runInContext('selectedPlan().name',context),'B');const count=imported.length;vm.runInContext('importOfficial2026()',context);assert.equal(vm.runInContext('planLibrary.items.filter(p=>p.data.officialSource).length',context),count);console.log('PASS: 364 dates, '+count+' patterns, exceptions, no-flight days, validation, existing 2027 A/B preserved, active plan unchanged, idempotent import.');

const preserved=vm.runInContext("JSON.stringify(planLibrary.items.filter(p=>p.data.season?.year===2027).map(p=>({id:p.id,name:p.name,data:p.data})))",context);
vm.runInContext(fs.readFileSync(__dirname+'/official-allocation.js','utf8'),context);
let missing=0,total=0;for(const plan of vm.runInContext('planLibrary.items.filter(p=>p.data.officialSource)',context)){
 core.validate(core.expandDates(structuredClone(plan.data)));const fs=plan.data.flights;missing+=fs.filter(f=>!f.aircraft).length;total+=fs.length;
 const errors=core.check(fs,plan.data.machines,plan.data.turn).filter(i=>i.type==='error'&&!i.text.includes('未割り当て'));assert.equal(errors.length,0);for(const day of plan.data.periods[0].dates)assert.equal(JSON.stringify(plan.data.days[day]),JSON.stringify(fs));
}
assert.equal(vm.runInContext("JSON.stringify(planLibrary.items.filter(p=>p.data.season?.year===2027).map(p=>({id:p.id,name:p.name,data:p.data})))",context),preserved);console.log('PASS: automatic assignment '+(total-missing)+'/'+total+' pattern flights, no time/airport conflicts, daily snapshots agree, 2027 preserved.');

context.Toki.airportChoices={from:['KIJ'],to:['KIJ']};context.renderAirportMaster=()=>{};context.renderAirportChoices=()=>{};
vm.runInContext(fs.readFileSync(__dirname+'/saga-charter.js','utf8'),context);
for(const day of ['2026-11-24','2026-11-26']){
 const plan=vm.runInContext(`planLibrary.items.find(p=>p.id===Toki.assignedPlanId('${day}'))`,context),charters=plan.data.days[day].filter(f=>f.charter);assert.equal(charters.length,2);assert(charters.every(f=>f.aircraft==='M3'));assert.equal(plan.data.days[day].length,core.schedule(day).length+2);core.validate(core.expandDates(structuredClone(plan.data)));assert.equal(vm.runInContext(`calendarCharterFlights('${day}').length`,context),2);
}
assert.equal(vm.runInContext("calendarCharterFlights('2026-11-25').length",context),0);const beforeCharters=vm.runInContext('planLibrary.items.length',context);vm.runInContext('importSagaCharter2026()',context);assert.equal(vm.runInContext('planLibrary.items.length',context),beforeCharters);console.log('PASS: charter on Nov24/26 only, both ways, ATR42 allocation, regular flights retained, calendar detection and idempotent import.');
