// Each year/season has its own charter-code namespace and active selection.
let lastCharterSeasonScope='';
const seasonButtonsBeforeCharterScope=updateSeasonButtons;updateSeasonButtons=function(){
 seasonButtonsBeforeCharterScope();const season=chosenEventSeason(),key=season?.key||'';$('charters-open').disabled=!season?.available;
 if(Toki.charterMode&&key!==lastCharterSeasonScope){lastCharterSeasonScope=key;const current=activeCharterGroup(),group=charterGroups.items.find(g=>g.seasonKey===key&&g.id===current?.id)||charterGroups.items.find(g=>g.seasonKey===key);Toki.activeCharterGroupId=group?.id||'';charterModeDraft=null;if(season&&(date<season.from||date>season.to))date=season.from;render();}
 renderCharterCodes();
};
updateSeasonButtons();
