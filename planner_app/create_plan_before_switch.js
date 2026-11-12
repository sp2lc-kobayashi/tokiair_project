const createPlanBeforePageSwitch=$('create-plan').onclick;
$('create-plan').onclick=()=>{
 if(Toki.charterMode){exitCharterMode();showSettingsPage(false);return;}
 if(showingSettings){showSettingsPage(false);render();renderSidebar();return;}
 return createPlanBeforePageSwitch();
};
