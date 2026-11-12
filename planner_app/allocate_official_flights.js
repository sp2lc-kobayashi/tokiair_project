// Planning allocation only; not a claim about actual operated registrations.
function allocateOfficialFlights(flights,machines,turn,events,day){
 const sorted=structuredClone(flights).sort((a,b)=>minutes(a.dep)-minutes(b.dep)),positions=machines.map(m=>({id:m.id,at:m.start,ready:0,blocked:events.some(e=>e.blocks&&e.aircraft===m.name&&e.start<=day&&day<=e.end)}));
 let best=[],bestCount=-1,bestHome=-1;const path=[];
 function search(i,count){
  if(count+sorted.length-i<bestCount)return;
  if(i===sorted.length){const home=positions.filter((p,j)=>p.at===(machines[j].end||machines[j].start)).length;if(count>bestCount||count===bestCount&&home>bestHome){bestCount=count;bestHome=home;best=path.slice();}return;}
  const f=sorted[i],seen=new Set();
  for(const pos of positions){if(f.charter&&machines.find(m=>m.id===pos.id)?.type!=='ATR42')continue;const equivalent=(machines.find(m=>m.id===pos.id)?.type||'')+':'+pos.at+':'+pos.ready+':'+pos.blocked;if(seen.has(equivalent))continue;seen.add(equivalent);if(pos.blocked||pos.at!==f.from||pos.ready>minutes(f.dep))continue;
   const previous={...pos};pos.at=f.to;pos.ready=minutes(f.arr)+turn;path.push(pos.id);search(i+1,count+1);path.pop();Object.assign(pos,previous);
  }
  if(count+sorted.length-i-1>=bestCount){path.push('');search(i+1,count);path.pop();}
 }
 search(0,0);return sorted.map((f,i)=>({...f,aircraft:best[i]||''}));
}
function autoAllocateOfficial2026(){
 const marker='toki-official2026-allocation-v1';if(localStorage.getItem(marker)||!libraryWritable)return;
 capturePlan();const before=structuredClone(planLibrary);let count=0,unassigned=0;
 try{
  for(const plan of planLibrary.items){const data=plan.data;if(!data.officialSource||data.season?.year!==2026)continue;
   const period=data.periods?.[0];if(!period)continue;
   const events=Toki.fleetEvents||[],blocked=events.filter(e=>e.blocks&&period.dates.some(d=>e.start<=d&&d<=e.end));
   // One pattern per code: avoid every machine unavailable on any applied date.
   const machines=data.machines,unavailable=new Set(blocked.map(e=>e.aircraft));
   const synthetic=machines.filter(m=>unavailable.has(m.name)).map((m,i)=>({aircraft:m.name,blocks:true,start:period.dates[0],end:period.dates[0]}));
   const fs=allocateOfficialFlights(data.flights||period.flights||[],machines,data.turn,synthetic,period.dates[0]);
   data.flights=fs;period.flights=structuredClone(fs);period.machines=structuredClone(machines);period.turn=data.turn;
   for(const day of period.dates)data.days[day]=structuredClone(fs);
   data.allocationSource='automatic-planning';count+=fs.length;unassigned+=fs.filter(f=>!f.aircraft).length;
  }
  if(!persistLibrary())throw Error('保存できませんでした。');
  const current=selectedPlan();if(current?.data?.officialSource&&current.data.season?.year===2026){state=migrateAircraftNames(validate(expandDates(structuredClone(current.data))));periodLoadedState=null;saveBeforeLibrary();}
  localStorage.setItem(marker,'1');render();refreshPeriods();renderSidebar();toast('2026年公表ダイヤの機材を自動割り当てしました。'+(unassigned?'未割り当て便はチェックに表示しています。':''));
 }catch(e){planLibrary=before;persistLibrary();toast('機材割当を中止しました：'+e.message);}
}
autoAllocateOfficial2026();
