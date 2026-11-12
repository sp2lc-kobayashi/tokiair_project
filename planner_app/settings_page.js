let showingSettings=false;
function renderAirportMaster(){
 $('airport-master-list').innerHTML=Object.entries(airports).filter(([code])=>!Toki.airportChoices||Toki.airportChoices.from.includes(code)||Toki.airportChoices.to.includes(code)).map(([code,name])=>`<button class="airport-master-item" data-edit-airport="${code}"><b>${code}</b><span>${esc(name)}</span></button>`).join('');
}
function showSettingsPage(show){showingSettings=show;$('planner-content').hidden=show;$('settings-page').hidden=!show;document.querySelector('header.editing-header').hidden=show;$('settings-open').classList.toggle('settings-selected',show);if(show){renderAirportMaster();renderNewFlightAirports();renderConstraints();$('default-from').innerHTML=airportOptions('KIJ');$('default-to').innerHTML=airportOptions('NGO');setDefaultColor(defaultRouteColor('KIJ','NGO'));renderFlightDefaults();}window.scrollTo?.({top:0});}
$('settings-open').onclick=()=>showSettingsPage(true);$('settings-back').onclick=()=>showSettingsPage(false);
$('plan-list').addEventListener('click',e=>{if(e.target.closest('[data-plan-id]')&&showingSettings)showSettingsPage(false);});
$('airport-master-list').onclick=e=>{const b=e.target.closest('[data-edit-airport]');if(!b)return;$('airport-code').value=b.dataset.editAirport;$('airport-name').value=airports[b.dataset.editAirport];};
$('airport-save').onclick=()=>{
 const code=$('airport-code').value.trim().toUpperCase(),name=$('airport-name').value.trim();
 if(!/^[A-Z]{3}$/.test(code)||!name||name.length>60){toast('空港コードは英字3文字、空港名は1〜60文字で入力してください。');return;}
 const next={...airports,[code]:name};try{localStorage.setItem('toki-airports-v1',JSON.stringify(next));}catch(e){toast('空港を保存できませんでした。');return;}
 Object.assign(airports,next);render();renderAirportMaster();renderNewFlightAirports();showSettingsPage(true);$('airport-code').value='';$('airport-name').value='';toast(code+' '+name+' を登録しました。');
};
renderAirportMaster();
