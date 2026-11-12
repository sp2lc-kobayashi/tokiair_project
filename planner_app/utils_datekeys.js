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
