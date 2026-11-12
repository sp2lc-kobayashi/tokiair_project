(function(root){
'use strict';
const cache=new Map();
const iso=d=>d.toISOString().slice(0,10);
function holidays(year){
 if(cache.has(year))return cache.get(year);
 const days={};const set=(month,day,name)=>days[`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`]=name;
 const monday=(month,n)=>1+(8-new Date(Date.UTC(year,month-1,1)).getUTCDay())%7+7*(n-1);
 [[1,1,'元日'],[2,11,'建国記念の日'],[2,23,'天皇誕生日'],[4,29,'昭和の日'],[5,3,'憲法記念日'],[5,4,'みどりの日'],[5,5,'こどもの日'],[8,11,'山の日'],[11,3,'文化の日'],[11,23,'勤労感謝の日']].forEach(a=>set(...a));
 set(1,monday(1,2),'成人の日');set(7,monday(7,3),'海の日');set(9,monday(9,3),'敬老の日');set(10,monday(10,2),'スポーツの日');
 set(3,year===2026?20:year===2027?21:Math.floor(20.8431+0.242194*(year-1980)-Math.floor((year-1980)/4)),'春分の日');
 set(9,year<=2027?23:Math.floor(23.2488+0.242194*(year-1980)-Math.floor((year-1980)/4)),'秋分の日');
 const national={...days};
 for(let t=Date.UTC(year,0,2);t<Date.UTC(year+1,0,1)-86400000;t+=86400000){const d=new Date(t),key=iso(d);if(!national[key]&&national[iso(new Date(t-86400000))]&&national[iso(new Date(t+86400000))])days[key]='国民の休日';}
 for(const date of Object.keys(national).sort())if(new Date(date+'T00:00:00Z').getUTCDay()===0){let t=Date.parse(date+'T00:00:00Z')+86400000;while(national[iso(new Date(t))])t+=86400000;days[iso(new Date(t))]='振替休日';}
 cache.set(year,days);return days;
}
function holiday(date){const name=holidays(Number(date.slice(0,4)))[date];return name?{name,provisional:Number(date.slice(0,4))>=2028}:null;}
const api={holidays,holiday};if(typeof module!=='undefined')module.exports=api;else root.JapanHolidays=api;
})(typeof window!=='undefined'?window:globalThis);

(function(root){
'use strict';
const START='2026-03-29',END='2036-03-31';
const dateKeys=()=>{const out=[];for(let t=Date.parse(START+'T00:00:00Z');t<=Date.parse(END+'T00:00:00Z');t+=86400000)out.push(new Date(t).toISOString().slice(0,10));return out;};
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&d>=START&&d<=END&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const holiday=(typeof module!=='undefined'?require('./holidays.js'):JapanHolidays).holiday;
function expandDates(s){if(!s.days||typeof s.days!=='object'||Array.isArray(s.days))throw Error('便データが正しくありません。');for(const d of dateKeys())if(s.days[d]===undefined)s.days[d]=[];return s;}
const airports={KIJ:'新潟',OKD:'札幌（丘珠）',NGO:'名古屋（中部）',UKB:'神戸'};
try{if(typeof localStorage!=='undefined'){const saved=JSON.parse(localStorage.getItem('toki-airports-v1')||'{}');for(const [code,name] of Object.entries(saved))if(/^(?:[A-Z]{3}|JP[0-9]{3})$/.test(code)&&typeof name==='string'&&name.trim()&&name.length<=60)airports[code]=name;}}catch(e){}

const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const formatBlock=n=>Number.isInteger(n)&&n>=0?`${Math.floor(n/60)}+${String(n%60).padStart(2,'0')}`:'';
function parseBlock(value){
 const match=String(value).normalize('NFKC').trim().match(/^(\d{1,2})\s*\+\s*([0-5]\d)$/);
 if(!match)throw Error('ブロックタイムは1+20のように時間＋分で入力してください。');
 const n=Number(match[1])*60+Number(match[2]);
 if(n<1||n>1439)throw Error('ブロックタイムは0+01〜23+59で入力してください。');
 return n;
}
function arrival(dep,block){
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(dep)||!Number.isInteger(block)||block<1||block>1439)throw Error('ブロックタイムは1〜1439分の整数で入力してください。');
 const end=minutes(dep)+block;
 if(end>=1440)throw Error('翌日到着になる設定です。この試作版では同日内の便を入力してください。');
 return clock(end);
}
function summerSchedule2026(date){
 const rows=[],dow=new Date(date+'T00:00:00Z').getUTCDay(),busy=[0,1,5,6].includes(dow),holiday=['2026-04-29','2026-05-05','2026-05-06','2026-05-07'].includes(date);
 const add=(id,from,to,dep,arr)=>rows.push({id:'BV'+id,from,to,dep,arr,aircraft:'',color:({UKB:'#739b35',NGO:'#e4c13b',OKD:'#5373af'})[to==='UKB'||from==='UKB'?'UKB':to==='NGO'||from==='NGO'?'NGO':'OKD']});
 if(date<'2026-09-01'){
  if(busy||holiday){
   add('401','KIJ','NGO','07:35','08:55');add('404','NGO','KIJ','19:50','21:00');add('501','KIJ','UKB','09:20','11:00');add('502','UKB','KIJ','11:30','13:00');add('503','KIJ','UKB','15:00','16:40');add('504','UKB','KIJ','17:10','18:40');add('103','KIJ','OKD','14:30','16:05');add('102','OKD','KIJ','12:20','14:00');add('411','NGO','OKD','09:25','11:50');add('412','OKD','NGO','16:35','19:15');
  }else if(date<'2026-07-01'){
   add('401','KIJ','NGO','08:15','09:35');add('404','NGO','KIJ','15:35','16:45');add('103','KIJ','OKD','09:50','11:25');add('102','OKD','KIJ','13:20','15:00');add('411','NGO','OKD','10:10','12:35');add('412','OKD','NGO','11:55','14:35');
  }else if(date>='2026-07-21'){
   add('105','KIJ','OKD','10:15','11:50');add('106','OKD','KIJ','12:20','14:00');add('407','KIJ','NGO','14:45','16:05');add('408','NGO','KIJ','16:40','17:50');
   if((date>='2026-08-18'&&date<='2026-08-20')||(date>='2026-08-25'&&date<='2026-08-27')){add('405','KIJ','NGO','09:25','10:45');add('406','NGO','KIJ','11:20','12:30');add('107','KIJ','OKD','14:30','16:05');add('108','OKD','KIJ','16:35','18:15');}
  }
 }else{
  add('101','KIJ','OKD','10:15','11:50');add('102','OKD','KIJ','12:20','14:00');add('103','KIJ','OKD','14:30','16:05');add('104','OKD','KIJ','16:35','18:15');
  const special=busy&&(date==='2026-09-18'||(date>='2026-10-02'&&date<='2026-10-19'));
  if(busy){add('401','KIJ','NGO','08:35','09:55');add('402','NGO','KIJ','10:30','11:40');if(special){add('407','KIJ','NGO','16:20','17:40');add('408','NGO','KIJ','18:15','19:25');add('505','KIJ','UKB','12:10','13:50');add('506','UKB','KIJ','14:20','15:50');}else{add('403','KIJ','NGO','14:55','16:15');add('404','NGO','KIJ','16:50','18:00');add('501','KIJ','UKB','09:25','11:05');add('502','UKB','KIJ','11:35','13:05');add('503','KIJ','UKB','13:40','15:20');add('504','UKB','KIJ','15:50','17:20');}}
  else{add('405','KIJ','NGO','09:25','10:45');add('406','NGO','KIJ','11:20','12:30');add('403','KIJ','NGO','14:55','16:15');add('404','NGO','KIJ','16:50','18:00');}
 }
 return rows.sort((a,b)=>minutes(a.dep)-minutes(b.dep));
}
function schedule(date){
 if(date>='2026-03-29'&&date<='2026-10-24')return summerSchedule2026(date);
 if(date<'2026-10-25'||date>'2027-03-27')return [];
 const dow=new Date(date+'T00:00:00Z').getUTCDay(),busy=[0,1,5,6].includes(dow),early=date<='2026-11-30',peak=(date>='2026-12-05'&&date<='2027-01-24')||date>='2027-03-09';
 const rows=[];const add=(id,from,to,dep,arr)=>rows.push({id:'BV'+id,from,to,dep,arr,aircraft:'',color:({UKB:'#739b35',NGO:'#e4c13b',OKD:'#5373af'})[from==='KIJ'?to:from]});
 if(early){
  add('101','KIJ','OKD','10:05','11:40');add('102','OKD','KIJ','12:10','13:55');add('103','KIJ','OKD','14:25','16:00');add('104','OKD','KIJ','16:30','18:15');
  if(busy){add('401','KIJ','NGO','08:35','09:55');add('402','NGO','KIJ','10:30','11:40');add('501','KIJ','UKB','09:25','11:05');add('502','UKB','KIJ','11:35','13:05');add('503','KIJ','UKB','13:40','15:20');add('504','UKB','KIJ','15:50','17:20');}
  else{add('405','KIJ','NGO','09:30','10:50');add('406','NGO','KIJ','11:25','12:35');}
  add('403','KIJ','NGO','14:55','16:15');add('404','NGO','KIJ','16:50','18:00');
 }else{
  add('103','KIJ','OKD','11:25','13:00');add('104','OKD','KIJ','13:35','15:20');add('401','KIJ','NGO','07:35','08:55');add('402','NGO','KIJ','09:30','10:40');add('405','KIJ','NGO','17:10','18:30');add('406','NGO','KIJ','19:05','20:15');add('503','KIJ','UKB','12:45','14:25');add('504','UKB','KIJ','14:55','16:25');
  if(busy){add('501','KIJ','UKB','07:50','09:30');add('502','UKB','KIJ','10:00','11:30');if(peak){add('403','KIJ','NGO','12:05','13:25');add('404','NGO','KIJ','14:00','15:10');}}
 }
 if(date==='2026-10-27')add('551','KIJ','UKB','07:45','09:25');
 if(date==='2026-10-29')add('552','UKB','KIJ','18:10','19:40');
 if(date==='2026-11-03')add('451','KIJ','NGO','07:45','09:05');
 if(date==='2026-11-05')add('452','NGO','KIJ','17:55','19:15');
 if(['2026-12-16','2027-01-06','2027-01-20'].includes(date))add('403','KIJ','NGO','12:05','13:25');
 if(['2026-12-17','2027-01-07','2027-01-21'].includes(date))add('404','NGO','KIJ','14:00','15:10');
 if(date>='2026-12-29'&&date<='2026-12-31'){add('403','KIJ','NGO','12:05','13:25');add('404','NGO','KIJ','14:00','15:10');add('501','KIJ','UKB','07:50','09:30');add('502','UKB','KIJ','10:00','11:30');}
 return rows.sort((a,b)=>minutes(a.dep)-minutes(b.dep));
}

function eventColor(event){return event.color||({JA01QQ:'#ba6b21',JA02QQ:'#8455ac',JA03QQ:'#258b88'})[event.aircraft]||'#ba6b21';}
function validateEvents(events){
 if(!Array.isArray(events)||events.length>2000)throw Error('イベントの形式が正しくありません。');
 const ids=new Set();for(const e of events){if(!e||typeof e.id!=='string'||!/^E[a-z0-9]+$/.test(e.id)||ids.has(e.id)||typeof e.title!=='string'||!e.title.trim()||e.title.length>80||typeof e.aircraft!=='string'||e.aircraft.length>40||!validDate(e.start)||!validDate(e.end)||e.start>e.end||(!['maintenance','inspection','airworthiness','other'].includes(e.type)&&!/^custom[a-z0-9]+$/.test(e.type||''))||typeof e.blocks!=='boolean'||typeof e.note!=='string'||e.note.length>500||(e.color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(e.color)))throw Error('イベント名・機体・期間を確認してください。');if(e.seasonKey!==undefined){if(!/^[SW]20\d{2}$/.test(e.seasonKey))throw Error('イベントのシーズンが正しくありません。');const year=Number(e.seasonKey.slice(1));if(year<2026||year>2036)throw Error('イベントの年が範囲外です。');const last=(y,m)=>{const d=new Date(Date.UTC(y,m,0));d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d.toISOString().slice(0,10);};const start=last(year,e.seasonKey[0]==='S'?3:10),next=last(e.seasonKey[0]==='S'?year:year+1,e.seasonKey[0]==='S'?10:3),end=new Date(Date.parse(next+'T00:00:00Z')-86400000).toISOString().slice(0,10);if(e.start<start||e.end>end)throw Error('イベント期間が指定シーズンの範囲外です。');}ids.add(e.id);}return events;
}
function assign(flights,machines,turn,events=[],date=''){
 const positions=machines.filter(m=>!events.some(e=>e.blocks&&e.aircraft===m.name&&e.start<=date&&date<=e.end)).map(m=>({id:m.id,at:m.start,ready:0}));
 return [...flights].sort((a,b)=>minutes(a.dep)-minutes(b.dep)).map(f=>{
  const candidates=positions.filter(p=>p.at===f.from&&p.ready<=minutes(f.dep)).sort((a,b)=>b.ready-a.ready);
  const p=candidates[0];if(p){p.at=f.to;p.ready=minutes(f.arr)+turn;}
  return {...f,aircraft:p?p.id:''};
 });
}
function check(flights,machines,turn,events=[],date='',constraints=[]){
 const issues=[];const add=(type,text,ids=[])=>issues.push({type,text,ids});
 for(const c of constraints)for(const f of flights){for(const [airport,time,action] of [[f.from,f.dep,'出発'],[f.to,f.arr,'到着']])if(airport===c.airport&&!((c.start<=c.end)?time>=c.start&&time<=c.end:time>=c.start||time<=c.end))add('error',`${f.id}：${airports[airport]}の${action} ${time} は${c.kind==='airport'?'空港運用時間':c.kind==='contractor'?'委託先対応時間':'制約時間'} ${c.start}〜${c.end}${c.name?'（'+c.name+'）':''}の範囲外です。`,[f.id]);}
 for(const e of events)if(e.blocks&&e.start<=date&&date<=e.end){const machine=machines.find(m=>m.name===e.aircraft);const fs=machine?flights.filter(f=>f.aircraft===machine.id):[];if(fs.length)add('error',`${e.aircraft}：${e.title}（${e.start}〜${e.end}）中に${fs.length}便が割り当てられています。`,fs.map(f=>f.id));}
 for(const f of flights){if(!f.aircraft)add('error',`${f.id}：機材が未割り当てです。`,[f.id]);if(minutes(f.arr)<=minutes(f.dep))add('error',`${f.id}：到着時刻は出発時刻より後にしてください（同日内）。`,[f.id]);if(f.from===f.to)add('error',`${f.id}：出発・到着空港が同じです。`,[f.id]);}
 for(const m of machines){
  const fs=flights.filter(f=>f.aircraft===m.id).sort((a,b)=>minutes(a.dep)-minutes(b.dep));
  if(fs.length&&fs[0].from!==m.start)add('error',`${m.name}：初便 ${fs[0].id} の出発地が開始空港 ${airports[m.start]} と一致しません。`,[fs[0].id]);
  for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++)if(minutes(fs[j].dep)<minutes(fs[i].arr))add('error',`${m.name}：${fs[i].id} と ${fs[j].id} の運航時間が重複しています。`,[fs[i].id,fs[j].id]);
  for(let i=1;i<fs.length;i++){const a=fs[i-1],b=fs[i],gap=minutes(b.dep)-minutes(a.arr);if(a.to!==b.from)add('error',`${m.name}：${a.id} 到着地 ${airports[a.to]} から ${b.id} 出発地 ${airports[b.from]} へつながりません。`,[a.id,b.id]);else if(gap>=0&&gap<turn)add('error',`${m.name}：${a.id} → ${b.id} の折り返しは ${gap} 分（設定 ${turn} 分未満）。`,[a.id,b.id]);}
  if(fs.length&&fs.at(-1).to!==(m.end||m.start))add('warning',`${m.name}：最終到着地は ${airports[fs.at(-1).to]}。設定した到着空港 ${airports[m.end||m.start]} と一致しません。`,[fs.at(-1).id]);
 }
 return issues;
}
function issueAcceptanceKey(issue,data,events=[],day=''){
 const flights=(data.flights||[]).filter(f=>issue.ids.includes(f.id));
 const activeEvents=events.filter(e=>e.start<=day&&day<=e.end&&e.blocks&&issue.text.includes(e.title)&&issue.text.includes(e.aircraft)).map(e=>({aircraft:e.aircraft,blocks:e.blocks,start:e.start,end:e.end,title:e.title}));
 return normalizeAcceptanceKey(JSON.stringify([issue.type,issue.text,flights,data.machines,data.turn,data.constraints||[],activeEvents]));
}
function normalizeAcceptanceKey(key){
 try{
  const parts=JSON.parse(key);
  if(Array.isArray(parts)&&[3,7].includes(parts.length)&&Array.isArray(parts[2])){
   const flights=parts[2].map(f=>({id:f.id,from:f.from,to:f.to,dep:f.dep,arr:f.arr,aircraft:f.aircraft})).sort((a,b)=>a.id.localeCompare(b.id));
   return JSON.stringify([parts[0],parts[1],flights]);
  }
 }catch(e){}return key;
}

function pendingIssues(issues,data,events=[],day=''){
 const accepted=new Set((data.acceptedIssueKeys||[]).map(normalizeAcceptanceKey));return issues.filter(i=>!accepted.has(issueAcceptanceKey(i,data,events,day)));
}
function expandAppliedAcceptances(data,events=[]){
 const keys=new Set(data.acceptedIssueKeys||[]),accepted=new Set();
 for(const key of keys){try{const parts=JSON.parse(key);accepted.add(JSON.stringify([parts[0],parts[1]]));}catch(e){}}
 if(!accepted.size)return;
 for(const period of data.periods||[])for(const day of period.dates||[]){
  const snapshot={flights:data.days[day]||[],machines:period.machines||data.machines,turn:period.turn??data.turn,constraints:period.constraints||data.constraints||[]};
  for(const issue of check(snapshot.flights,snapshot.machines,snapshot.turn,events,day,snapshot.constraints))if(accepted.has(JSON.stringify([issue.type,issue.text])))keys.add(issueAcceptanceKey(issue,snapshot,events,day));
 }
 data.acceptedIssueKeys=[...keys];for(const period of data.periods||[])period.acceptedIssueKeys=[...keys];
}
function fresh(){const machines=Array.from({length:3},(_,i)=>({id:'M'+(i+1),name:['JA01QQ','JA02QQ','JA03QQ'][i]||'検討機 '+(i+1),type:['ATR72','ATR72','ATR42'][i]||'',start:'KIJ'}));const days={};for(const date of dateKeys()){days[date]=assign(schedule(date),machines,30);}return {version:1,turn:30,machines,days};}
function validate(s){
 if(s.constraints!==undefined){if(!Array.isArray(s.constraints)||s.constraints.length>100)throw Error('制約設定が正しくありません。');for(const c of s.constraints)if(!c||!['airport','contractor','other'].includes(c.kind)||!airports[c.airport]||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.end)||typeof c.name!=='string'||c.name.length>80)throw Error('制約の空港・時間を確認してください。');}

 if(!s||s.version!==1||!Number.isInteger(s.turn)||s.turn<0||s.turn>240||!Array.isArray(s.machines)||s.machines.length<1||s.machines.length>10||!s.days)throw Error('検討データの形式が正しくありません。');
 const ids=new Set();for(const m of s.machines){if(typeof m.id!=='string'||!/^M\d+$/.test(m.id)||ids.has(m.id)||typeof m.name!=='string'||m.name.length>40||!airports[m.start]||(m.end!==undefined&&!airports[m.end]))throw Error('機材設定が正しくありません。');ids.add(m.id);}
 for(const [date,fs] of [...Object.entries(s.days),...(s.flights!==undefined?[[START,s.flights]]:[])]){if(!validDate(date))throw Error('検討範囲外または不正な日付です。');if(!Array.isArray(fs)||fs.length>100)throw Error('日別の便データが正しくありません。');const flightIds=new Set();for(const f of fs){if(typeof f.id!=='string'||!f.id.trim()||f.id.length>24||flightIds.has(f.id)||!airports[f.from]||!airports[f.to]||!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.dep)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.arr)||(f.aircraft!==''&&!ids.has(f.aircraft)))throw Error('便データが正しくありません。');if(f.color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(f.color))throw Error('バーの色が正しくありません。');flightIds.add(f.id);}}
 if(s.periods!==undefined){
  if(!Array.isArray(s.periods)||s.periods.length>100)throw Error('期間設定が正しくありません。');
  const periodIds=new Set(),ownedDates=new Set();
  for(const p of s.periods){
   if(!p||typeof p.id!=='string'||!/^P[a-z0-9]+$/.test(p.id)||periodIds.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||!validDate(p.start)||!validDate(p.end)||p.start>p.end||!Array.isArray(p.weekdays)||!p.weekdays.length||p.weekdays.some(w=>!Number.isInteger(w)||w<0||w>6)||!Array.isArray(p.dates)||!p.dates.length)throw Error('期間設定が正しくありません。');
   periodIds.add(p.id);
   for(const d of p.dates){if(typeof d!=='string'||!s.days[d]||d<p.start||d>p.end||ownedDates.has(d)||!p.weekdays.includes(new Date(d+'T12:00:00+09:00').getUTCDay()))throw Error('期間の対象日が正しくありません。');ownedDates.add(d);}
  }
 }
 return s;
}
function isPlanApplied(data,day){
 if(!Array.isArray(data.days?.[day])||data.days[day].length===0)return false;
 const weekday=new Date(day+'T00:00:00Z').getUTCDay();
 return (data.periods||[]).some(p=>(p.dates||[]).includes(day)&&day>=p.start&&day<=p.end&&p.weekdays.includes(weekday)&&(!p.ranges||p.ranges.some(r=>day>=r.start&&day<=r.end&&(r.weekdays||p.weekdays).includes(weekday))));
}
function planColor(name){
 const palette=['#bd3045','#356db0','#2b8463','#8058a5','#b26b2a','#317f91','#ad4f88','#666f32','#5361a5','#a14c38','#39795d','#945f9e','#397f9d','#94732f','#675da0','#a94466','#3c7883','#7b763a','#8a5f48','#5c7296','#967093','#4e7c5c','#a76042','#727c9c','#54817c','#876a83'];
 return /^[A-Z][0-9]{0,3}$/.test(name)?palette[name.charCodeAt(0)-65]:'#536b89';
}
const api={expandAppliedAcceptances,normalizeAcceptanceKey,issueAcceptanceKey,pendingIssues,isPlanApplied,eventColor,validateEvents,planColor,formatBlock,parseBlock,START,END,dateKeys,validDate,expandDates,holiday,airports,minutes,clock,arrival,schedule,assign,check,fresh,validate};if(typeof module!=='undefined')module.exports=api;else root.Toki=api;
})(typeof window!=='undefined'?window:globalThis);

// Dependency-free XLSX export for offline browser use. Text uses inline strings,
// so user-provided names are never interpreted as formulas.
(function(root){
'use strict';
const enc=new TextEncoder();
const xml=s=>String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function crc32(data){let c=0xffffffff;for(const byte of data){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function zip(files){
 const parts=[],central=[];let offset=0,centralSize=0;
 for(const [name,body] of Object.entries(files)){
  const n=enc.encode(name),d=enc.encode(body),crc=crc32(d),local=new Uint8Array(30+n.length),v=new DataView(local.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,n.length,true);local.set(n,30);
  const h=new Uint8Array(46+n.length),w=new DataView(h.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,crc,true);w.setUint32(20,d.length,true);w.setUint32(24,d.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);h.set(n,46);
  parts.push(local,d);central.push(h);offset+=local.length+d.length;centralSize+=h.length;
 }
 const tail=new Uint8Array(22),t=new DataView(tail.buffer);t.setUint32(0,0x06054b50,true);t.setUint16(8,central.length,true);t.setUint16(10,central.length,true);t.setUint32(12,centralSize,true);t.setUint32(16,offset,true);
 const all=[...parts,...central,tail],result=new Uint8Array(offset+centralSize+22);let pos=0;for(const a of all){result.set(a,pos);pos+=a.length;}return result;
}
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const column=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
function sheet(rows,widths){
 const body=rows.map((row,i)=>`<row r="${i+1}"${i===0?' ht="30" customHeight="1"':''}>${row.map((v,j)=>{const ref=column(j)+(i+1),style=i===0?1:(v&&typeof v==='object'?v.style||0:0),value=v&&typeof v==='object'?v.value:v;return typeof value==='number'?`<c r="${ref}" s="${style}"><v>${value}</v></c>`:`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value??'')}</t></is></c>`;}).join('')}</row>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${ns}"><dimension ref="A1:${column(rows[0].length-1)}${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${column(rows[0].length-1)}${rows.length}"/></worksheet>`;
}
function exportExcel(state,T){
 const flights=[['日付','曜日','便名','機体','機種','出発空港','到着空港','出発(JST)','ブロックタイム(時間+分)','到着(JST)','公表ダイヤとの差','祝日']];
 const checks=[['日付','区分','関連便','チェック結果（出力時点）']];
 for(const date of Object.keys(state.days).sort()){
  const fs=state.days[date],base=T.schedule(date),weekday=new Date(date+'T12:00:00+09:00').toLocaleDateString('ja-JP',{weekday:'short',timeZone:'Asia/Tokyo'}),serial=Math.round((Date.parse(date+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);
  const dateCell={value:serial,style:2};
  for(const f of [...fs].sort((a,b)=>T.minutes(a.dep)-T.minutes(b.dep))){const m=state.machines.find(m=>m.id===f.aircraft),b=base.find(b=>b.id===f.id);flights.push([dateCell,weekday,f.id,m?.name||'未割り当て',m?.type||'',T.airports[f.from],T.airports[f.to],{value:T.minutes(f.dep)/1440,style:3},{value:(T.minutes(f.arr)-T.minutes(f.dep))/1440,style:4},{value:T.minutes(f.arr)/1440,style:3},!b?(date.startsWith('2026-12-')?'追加':'公表データ未収録'):['from','to','dep','arr'].some(k=>b[k]!==f[k])?'変更':'同じ',T.holiday(date)?T.holiday(date).name+(T.holiday(date).provisional?'（暫定）':''):'']);}
  for(const b of base)if(!fs.some(f=>f.id===b.id))checks.push([dateCell,'公表便の削除',b.id,'検討案から削除された公表便です。']);
  const issues=T.check(fs,state.machines,state.turn,state.events||[],date);for(const issue of issues)checks.push([dateCell,issue.type==='error'?'不整合':'翌日確認',issue.ids.join('・'),issue.text]);
  if(!issues.length)checks.push([dateCell,'当日チェック','','設定条件内で当日の不整合なし（翌日接続等は対象外）']);
 }
 const settings=[['設定項目','値','補足'],['出力期間',Object.keys(state.days).sort()[0]+'〜'+Object.keys(state.days).sort().at(-1),'時刻は日本時間'],['最低折り返し時間(分)',state.turn,'検討用の設定値'],...state.machines.map(m=>[m.name,m.type||'未設定','開始空港：'+T.airports[m.start]]),['公表時刻の出典','https://tokiair.com/schedules/','2026年10月24日確認'],['機材割り当て','検討案','公式の機体割り当てではありません'],['チェックの範囲','各日を独立して判定','翌日接続・整備・乗員・空港制約・機種適合は対象外'],['Excelでの編集','出力時点の結果','Excelの変更はソフトに反映されず、到着時刻・チェック結果も再計算されません']];
 const sheets=[['運航便一覧',flights,[14,8,14,16,12,20,20,14,24,14,26,24]],['機材・設定',settings,[30,48,86]],['チェック結果',checks,[14,20,30,110]]];
 return packSheets(sheets);
}
function packSheets(sheets){
 const files={
 '[Content_Types].xml':`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
 '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name],i)=>`<sheet name="${name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`,
 'xl/_rels/workbook.xml.rels':`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
 'xl/styles.xml':`<styleSheet xmlns="${ns}"><numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy/mm/dd"/><numFmt numFmtId="165" formatCode="hh:mm"/><numFmt numFmtId="166" formatCode="[h]&quot;+&quot;mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Yu Gothic"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Yu Gothic"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123E47"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
 };
 sheets.forEach(([,rows,widths],i)=>files[`xl/worksheets/sheet${i+1}.xml`]=sheet(rows,widths));return zip(files);
}
if(typeof module!=='undefined')module.exports=exportExcel;else{root.exportTokiExcel=exportExcel;root.exportIntegratedExcel=(rows,widths)=>packSheets([['統合スケジュール',rows,widths]]);}
})(typeof window!=='undefined'?window:globalThis);

'use strict';
const {formatBlock,parseBlock,START,END,validDate,expandDates,airports,minutes,clock,arrival,schedule,assign,check,fresh,validate}=Toki;
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function migrateAircraftNames(s){expandDates(s);s.machines.forEach(m=>{if(typeof m.type!=='string')m.type=({JA01QQ:'ATR72',JA02QQ:'ATR72',JA03QQ:'ATR42',M1:'ATR72',M2:'ATR72',M3:'ATR42'})[m.name]||({M1:'ATR72',M2:'ATR72',M3:'ATR42'})[m.id]||'';const i=['M1','M2','M3'].indexOf(m.id);if(i>=0&&m.name==='検討機 '+(i+1))m.name=['JA01QQ','JA02QQ','JA03QQ'][i];});return s;}
let state=fresh(),date=START,storageOK=true;
try{const saved=localStorage.getItem('toki-dec2026-v1');if(saved)state=migrateAircraftNames(validate(expandDates(JSON.parse(saved))));}catch(e){storageOK=false;}
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',4000);}
function save(){try{localStorage.setItem('toki-dec2026-v1',JSON.stringify(state));storageOK=true;}catch(e){storageOK=false;}$('storage').textContent=storageOK?'':' ブラウザーへの自動保存が利用できません。ファイル保存を使ってください。';}
const airportOptions=value=>Object.entries(airports).map(([id,label])=>`<option value="${id}" ${id===value?'selected':''}>${label}</option>`).join('');
const airportOptionsForFlight=(value,direction)=>Object.entries(airports).filter(([id])=>!Toki.airportChoices?.[direction]||Toki.airportChoices[direction].includes(id)||id===value).map(([id,label])=>`<option value="${id}" ${id===value?'selected':''}>${label}</option>`).join('');
const machineOptions=value=>`<option value="">未割り当て</option>`+state.machines.map(m=>`<option value="${m.id}" ${m.id===value?'selected':''}>${esc(m.name)}${m.type?' ／ '+esc(m.type):''}</option>`).join('');
const barColor=f=>f.color||({OKD:'#5373af',NGO:'#e4c13b',UKB:'#739b35'}[f.from==='KIJ'?f.to:f.from]||'#5373af');
const barPalette=[['#c81827','赤'],['#df6b31','オレンジ'],['#b8860b','黄土'],['#e4c13b','黄'],['#739b35','黄緑'],['#378251','緑'],['#2e8b82','青緑'],['#356f80','ティール'],['#419dc1','水色'],['#5373af','青'],['#283b72','紺'],['#7654a4','紫'],['#b3558b','ピンク'],['#a8743e','茶'],['#6c7888','グレー'],['#f08a91','ライトレッド'],['#ef9d65','アプリコット'],['#e1b874','サンド'],['#f4db75','ライトイエロー'],['#b3cf70','ライト黄緑'],['#78b88b','ライトグリーン'],['#78c8b6','ミント'],['#70a5b6','ライトティール'],['#8bcbe1','スカイブルー'],['#8fa9d6','ライトブルー'],['#596a9b','ブルーグレー'],['#b09bcf','ラベンダー'],['#db94b6','ローズ'],['#c39d82','ベージュ'],['#a8b1bd','ライトグレー']];
function colorChoices(f){
 const value=barColor(f).toLowerCase(),choices=[...barPalette];
 if(!choices.some(([color])=>color===value))choices.push([value,'']);
 const name=choices.find(([color])=>color===value)?.[1]||'色';
 return `<button type="button" class="bar-color-select" data-color-picker="${esc(f.id)}" aria-label="${esc(f.id)}のバー色：${name}" aria-haspopup="dialog"><i style="background:${value}"></i>${name}<span>▾</span></button>`;
}
function barText(color){const rgb=color.slice(1).match(/../g).map(x=>{const v=parseInt(x,16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});const l=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;return l>.179?'#142033':'#ffffff';}
function currentFlights(){
 if(!Array.isArray(state.flights)){
  const active=(state.periods||[]).find(p=>p.id===state.editingPeriodId);
  const source=active?.flights||(state.days[date]?.length?state.days[date]:Object.values(state.days).find(fs=>fs.length))||[];
  state.flights=structuredClone(source);
 }
 if(state.periods?.length>1){
  const first=state.periods[0],ranges=state.periods.flatMap(p=>p.ranges||[{start:p.start,end:p.end}]);
  first.ranges=ranges;first.start=ranges.map(r=>r.start).sort()[0];first.end=ranges.map(r=>r.end).sort().at(-1);first.dates=[...new Set(state.periods.flatMap(p=>p.dates))].sort();first.flights=structuredClone(state.flights);state.periods=[first];state.editingPeriodId=first.id;
 }
 return state.flights;
}
const collapsedFlightRoutes=new Set();
function flightRouteKey(f){return f.aircraft||'unassigned';}
function render(){
 const known=date.startsWith('2026-12-');
 $('reset').disabled=!known;
 const fs=[...(Toki.dateViewUnset&&!Toki.charterMode?[]:currentFlights()).map(f=>typeof displayedRegularFlight==='function'?displayedRegularFlight(f):f),...(Toki.charterMode?[]:Toki.charterFlights?.(date)||[])],base=schedule(date),issues=Toki.pendingIssues(check(fs,state.machines,state.turn,(Toki.fleetEvents||[]),date,state.constraints||[]),{...state,flights:fs},Toki.fleetEvents||[],date),bad=new Set(issues.filter(i=>i.type==='error').flatMap(i=>i.ids)),used=new Set(fs.map(f=>f.aircraft).filter(Boolean)).size;
 $('date').value=date;$('weekday').textContent=new Date(date+'T12:00:00+09:00').toLocaleDateString('ja-JP',{weekday:'long',timeZone:'Asia/Tokyo'});$('prev').disabled=date===START;$('next').disabled=date===END;
 $('period').textContent=!date.startsWith('2026-12-')?'':Number(date.slice(8))<5?'12月1〜4日の公表ダイヤ':'12月5日以降の公表ダイヤ（曜日・特定日を反映）';
 const block=fs.reduce((s,f)=>s+Math.max(0,minutes(f.arr)-minutes(f.dep)),0),baseBlock=base.reduce((s,f)=>s+minutes(f.arr)-minutes(f.dep),0);
 const allIssues=check(fs,state.machines,state.turn,Toki.fleetEvents||[],date,state.constraints||[]),acceptedIssues=allIssues.filter(i=>!Toki.pendingIssues([i],{...state,flights:fs},Toki.fleetEvents||[],date).length);
 $('stats').innerHTML=[['運航便数',fs.length+' 便',known?`公表 ${base.length}便 ／ 差分 ${fs.length-base.length>=0?'+':''}${fs.length-base.length}`:''],['割り当て機数',used+' / '+state.machines.length,`未割り当て ${fs.filter(f=>!f.aircraft).length}便`],['総運航時間',`${Math.floor(block/60)}時間${block%60}分`,known?`公表との差 ${block-baseBlock>=0?'+':''}${block-baseBlock}分`:''],['チェック',issues.length+' 件',`不整合 ${issues.filter(i=>i.type==='error').length} ／ 翌日確認 ${issues.filter(i=>i.type==='warning').length}${acceptedIssues.length?' ／ Accept済 '+acceptedIssues.length+'件':''}`]].map(([label,value,sub])=>`<div class="stat"><small>${label}</small><strong>${value}</strong>${label==='チェック'&&issues.length?'<button id="accept-issues" class="accept-issues">Accept</button>':''}<small>${sub}</small></div>`).join('');
 const axis=`<div class="axis"><span>機材 ／ 開始空港</span><div class="hours">${Array.from({length:17},(_,i)=>`<span>${String(i+6).padStart(2,'0')}</span>`).join('')}</div></div>`;
 $('timeline').innerHTML=axis+[...state.machines,{id:'',name:'未割り当て',start:''}].map(m=>{
  const maintenance=(Toki.fleetEvents||[]).filter(e=>e.aircraft===m.name&&e.start<=date&&date<=e.end);
  const rows=fs.filter(f=>f.aircraft===m.id).sort((a,b)=>minutes(a.dep)-minutes(b.dep));
  // Assign overlapping flights to separate visual layers so every flight remains clickable.
  const ends=[],barLayers=new Map();const bars=rows.map(f=>{let layer=ends.findIndex(n=>n<=minutes(f.dep));if(layer<0)layer=ends.length;ends[layer]=Math.max(minutes(f.arr),minutes(f.dep)+1);barLayers.set(f.id,layer);const left=(minutes(f.dep)-360)/960*100,width=Math.max(0.3,(minutes(f.arr)-minutes(f.dep))/960*100),route=f.from==='KIJ'?f.to:f.from;
   const out=left<0||left+width>100||minutes(f.arr)<=minutes(f.dep);const visualLeft=Math.max(0,Math.min(97,left)),visualWidth=Math.max(3,Math.min(100-visualLeft,width));return `<button draggable="${Toki.charterMode?!!f.charter:!f.charter}" class="flight ${f.aircraftChanged?'aircraft-substituted':''} ${f.charter?'charter-flight':''} route-${route} ${bad.has(f.id)?'bad':''}" style="left:${visualLeft}%;width:${visualWidth}%;top:${8+layer*64}px;background-color:${barColor(f)};color:${barText(barColor(f))};${f.aircraftChanged?'border:3px solid #16a34a!important;':''}" ${(Toki.charterMode?!f.charter:f.charter)?'data-charter-bar="true"':`data-focus="${esc(f.id)}"`} title="${esc(f.id)} ${airports[f.from]} → ${airports[f.to]} ${f.dep}–${f.arr}${out?'（表示範囲外・時刻を確認）':''}${f.aircraftChanged?' ／ 機材変更：'+esc(state.machines.find(m=>m.id===f.originalAircraft)?.name||'未割当')+' → '+esc(state.machines.find(m=>m.id===f.aircraft)?.name||'未割当'):''}"><span class="flight-bar-line">${f.from} - ${f.to}</span><span class="flight-bar-line">${f.dep} - ${f.arr}</span><span class="flight-bar-line flight-bar-block"><b>${esc(f.id)}</b> <span>${f.blockUnset?'':formatBlock(minutes(f.arr)-minutes(f.dep))}</span></span></button>`;}).join('');
  const gaps=m.id?rows.slice(1).map((next,i)=>{const prev=rows[i],end=minutes(prev.arr),start=minutes(next.dep),gap=start-end;if(Math.max(start,end)<360||Math.min(start,end)>1320)return '';const center=Math.max(1,Math.min(99,((end+start)/2-360)/960*100)),invalid=gap<state.turn||prev.to!==next.from;const label=gap<0?'重複'+Math.abs(gap):String(gap);const title=`${prev.id} → ${next.id}：${label}${prev.to!==next.from?'（到着・出発空港が不一致）':''}`;return `<input type="text" inputmode="numeric" class="flight-gap ${invalid?'gap-short':''}" data-gap-prev="${esc(prev.id)}" data-gap-next="${esc(next.id)}" value="${gap}" maxlength="5" aria-label="${esc(prev.id)}から${esc(next.id)}までの便間（分）" style="left:${center}%;top:${8+(barLayers.get(next.id)||0)*64+20}px" title="${esc(title)}">`;}).join(''):'';
  const servicing=maintenance.some(e=>e.type==='maintenance'||e.type==='inspection'||e.type==='airworthiness');
  return `<div class="lane ${servicing?'maintenance-lane':''}" style="min-height:${Math.max(78,ends.length*64+14)}px"><div class="lane-label"><strong>${esc(m.name)}</strong>${m.type?`<span class="muted">${esc(m.type)}</span><br>`:''}<span class="muted">${airports[m.start]||'機材を選択'} ／ ${rows.length}便</span>${maintenance.map(e=>`<span class="aircraft-event-tag ${e.blocks?'event-blocking':''}">${esc(e.title)}</span>`).join('')}</div><div class="track" data-aircraft="${m.id}">${bars}${gaps}</div></div>`;
 }).join('');
 const flightGroups=new Map();fs.forEach((f,i)=>{if(Toki.charterMode&&!f.charter)return;const key=flightRouteKey(f);if(!flightGroups.has(key))flightGroups.set(key,[]);flightGroups.get(key).push({f,i});});
 const nextFlightById=new Map();for(const entries of flightGroups.values()){const ordered=[...entries].sort((a,b)=>minutes(a.f.dep)-minutes(b.f.dep));ordered.forEach((entry,index)=>{if(ordered[index+1])nextFlightById.set(entry.f.id,ordered[index+1].f);});}
 $('flights').innerHTML=[...flightGroups].sort(([a,af],[b,bf])=>{if(Toki.charterMode){const priority=Number(bf.some(e=>e.f.charter))-Number(af.some(e=>e.f.charter));if(priority)return priority;}const order=state.machines.map(m=>m.id);return (a==='unassigned'?999:order.indexOf(a))-(b==='unassigned'?999:order.indexOf(b));}).map(([key,entries])=>{const collapsed=collapsedFlightRoutes.has(key),machine=state.machines.find(m=>m.id===key);entries.sort((a,b)=>(Toki.charterMode?Number(!!b.f.charter)-Number(!!a.f.charter):0)||minutes(a.f.dep)-minutes(b.f.dep));
 return `<tr class="flight-route-heading"><td colspan="10"><button type="button" data-toggle-route="${key}" aria-expanded="${!collapsed}"><span class="route-chevron">${collapsed?'▸':'▾'}</span><strong>${esc(machine?machine.name:'未割り当て')}${machine?.type?' ／ '+esc(machine.type):''}</strong><span class="route-flight-count">${entries.length}便</span></button></td></tr>`+entries.map(({f,i},position)=>(Toki.charterMode?!f.charter:f.charter)?`<tr class="charter-edit-row"><td>${esc(f.id)}</td><td>${esc(airports[f.from])}</td><td>${esc(airports[f.to])}</td><td>—</td><td>${f.dep}</td><td>${formatBlock(minutes(f.arr)-minutes(f.dep))}</td><td>${f.arr}</td><td>${esc(machine?.name||'未割り当て')}</td><td colspan="2">${Toki.charterMode?(f.readOnlyCharter?'別コードのチャーター（表示のみ）':'定期便（編集不可）'):'チャーター設定で編集'}</td></tr>`:`<tr data-index="${i}" ${collapsed?'hidden':''}><td><span class="flight-number-field"><span class="flight-number-prefix" aria-hidden="true">BV</span><input class="code" data-key="id" value="${esc(f.id.replace(/^BV/i,''))}" aria-label="便名の数字（BVは固定）" inputmode="numeric" pattern="[0-9]+" maxlength="${Toki.charterMode?22:6}"></span></td><td><select data-key="from" aria-label="出発空港">${airportOptionsForFlight(f.from,'from')}</select></td><td><select data-key="to" aria-label="到着空港">${airportOptionsForFlight(f.to,'to')}</select></td><td>${machine&&nextFlightById.has(f.id)&&(!Toki.charterMode||nextFlightById.get(f.id).charter)?`<input class="table-flight-gap" data-key="gap" type="text" inputmode="numeric" maxlength="5" value="${minutes(nextFlightById.get(f.id).dep)-minutes(f.arr)}" aria-label="${esc(f.id)}の次便までの便間（分）">`:'—'}</td><td><input type="time" data-key="dep" value="${f.dep}" aria-label="出発時刻"></td><td><input type="text" data-key="block" value="${f.blockUnset?'':formatBlock(minutes(f.arr)-minutes(f.dep))}" placeholder="" maxlength="8" aria-label="ブロックタイム（時間＋分）" class="block-time"></td><td><output aria-label="到着時刻（自動計算）">${f.blockUnset?'':f.arr}</output></td><td><select data-key="aircraft" aria-label="使用機材">${machineOptions(f.aircraft)}</select></td><td>${colorChoices(f)}</td><td><button data-delete="${i}" aria-label="${esc(f.id)}を削除">削除</button></td></tr>`).join('');}).join('');
 $('turn').value=state.turn;$('count').innerHTML=Array.from({length:10},(_,i)=>`<option ${state.machines.length===i+1?'selected':''}>${i+1}</option>`).join('');
 $('machines').innerHTML=state.machines.map((m,i)=>`<div class="machine" style="margin:8px 0"><input data-machine="${i}" data-field="name" value="${esc(m.name)}" aria-label="機材名" maxlength="40"><select data-machine="${i}" data-field="type" aria-label="機種"><option value="">未設定</option>${['ATR72','ATR42'].map(t=>`<option ${m.type===t?'selected':''}>${t}</option>`).join('')}</select><label>出発空港 <select data-machine="${i}" data-field="start" aria-label="出発空港">${airportOptions(m.start)}</select></label><label>到着空港 <select data-machine="${i}" data-field="end" aria-label="最終到着空港">${airportOptions(m.end||m.start)}</select></label></div>`).join('');
 $('issue-count').textContent=issues.length+'件 ／ Accept済 '+acceptedIssues.length+'件';$('issues').innerHTML=issues.map(i=>`<div class="issue ${i.type}">${esc(i.text)}</div>`).join('')+acceptedIssues.map((i,index)=>`<div class="issue accepted-issue"><span class="accepted-issue-badge">✓ Accept済</span><span>${esc(i.text)}</span><button data-revoke-accept="${index}">Acceptを取消</button></div>`).join('')+(!allIssues.length?'<div class="good">設定した条件内で、当日の不整合はありません。</div>':'');
 const changes=[];for(const b of base){const f=fs.find(f=>f.id===b.id);if(!f)changes.push(`${b.id}：削除`);else{const parts=['from','to','dep','arr'].filter(k=>f[k]!==b[k]).map(k=>`${({from:'出発地',to:'到着地',dep:'出発',arr:'到着'})[k]} ${airports[b[k]]||b[k]} → ${airports[f[k]]||f[k]}`);if(parts.length)changes.push(`${b.id}：${parts.join(' ／ ')}`);}}for(const f of fs)if(!base.some(b=>b.id===f.id))changes.push(`${f.id}：追加 ${airports[f.from]} → ${airports[f.to]} ${f.dep}–${f.arr}`);
 $('diff').innerHTML=!known?'<span class="muted">この月の公表ダイヤは未収録のため比較できません。</span>':changes.length?changes.map(c=>`<p style="font-size:12px;margin:8px 0">${esc(c)}</p>`).join(''):'<span class="muted">便名・路線・時刻は公表ダイヤと同じです。機材割り当ては比較に含みません。</span>';
 $('storage').textContent=storageOK?'':' ブラウザーへの自動保存が利用できません。ファイル保存を使ってください。';
}
function commit(){Toki.dateViewUnset=false;save();render();}
$('date').onchange=e=>{if(validDate(e.target.value)){date=e.target.value;render();}else{$('date').value=date;toast('2026年4月1日〜2036年3月31日の日付を選んでください。');}};
function step(n){const next=new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);if(validDate(next)){date=next;render();}}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
$('flights').onchange=e=>{const key=e.target.dataset.key;if(!key)return;const i=Number(e.target.closest('tr').dataset.index),old={...currentFlights()[i]};try{const value=e.target.value.trim(),flight=currentFlights()[i];if(key==='gap'){if(!/^-?\d{1,4}$/.test(value))throw Error('便間は分単位の整数で入力してください。');const rows=currentFlights().filter(f=>f.aircraft===flight.aircraft).sort((a,b)=>minutes(a.dep)-minutes(b.dep)),position=rows.indexOf(flight),next=rows[position+1];if(!flight.aircraft||!next)throw Error('次便のある機体割り当て済みの便を選んでください。');const start=minutes(flight.arr)+Number(value);if(start<0||start>1439)throw Error('同日内に収まる便間を入力してください。');if(Toki.charterMode&&!next.charter)throw Error('定期便は変更できません。');const dep=clock(start),arr=arrival(dep,minutes(next.arr)-minutes(next.dep));next.dep=dep;next.arr=arr;}else if(key==='block'){if(!value)throw Error('ブロックタイムを入力してください。');flight.arr=arrival(flight.dep,parseBlock(value));delete flight.blockUnset;}else if(key==='dep'){const block=minutes(old.arr)-minutes(old.dep);flight.arr=arrival(value,block);flight.dep=value;}else if(key==='id'){if(Toki.charterMode){const code=value.normalize('NFKC').toUpperCase();if(!/^[A-Z0-9][A-Z0-9 _-]{0,21}$/.test(code))throw Error('チャーター便名は英数字・ハイフンで入力してください。');flight.id=/^\d+$/.test(code)?'BV'+code:code.startsWith('BV')?code:'BV'+code;if(Toki.applyFlightDefaults)Toki.applyFlightDefaults(flight);}else{const number=value.normalize('NFKC').toUpperCase().replace(/^BV/,'');if(!/^\d{1,6}$/.test(number))throw Error('便名は数字1〜6桁で入力してください。');flight.id='BV'+number;if(Toki.applyFlightDefaults)Toki.applyFlightDefaults(flight);}}else{flight[key]=value;}validate(state);commit();}catch(err){currentFlights()[i]=old;if(key==='block'){e.target.value=old.blockUnset?'':formatBlock(minutes(old.arr)-minutes(old.dep));}else{render();}toast(err.message);}};
$('flights').onclick=e=>{const group=e.target.closest('[data-toggle-route]');if(group){const key=group.dataset.toggleRoute;if(collapsedFlightRoutes.has(key))collapsedFlightRoutes.delete(key);else collapsedFlightRoutes.add(key);render();return;}const b=e.target.closest('[data-delete]');if(b&&confirm('この便を当日の検討案から削除しますか？')){currentFlights().splice(Number(b.dataset.delete),1);commit();}};
$('timeline').onclick=e=>{if(Date.now()<suppressBarClickUntil)return;const b=e.target.closest('[data-focus]');if(!b)return;const i=currentFlights().findIndex(f=>f.id===b.dataset.focus),row=$('flights').querySelector(`[data-index="${i}"]`);row.scrollIntoView({behavior:'smooth',block:'center'});row.querySelector('input').focus();};
$('turn').onchange=e=>{const v=Number(e.target.value);if(!Number.isInteger(v)||v<0||v>240){render();toast('折り返し時間は0〜240分の整数で設定してください。');return;}state.turn=v;commit();};
$('count').onchange=e=>{const count=Number(e.target.value);if(count<state.machines.length&&!confirm('機材を減らすと、削除される機材の便は全日で未割り当てになります。続けますか？')){render();return;}state.machines=Array.from({length:count},(_,i)=>state.machines[i]||{id:'M'+(i+1),name:['JA01QQ','JA02QQ','JA03QQ'][i]||'検討機 '+(i+1),type:['ATR72','ATR72','ATR42'][i]||'',start:'KIJ'});const ids=new Set(state.machines.map(m=>m.id));Object.values(state.days).flat().forEach(f=>{if(!ids.has(f.aircraft))f.aircraft='';});commit();};
$('machines').onchange=e=>{if(e.target.dataset.machine===undefined)return;const v=e.target.value.trim();if(!v&&e.target.dataset.field==='name'){render();toast('機材名を入力してください。');return;}state.machines[Number(e.target.dataset.machine)][e.target.dataset.field]=v;commit();};
$('auto').onclick=()=>{if(!confirm('当日の機材割り当てを自動割り当てで置き換えますか？'))return;state.flights=assign(currentFlights(),state.machines,state.turn,(Toki.fleetEvents||[]),date);commit();toast('当日の機材を割り当てました。未割り当てとチェック結果を確認してください。');};
$('reset').onclick=()=>{if(confirm('当日の便・時刻・機材割り当てを初期状態に戻しますか？')){state.flights=assign(schedule(date),state.machines,state.turn);commit();}};
$('add').onclick=()=>{if(currentFlights().some(f=>f.id==='BV')){toast('追加済みの便に便名の数字を入力してください。');return;}currentFlights().push({id:'BV',from:Toki.newFlightAirports?.from||'KIJ',to:Toki.newFlightAirports?.to||'NGO',dep:'12:00',arr:'13:20',aircraft:'',blockUnset:true});commit();};
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('download').onclick=()=>download('TOKI-2026-2036-検討案.json',JSON.stringify(state,null,2),'application/json');
$('upload').onclick=()=>$('file').click();$('file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>50000000)throw Error('ファイルが大きすぎます。');const next=migrateAircraftNames(validate(expandDates(JSON.parse(await file.text()))));if(confirm('現在の全日分の検討案を、ファイルの内容で置き換えますか？')){state=next;commit();toast('検討案を読み込みました。');}}catch(err){toast('読み込めません：'+err.message);}e.target.value='';};
const csvCell=s=>'"'+String(s).replace(/^[=+@\-\t\r]/,'\'$&').replace(/"/g,'""')+'"';
$('csv').onclick=()=>{const rows=[['日付','便名','出発空港','到着空港','出発時刻(JST)','ブロックタイム(時間+分)','到着時刻(JST)','検討機','機種','最低折り返し(分)','祝日']];for(const [d,fs] of Object.entries(state.days).filter(([d])=>d.startsWith(date.slice(0,7))))for(const f of fs)rows.push([d,f.id,airports[f.from],airports[f.to],f.dep,formatBlock(minutes(f.arr)-minutes(f.dep)),f.arr,state.machines.find(m=>m.id===f.aircraft)?.name||'未割り当て',state.machines.find(m=>m.id===f.aircraft)?.type||'',state.turn,Toki.holiday(d)?Toki.holiday(d).name+(Toki.holiday(d).provisional?'（暫定）':''):'']);download('TOKI-'+date.slice(0,7)+'-月間.csv','\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');};
render();

$('excel').onclick=()=>{try{download('TOKI-'+date.slice(0,7)+'-検討結果.xlsx',exportTokiExcel({...state,events:(Toki.fleetEvents||[]),days:Object.fromEntries(Object.entries(state.days).filter(([d])=>d.startsWith(date.slice(0,7))))},Toki),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');toast('表示月の検討結果をExcelファイルに出力しました。');}catch(err){toast('Excel出力に失敗しました：'+err.message);}};
