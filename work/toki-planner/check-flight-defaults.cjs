const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=require('./js/main.js'),nodes={},storage=new Map();
const make=id=>nodes[id]||(nodes[id]={value:'',textContent:'',innerHTML:'',style:{},dataset:{},disabled:false,focus(){},select(){},setAttribute(){},classList:{toggle(){},add(){},remove(){}},querySelectorAll(){return [];}});
const weekdays=[0,1,2,3,4,5,6].map(value=>({value:String(value),checked:true}));
make('period-weekdays').querySelectorAll=selector=>selector==='input:checked'?weekdays.filter(i=>i.checked):weekdays;
const context={Toki:core,document:{getElementById:make,addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},structuredClone,setTimeout,clearTimeout,Blob,URL,confirm:()=>true};
vm.createContext(context);
for(const file of ['app.js','drag.js','period.js','calendar.js','sidebar.js','seasons.js','history.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+file,'utf8'),context);


vm.runInContext(fs.readFileSync(__dirname+'/flight-defaults.js','utf8'),context);
make('default-color').value='#e4c13b';make('default-number').value='101';make('default-from').value='KIJ';make('default-to').value='NGO';make('default-block').value='1+25';make('default-save').onclick();
assert.equal(JSON.parse(storage.get('toki-flight-defaults-v1')).BV101.block,85);
make('season-year').value='2027';make('season-S').onclick();vm.runInContext("createSeasonPlan('A')",context);make('add').onclick();
assert.equal(vm.runInContext('currentFlights()[0].id',context),'BV');
make('flights').onchange({target:{dataset:{key:'id'},value:'101',closest:()=>({dataset:{index:'0'}})}});
const flight=vm.runInContext('structuredClone(currentFlights()[0])',context);
assert.equal(flight.id,'BV101');assert.equal(flight.dep,'12:00');assert.equal(flight.arr,'13:25');assert.equal(JSON.parse(storage.get('toki-flight-defaults-v1')).BV101.dep,undefined);assert.equal(flight.to,'NGO');
make('default-block').value='bad';make('default-save').onclick();assert.equal(JSON.parse(storage.get('toki-flight-defaults-v1')).BV101.block,85);
console.log('PASS: blank BV, stored defaults, automatic flight fields and arrival, invalid input preserves saved defaults.');

make('period-start').value='2027-04-01';make('period-end').value='2027-04-03';make('period-save').onclick();
const totals=vm.runInContext('seasonFlightTotals(calendarSeason())',context);assert.equal(totals.count,3);assert.equal(totals.block,255);console.log('PASS: season totals count applied flights and block minutes across days.');

const beforeIssues=vm.runInContext("calendarIssuesForDate('2027-04-01').length",context);
vm.runInContext("state.flights[0].aircraft='M1';state.flights[0].from='NGO';state.flights[0].to='NGO';commit()",context);
assert.equal(vm.runInContext("calendarIssuesForDate('2027-04-01').length",context),beforeIssues);
assert.equal(vm.runInContext('seasonFlightTotals(calendarSeason()).block',context),255);
make('period-save').onclick();assert.notEqual(vm.runInContext("calendarIssuesForDate('2027-04-01').length",context),beforeIssues);
console.log('PASS: calendar issues stay unchanged while editing and update only after Apply.');


assert.equal(make('period-save').disabled,true);
vm.runInContext("state.flights[0].dep='12:05';commit()",context);assert.equal(make('period-save').disabled,false);
vm.runInContext("state.flights[0].dep='12:00';commit()",context);assert.equal(make('period-save').disabled,true);
make('period-end').value='2027-04-04';make('period-end').onchange();assert.equal(make('period-save').disabled,false);
make('period-end').value='2027-04-03';make('period-end').onchange();assert.equal(make('period-save').disabled,true);
console.log('PASS: Apply disabled after applying, enabled for changes, disabled when changes are reverted.');

vm.runInContext("state.flights[0].dep='12:10';commit()",context);
make('period-end').value='2027-04-05';make('period-end').onchange();
assert.equal(make('period-revert').disabled,false);
make('period-revert').onclick();assert.equal(vm.runInContext('currentFlights()[0].dep',context),'12:00');assert.equal(make('period-end').value,'2027-04-03');assert.equal(make('period-save').disabled,true);assert.equal(make('period-revert').disabled,true);
console.log('PASS: revert restores applied flights and date ranges without changing applied records.');

for(const [airport,color] of [['UKB','#739b35'],['NGO','#e4c13b'],['OKD','#5373af']]){
 make('default-number').value='202';make('default-from').value='KIJ';make('default-to').value=airport;make('default-block').value='1+20';make('default-to').onchange();make('default-save').onclick();
 const result=vm.runInContext("(()=>{const f={id:'BV202',dep:'10:00'};Toki.applyFlightDefaults(f);return f;})()",context);assert.equal(result.color,color);
}
console.log('PASS: flight presets apply Kobe green, Chubu yellow, Okadama blue.');

make('default-color').value='#b3558b';make('default-save').onclick();assert.equal(JSON.parse(storage.get('toki-flight-defaults-v1')).BV202.color,'#b3558b');
const custom=vm.runInContext("(()=>{const f={id:'BV202',dep:'10:00'};Toki.applyFlightDefaults(f);return f.color;})()",context);assert.equal(custom,'#b3558b');console.log('PASS: custom preset color saved and applied.');

vm.runInContext("setDefaultColor('#739b35')",context);assert.equal((make('default-color-palette').innerHTML.match(/data-default-color=/g)||[]).length,30);
make('default-color-palette').onclick({target:{closest:()=>({dataset:{defaultColor:'#7654a4'}})}});assert.equal(make('default-color').value,'#7654a4');make('default-save').onclick();assert.equal(JSON.parse(storage.get('toki-flight-defaults-v1')).BV202.color,'#7654a4');console.log('PASS: 30-color palette selects and saves preset color.');

vm.runInContext("state.flights=[{id:'BV101',from:'KIJ',to:'NGO',dep:'08:00',arr:'09:20',aircraft:'M1'},{id:'BV102',from:'NGO',to:'KIJ',dep:'10:00',arr:'11:20',aircraft:'M1'},{id:'BV501',from:'KIJ',to:'UKB',dep:'12:00',arr:'13:40',aircraft:'M2'}];render()",context);
assert.equal((make('flights').innerHTML.match(/data-toggle-route=/g)||[]).length,2);
make('flights').onclick({target:{closest:selector=>selector==='[data-toggle-route]'?{dataset:{toggleRoute:'M1'}}:null}});
assert(make('flights').innerHTML.includes('data-index="0" hidden'));assert(make('flights').innerHTML.includes('data-index="1" hidden'));assert(!make('flights').innerHTML.includes('data-index="2" hidden'));
vm.runInContext('render()',context);assert(make('flights').innerHTML.includes('data-index="0" hidden'));
make('flights').onclick({target:{closest:selector=>selector==='[data-toggle-route]'?{dataset:{toggleRoute:'M1'}}:null}});assert(!make('flights').innerHTML.includes('data-index="0" hidden'));
console.log('PASS: flights group by aircraft, collapse independently, retain state across render, and expand.');

const beforeInvalid=vm.runInContext('JSON.stringify(currentFlights())',context),beforeTable=make('flights').innerHTML;
for(const value of ['300','999999','23+59','3+99','0+00','-1','NaN']){
 const target={dataset:{key:'block'},value,closest:()=>({dataset:{index:'0'}})};
 make('flights').onchange({target});assert.equal(vm.runInContext('JSON.stringify(currentFlights())',context),beforeInvalid);assert.equal(make('flights').innerHTML,beforeTable);assert.equal(target.value,'1+20');
}
console.log('PASS: large/malformed block entries leave flights, calendar and table unchanged and restore the previous input.');

vm.runInContext("state.flights=[{id:'BV104',from:'KIJ',to:'NGO',dep:'02:00',arr:'01:30',aircraft:'M1'}];render()",context);
assert(!make('timeline').innerHTML.includes('表示範囲外（便一覧で確認）</div>'));assert(make('timeline').innerHTML.includes('left:0%;width:3%'));assert(make('issues').innerHTML.includes('到着時刻'));
console.log('PASS: legacy reversed/out-of-range times stay within positioned bars and show validation issues.');

vm.runInContext("state.flights=[{id:'BV101',from:'KIJ',to:'NGO',dep:'08:00',arr:'09:20',aircraft:'M1'},{id:'BV102',from:'NGO',to:'KIJ',dep:'10:00',arr:'11:20',aircraft:'M1'}];render()",context);
assert(make('flights').innerHTML.includes('data-key="gap"'));
const gapChange=value=>make('flights').onchange({target:{dataset:{key:'gap'},value,closest:()=>({dataset:{index:'0'}})}});
gapChange('30');assert.equal(vm.runInContext('currentFlights()[1].dep',context),'09:50');assert.equal(vm.runInContext('currentFlights()[1].arr',context),'11:10');
gapChange('9999');assert.equal(vm.runInContext('currentFlights()[1].dep',context),'09:50');console.log('PASS: table gap updates departure/arrival preserving block; invalid gap preserves flight.');

vm.runInContext(fs.readFileSync(__dirname+'/constraints.js','utf8'),context);make('constraint-add').onclick();assert.equal(vm.runInContext('state.constraints.length',context),1);
make('constraint-rows').onchange({target:{dataset:{constraintKey:'start'},value:'09:00',closest:()=>({dataset:{constraint:'0'}})}});assert(make('issues').innerHTML.includes('空港運用時間'));
const prior=vm.runInContext("calendarIssuesForDate('2027-04-01').length",context);make('period-save').onclick();assert(vm.runInContext("calendarIssuesForDate('2027-04-01').some(i=>i.text.includes('空港運用時間'))",context));
console.log('PASS: constraint editing, live warnings and explicit application.');

assert.equal(core.schedule('2026-10-25').length,12);assert.equal(core.schedule('2026-10-27').length,8);assert.equal(core.schedule('2026-12-01').length,8);assert.equal(core.schedule('2026-12-04').length,10);assert.equal(core.schedule('2026-12-05').length,12);assert.equal(core.schedule('2027-01-25').length,10);assert.equal(core.schedule('2027-03-27').length,12);assert.equal(core.schedule('2027-03-28').length,0);
vm.runInContext(fs.readFileSync(__dirname+'/official-w26.js','utf8'),context);
const imported=vm.runInContext("planLibrary.items.filter(p=>p.data.officialSource)",context);assert.equal(imported.length,5);assert.equal(imported.reduce((n,p)=>n+p.data.periods[0].dates.length,0),154);
for(const plan of imported)for(const day of plan.data.periods[0].dates){assert.equal(vm.runInContext(`Toki.assignedPlanId('${day}')`,context),plan.id);assert.equal(plan.data.days[day].length,core.schedule(day).length);core.validate(core.expandDates(structuredClone(plan.data)));}
vm.runInContext('importOfficialW26()',context);assert.equal(vm.runInContext('planLibrary.items.filter(p=>p.data.officialSource).length',context),5);console.log('PASS: W26 official boundary schedules, five patterns, 154 dates, single ownership, validation and idempotent import.');
