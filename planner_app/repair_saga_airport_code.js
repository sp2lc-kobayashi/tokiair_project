// Repair only the imported Saga charter, preserving genuine Sado flights.
(function repairSagaAirportCode(){
 const isSaga=c=>c.source==='https://tokiair.com/news/7189/'||/^Csaga/.test(c.recordId||'');
 const fix=records=>records.map(c=>isSaga(c)&&(c.from==='SDS'||c.to==='SDS')?{...c,from:c.from==='SDS'?'HSG':c.from,to:c.to==='SDS'?'HSG':c.to}:c);
 const draft=fix(charterRecords),applied=fix(appliedCharterRecords);
 if(JSON.stringify(draft)===JSON.stringify(charterRecords)&&JSON.stringify(applied)===JSON.stringify(appliedCharterRecords))return;
 const oldDraft=charterRecords,oldApplied=appliedCharterRecords;
 try{if(!localStorage.getItem('toki-before-saga-airport-repair'))localStorage.setItem('toki-before-saga-airport-repair',JSON.stringify({draft:oldDraft,applied:oldApplied}));localStorage.setItem(CHARTERS_KEY,JSON.stringify(draft));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(applied));charterRecords=draft;appliedCharterRecords=applied;airports.HSG='佐賀';charterModeDraft=null;render();renderSidebar();}catch(e){try{localStorage.setItem(CHARTERS_KEY,JSON.stringify(oldDraft));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(oldApplied));}catch(ignore){}toast('佐賀チャーターの空港コードを保存できませんでした。');}
})();
