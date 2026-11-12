// Official W26 baseline: TOKI AIR release of 2026-08-06. Registrations not published.
function importOfficialW26(){
 const marker='toki-official-w26-20260806';if(localStorage.getItem(marker))return;
 const season=seasonRange(2026,'W'),groups=new Map();
 for(const day of Toki.dateKeys().filter(d=>d>=season.from&&d<=season.to)){
  const flights=schedule(day),key=JSON.stringify(flights);if(!groups.has(key))groups.set(key,{flights,dates:[]});groups.get(key).dates.push(day);
 }
 const used=usedSeasonLetters(season.key),letters=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).filter(l=>!used.has(l));
 if(letters.length<groups.size||planLibrary.items.length+groups.size>100){toast('公表ダイヤ取込用の空きダイヤコードが足りません。');return;}
 capturePlan();let index=0,firstId;
 for(const group of groups.values()){
  const name=letters[index++],id=planId(),data=fresh(),ranges=[];
  for(const day of Object.keys(data.days))data.days[day]=[];
  for(const day of group.dates){data.days[day]=structuredClone(group.flights);const last=ranges.at(-1);if(last&&Date.parse(day+'T00:00:00Z')-Date.parse(last.end+'T00:00:00Z')===86400000)last.end=day;else ranges.push({start:day,end:day});}
  const pid='Pofficial'+id.toLowerCase();data.season=season;data.flights=structuredClone(group.flights);data.periods=[{id:pid,name,start:group.dates[0],end:group.dates.at(-1),ranges,weekdays:[0,1,2,3,4,5,6],dates:group.dates,flights:structuredClone(group.flights),machines:structuredClone(data.machines),turn:data.turn}];data.editingPeriodId=pid;
  data.officialSource={url:'https://prtimes.jp/main/html/rd/p/000000137.000143251.html',published:'2026-08-06'};
  planLibrary.items.push({id,name,seasonKey:season.key,date:group.dates[0],updated:new Date().toISOString(),data:compactPlan(data)});
  for(const day of group.dates)planLibrary.assignments[day]=id;
  if(!firstId)firstId=id;
 }
 persistLibrary();localStorage.setItem(marker,'1');renderSidebar();toast('W26の公表ダイヤを取り込みました。機番は未割り当てです。');
}
// Superseded by complete 2026 importer.

// Restore visibility of existing 2027 alternatives after the initial W26 import.
if(!localStorage.getItem('toki-w26-view-recovery-v1')){
 const previous=planLibrary.items.find(p=>p.name==='A'&&p.data?.season?.year===2027&&p.data?.season?.kind==='S')||planLibrary.items.find(p=>p.name==='A'&&p.data?.season?.year===2027);
 if(previous&&selectedPlan()?.data?.officialSource){openPlan(previous.id);toast('2027年のダイヤコードを表示しました。');}
 localStorage.setItem('toki-w26-view-recovery-v1','1');
}
