// Shared header placement for regular and charter Apply/Revert controls.
const headerApplyActions=document.createElement('div');headerApplyActions.id='header-apply-actions';headerApplyActions.className='actions';$('charter-lock-toggle').insertAdjacentElement('afterend',headerApplyActions);
for(const id of ['period-save','period-revert','charter-apply','charter-revert-applied'])headerApplyActions.appendChild($(id));
$('period-revert').textContent='適用済みダイヤに戻す';
function renderHeaderApplyActions(){const charter=!!Toki.charterMode;$('period-save').hidden=charter;$('period-revert').hidden=charter;$('charter-apply').hidden=!charter;$('charter-revert-applied').hidden=!charter;}
const renderBeforeHeaderApply=render;render=function(){renderBeforeHeaderApply();renderHeaderApplyActions();};const sidebarBeforeHeaderApply=renderSidebar;renderSidebar=function(){sidebarBeforeHeaderApply();renderHeaderApplyActions();};renderHeaderApplyActions();
