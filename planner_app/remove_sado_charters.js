// One-time removal requested for 2027 Sado charters; retain an exact recoverable backup.
(function remove2027SadoCharters(){
 const marker='toki-remove-2027-sado-charters-v1';if(localStorage.getItem(marker))return;
 const target=c=>typeof c.day==='string'&&c.day.startsWith('2027-')&&(c.from==='SDS'||c.to==='SDS');
 const removed=[...charterRecords,...appliedCharterRecords].filter(target);if(!removed.length){localStorage.setItem(marker,'1');return;}
 const before={draft:structuredClone(charterRecords),applied:structuredClone(appliedCharterRecords),groups:structuredClone(charterGroups)},ids=new Set(removed.map(c=>c.charterGroupId).filter(Boolean));
 try{
 localStorage.setItem('toki-before-remove-2027-sado-charters',JSON.stringify(before));
 const draft=charterRecords.filter(c=>!target(c)),applied=appliedCharterRecords.filter(c=>!target(c)),groups=structuredClone(charterGroups);
 groups.items=groups.items.filter(g=>!ids.has(g.id)||draft.some(c=>c.charterGroupId===g.id)||applied.some(c=>c.charterGroupId===g.id));
 if(!groups.items.some(g=>g.id===groups.active))groups.active=groups.items[0]?.id||'';
 localStorage.setItem(CHARTERS_KEY,JSON.stringify(draft));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(applied));localStorage.setItem(CHARTER_GROUPS_KEY,JSON.stringify(groups));localStorage.setItem(marker,'1');
 charterRecords=draft;appliedCharterRecords=applied;charterGroups=groups;if(!groups.items.some(g=>g.id===Toki.activeCharterGroupId))Toki.activeCharterGroupId=groups.active;charterModeDraft=null;for(const key of charterHistories.keys())if([...ids].some(id=>key.startsWith(id+'|')))charterHistories.delete(key);render();renderSidebar();
 }catch(e){try{localStorage.setItem(CHARTERS_KEY,JSON.stringify(before.draft));localStorage.setItem(CHARTER_APPLIED_KEY,JSON.stringify(before.applied));localStorage.setItem(CHARTER_GROUPS_KEY,JSON.stringify(before.groups));localStorage.removeItem(marker);}catch(ignore){}toast('佐渡チャーターを削除できませんでした。');}
})();
