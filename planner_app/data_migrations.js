// Upgrade existing accept records to the applied daily snapshots once.
if(!localStorage.getItem('toki-accept-applied-repair-v1')&&libraryWritable){
 const before=structuredClone(planLibrary);let changed=false;
 for(const plan of planLibrary.items){const data=plan.id===selectedPlan()?.id?state:plan.data;if(!(data.acceptedIssueKeys||[]).length)continue;Toki.expandAppliedAcceptances(data,Toki.fleetEvents||[]);plan.data=compactPlan(data);changed=true;}
 if(!changed||persistLibrary()){localStorage.setItem('toki-accept-applied-repair-v1','1');if(typeof lockedSnapshot!=='undefined'&&lockedSnapshot?.id===selectedPlan()?.id)lockedSnapshot.data=structuredClone(state);render();renderSidebar();}else planLibrary=before;
}
