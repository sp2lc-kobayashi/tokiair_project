let settingsFoldState={};try{settingsFoldState=JSON.parse(localStorage.getItem('toki-settings-folds-v1')||'{}');}catch(e){}
function makeSettingsFold(element,key,title){
 if(!element||element.closest('details.settings-fold'))return;
 const fold=document.createElement('details');fold.className='settings-fold';fold.dataset.settingsFold=key;fold.open=settingsFoldState[key]!==false;
 const heading=document.createElement('summary');heading.textContent=title;fold.appendChild(heading);element.parentNode.insertBefore(fold,element);fold.appendChild(element);
 fold.addEventListener('toggle',()=>{settingsFoldState[key]=fold.open;try{localStorage.setItem('toki-settings-folds-v1',JSON.stringify(settingsFoldState));}catch(e){}});
}
const settingsRoot=$('settings-page');
makeSettingsFold($('airport-master-list')?.closest('section'),'airports','空港の登録');
makeSettingsFold($('flight-defaults-dialog'),'defaults','便名登録');
const obsoleteAirports=settingsRoot.querySelector('.new-flight-airport-settings');if(obsoleteAirports)obsoleteAirports.hidden=true;
const hiddenConstraints=settingsRoot.querySelector('.constraint-section');if(hiddenConstraints)hiddenConstraints.hidden=true;
const machineSettings=settingsRoot.querySelector('.settings-bottom .settings');
if(machineSettings){
 const turnLabel=$('turn').closest('label');
 if(turnLabel){const turnSection=document.createElement('div');turnSection.className='settings turn-settings';machineSettings.parentNode.insertBefore(turnSection,machineSettings);turnSection.appendChild(turnLabel);makeSettingsFold(turnSection,'turn-time','折り返し時間');}
 makeSettingsFold(machineSettings,'machines','機材');
}

// Remove the redundant settings container after its sections have been folded.
const redundant=settingsRoot.querySelector('.settings-bottom');
if(redundant){
 for(const child of [...redundant.children])if(!child.classList.contains('panel-title'))settingsRoot.insertBefore(child,redundant);
 redundant.remove();
}
