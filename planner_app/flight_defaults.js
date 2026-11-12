// Flight-number defaults shared across seasons.
let flightDefaults={};
try{flightDefaults=JSON.parse(localStorage.getItem('toki-flight-defaults-v1')||'{}');}catch(e){}
Toki.normalizeFlightNumber=value=>{const code=String(value).normalize('NFKC').trim().toUpperCase();return /^\d+$/.test(code)?'BV'+code:code;};
Toki.applyFlightDefaults=flight=>{const key=Toki.normalizeFlightNumber(flight.id),preset=flightDefaults[key]||Object.entries(flightDefaults).find(([id])=>Toki.normalizeFlightNumber(id)===key)?.[1];if(!preset)return false;const arr=arrival(flight.dep,preset.block);flight.from=preset.from;flight.to=preset.to;flight.arr=arr;delete flight.blockUnset;flight.color=preset.color||defaultRouteColor(flight.from,flight.to);return true;};

function showFlightDefaults(){
 $('default-from').innerHTML=airportOptions('KIJ');$('default-to').innerHTML=airportOptions('NGO');setDefaultColor('#e4c13b');renderFlightDefaults();showSettingsPage(true);
}
function renderFlightDefaults(){
 $('flight-defaults-list').innerHTML=Object.entries(flightDefaults).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([id,p])=>`<tr><td><strong>${esc(id)}</strong></td><td>${esc(airports[p.from])} → ${esc(airports[p.to])}</td><td>${formatBlock(p.block)}</td><td><i style="display:inline-block;width:16px;height:16px;border-radius:3px;background:${p.color||defaultRouteColor(p.from,p.to)}" aria-label="バー色"></i></td><td><button data-default-edit="${esc(id)}">編集</button> <button data-default-delete="${esc(id)}">削除</button></td></tr>`).join('');
}
$('flight-defaults-open').onclick=showFlightDefaults;
$('flight-defaults-close').onclick=()=>showSettingsPage(false);
$('default-save').onclick=()=>{try{
 const number=$('default-number').value.trim();if(!/^\d{1,6}$/.test(number))throw Error('便名は数字1〜6桁で入力してください。');
 const from=$('default-from').value,to=$('default-to').value,block=parseBlock($('default-block').value.trim());
 if(!airports[from]||!airports[to]||from===to)throw Error('出発・到着空港を確認してください。');arrival('00:00',block);
 const next={...flightDefaults,['BV'+number]:{from,to,block,color:$('default-color').value}};
 localStorage.setItem('toki-flight-defaults-v1',JSON.stringify(next));flightDefaults=next;renderFlightDefaults();toast('BV'+number+' の初期値を保存しました。');
 }catch(e){toast(e.message);}};
$('flight-defaults-list').onclick=e=>{
 const edit=e.target.closest('[data-default-edit]'),remove=e.target.closest('[data-default-delete]');
 if(edit){const id=edit.dataset.defaultEdit,p=flightDefaults[id];$('default-number').value=id.slice(2);$('default-from').value=p.from;$('default-to').value=p.to;$('default-block').value=formatBlock(p.block);setDefaultColor(p.color||defaultRouteColor(p.from,p.to));}
 if(remove){const next={...flightDefaults};delete next[remove.dataset.defaultDelete];try{localStorage.setItem('toki-flight-defaults-v1',JSON.stringify(next));flightDefaults=next;renderFlightDefaults();}catch(e){toast('保存できませんでした。');}}
};

function defaultRouteColor(from,to){return ({UKB:'#739b35',NGO:'#e4c13b',OKD:'#5373af'})[from==='KIJ'?to:from]||'#5373af';}
for(const id of ['default-from','default-to'])$(id).onchange=()=>{setDefaultColor(defaultRouteColor($('default-from').value,$('default-to').value));};

function setDefaultColor(color){
 $('default-color').value=color;
 $('default-color-palette').innerHTML=barPalette.map(([value,name])=>`<button type="button" class="default-color-swatch ${value===color?'selected':''}" data-default-color="${value}" style="background:${value}" title="${name}" aria-label="${name}" aria-pressed="${value===color}"></button>`).join('');
}
$('default-color-palette').onclick=e=>{const button=e.target.closest('[data-default-color]');if(button)setDefaultColor(button.dataset.defaultColor);};
