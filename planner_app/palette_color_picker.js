let paletteFlightId='',paletteDate='',palettePlanId='';
function closeColorPalette(){ $('bar-color-palette').hidden=true;paletteFlightId=''; }
function showColorPalette(button){
 const flight=currentFlights().find(f=>f.id===button.dataset.colorPicker);if(!flight)return;
 paletteFlightId=flight.id;paletteDate=date;palettePlanId=selectedPlan()?.id||'';
 const current=barColor(flight).toLowerCase(),choices=[...barPalette];
 if(!choices.some(([c])=>c===current))choices.push([current,'保存済み']);
 $('bar-color-options').innerHTML=choices.map(([color,name])=>`<button type="button" data-palette-color="${color}" title="${name} ${color}" aria-label="${name}" aria-pressed="${current===color}"><i style="background:${color};color:${barText(color)}">${current===color?'✓':''}</i><span>${name}</span></button>`).join('');
 const rect=button.getBoundingClientRect(),palette=$('bar-color-palette');palette.hidden=false;
 palette.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-308))+'px';
 palette.style.top=Math.max(8,Math.min(rect.bottom+6,window.innerHeight-palette.getBoundingClientRect().height-8))+'px';
 $('bar-color-options').querySelector('[aria-pressed="true"]')?.focus();
}
const flightsClickBeforePalette=$('flights').onclick;
$('flights').onclick=e=>{const swatch=e.target.closest('[data-inline-color]');if(swatch){const flight=currentFlights().find(f=>f.id===swatch.dataset.inlineFlight);if(!flight)return;const color=swatch.dataset.inlineColor;if(!/^#[0-9a-fA-F]{6}$/.test(color))return;const old=flight.color;flight.color=color;try{commit();}catch(err){if(old===undefined)delete flight.color;else flight.color=old;render();toast(err.message);}return;}const button=e.target.closest('[data-color-picker]');if(button){showColorPalette(button);return;}flightsClickBeforePalette(e);};
$('bar-color-options').onclick=e=>{
 const button=e.target.closest('[data-palette-color]');if(!button||date!==paletteDate||(selectedPlan()?.id||'')!==palettePlanId)return;
 const flight=currentFlights().find(f=>f.id===paletteFlightId);if(!flight)return;
 const color=button.dataset.paletteColor;if(!/^#[0-9a-f]{6}$/.test(color))return;
 const old=flight.color;flight.color=color;
 try{commit();closeColorPalette();}catch(err){if(old===undefined)delete flight.color;else flight.color=old;render();toast(err.message);}
};
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#bar-color-palette')&&!e.target.closest('[data-color-picker]'))closeColorPalette();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeColorPalette();});
document.addEventListener('scroll',closeColorPalette,true);
window.addEventListener('resize',closeColorPalette);
