function importOfficial2026(){
 const marker='toki-official-2026-complete-v1';if(localStorage.getItem(marker))return;
 // Preserve the exact existing library before adding baseline alternatives.
 try{const raw=localStorage.getItem(LIBRARY_KEY);if(raw&&!localStorage.getItem('toki-before-official2026-backup'))localStorage.setItem('toki-before-official2026-backup',raw);}catch(e){toast('バックアップを保存できないため公表ダイヤ取込を中止しました。');return;}
 if(!libraryWritable){toast('保存済み一覧の復旧が必要なため、公表ダイヤは取り込んでいません。');return;}
 capturePlan();const batches=[];
 for(const kind of ['S','W']){
  const season=seasonRange(2026,kind),groups=new Map();
  for(const day of Toki.dateKeys().filter(d=>d>=season.from&&d<=season.to)){const flights=schedule(day),key=JSON.stringify(flights);if(!groups.has(key))groups.set(key,{flights,dates:[]});groups.get(key).dates.push(day);}
  const used=usedSeasonLetters(season.key),letters=Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).filter(l=>!used.has(l));
  if(letters.length<groups.size){toast(season.key+'の空きコード不足のため取込を中止しました。');return;}
  batches.push({season,groups,letters});
 }
 if(planLibrary.items.length+batches.reduce((n,b)=>n+b.groups.size,0)>100){toast('ダイヤ一覧の空きが不足しています。');return;}
 const before=structuredClone(planLibrary);
 try{
 for(const {season,groups,letters} of batches){let index=0;
 for(const {flights,dates} of groups.values()){
  const name=letters[index++],id=planId(),pid='P'+id.slice(1),data=fresh(),ranges=[];
  for(const day of Object.keys(data.days))data.days[day]=[];
  for(const day of dates){data.days[day]=structuredClone(flights);const last=ranges.at(-1);if(last&&Date.parse(day+'T00:00:00Z')-Date.parse(last.end+'T00:00:00Z')===86400000)last.end=day;else ranges.push({start:day,end:day});}
  data.season=season;data.flights=structuredClone(flights);data.periods=[{id:pid,name,start:dates[0],end:dates.at(-1),ranges,weekdays:[0,1,2,3,4,5,6],dates,flights:structuredClone(flights),machines:structuredClone(data.machines),turn:data.turn,constraints:[]}];data.editingPeriodId=pid;
  data.officialSource={url:'https://tokiair.com/schedules/',sources:['https://tokiair.com/news/6448/','https://tokiair.com/news/6577/','https://tokiair.com/news/6715/','https://tokiair.com/news/6735/','https://tokiair.com/news/6856/','https://tokiair.com/news/6806/','https://tokiair.com/news/7016/'],checked:'2026-10-25',noFlights:flights.length===0};
  validate(data);planLibrary.items.push({id,name,seasonKey:season.key,date:dates[0],updated:new Date().toISOString(),data:compactPlan(data)});
  for(const day of dates)planLibrary.assignments[day]=id;
 }
 }
 if(!persistLibrary())throw Error('公表ダイヤを保存できませんでした。');localStorage.setItem(marker,'1');render();renderSidebar();toast('2026年夏・冬の公表ダイヤを取り込みました。既存コードは保持しています。');
 }catch(e){planLibrary=before;persistLibrary();toast('取込を中止しました：'+e.message);}
}
importOfficial2026();
