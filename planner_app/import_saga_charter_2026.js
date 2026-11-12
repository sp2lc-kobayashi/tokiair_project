function importSagaCharter2026(){
 const marker='toki-saga-charter-20261124-v2';if(!libraryWritable)return;
 const days=['2026-11-24','2026-11-26'];const present=days.every(day=>calendarCharterFlights(day).some(f=>f.from==='KIJ'&&f.to==='HSG')&&calendarCharterFlights(day).some(f=>f.from==='HSG'&&f.to==='KIJ'));if(localStorage.getItem(marker)&&present)return;if(present){localStorage.setItem(marker,'1');return;}
 const season=seasonRange(2026,'W'),used=usedSeasonLetters(season.key),letters=[...Array.from({length:26},(_,i)=>String.fromCharCode(65+i)),...Array.from({length:999},(_,i)=>'A'+(i+1))].filter(l=>!used.has(l));
 if(letters.length<2||planLibrary.items.length>98){toast('佐賀チャーター取込用の空きコードが不足しています。');return;}
 capturePlan();const before=structuredClone(planLibrary),previousAirports={...airports};
 try{
 if(!localStorage.getItem('toki-before-saga-charter-backup'))localStorage.setItem('toki-before-saga-charter-backup',JSON.stringify(planLibrary));
 airports.HSG=airports.HSG||'佐賀';localStorage.setItem('toki-airports-v1',JSON.stringify(airports));
 const choices=structuredClone(Toki.airportChoices);for(const key of ['from','to'])if(!choices[key].includes('HSG'))choices[key].push('HSG');localStorage.setItem('toki-airport-choices-v1',JSON.stringify(choices));Toki.airportChoices=choices;
 const rows=[['2026-11-24','07:35','10:15','10:55','13:05'],['2026-11-26','14:40','17:20','18:00','20:10']];
 rows.forEach(([day,dep1,arr1,dep2,arr2],index)=>{
 const owner=Toki.assignedPlanId?.(day),base=planLibrary.items.find(p=>p.id===owner),data=base?expandDates(structuredClone(base.data)):fresh();
 const regular=structuredClone((base?.data.days[day]||schedule(day)).filter(f=>!f.charter)),charters=[{id:'CHT'+day.replaceAll('-','')+'A',from:'KIJ',to:'HSG',dep:dep1,arr:arr1},{id:'CHT'+day.replaceAll('-','')+'B',from:'HSG',to:'KIJ',dep:dep2,arr:arr2}].map(f=>({...f,aircraft:'',charter:true,flightNumberPublished:false,color:'#8058a5',source:'https://tokiair.com/news/7189/'}));
 const flights=allocateOfficialFlights([...regular,...charters],data.machines,data.turn,Toki.fleetEvents||[],day),id=planId(),pid='P'+id.slice(1),name=letters[index];
 for(const key of Object.keys(data.days))data.days[key]=[];data.days[day]=structuredClone(flights);data.flights=flights;data.season=season;data.acceptedIssueKeys=[];data.editingPeriodId=pid;
 data.periods=[{id:pid,name,start:day,end:day,ranges:[{start:day,end:day}],weekdays:[0,1,2,3,4,5,6],dates:[day],flights:structuredClone(flights),machines:structuredClone(data.machines),turn:data.turn,constraints:structuredClone(data.constraints||[])}];
 data.charterSource={url:'https://tokiair.com/news/7189/',published:'2026-09-25',type:'ATR42-600',note:'便名未公表。機番割当は検討用。'};
 validate(data);planLibrary.items.push({id,name,seasonKey:season.key,date:day,updated:new Date().toISOString(),data:compactPlan(data)});planLibrary.assignments[day]=id;
 });
 if(!persistLibrary())throw Error('保存できませんでした。');render();renderSidebar();renderAirportMaster();renderAirportChoices();const charterPlan=planLibrary.items.find(p=>p.id===planLibrary.assignments['2026-11-24']);if(charterPlan)openPlan(charterPlan.id);localStorage.setItem(marker,'1');toast('11月24日・26日の新潟―佐賀チャーターを取り込みました。');
 }catch(e){planLibrary=before;Object.assign(airports,previousAirports);persistLibrary();toast('チャーター取込を中止しました：'+e.message);}
}
// Replaced by independent charter storage.
