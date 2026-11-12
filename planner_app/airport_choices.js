Toki.airportChoices={from:Object.keys(airports),to:Object.keys(airports)};
try{const saved=JSON.parse(localStorage.getItem('toki-airport-choices-v1')||'null');if(saved&&Array.isArray(saved.from)&&Array.isArray(saved.to))Toki.airportChoices=saved;}catch(e){}
const airportChoiceSection=document.createElement('section');airportChoiceSection.className='panel';airportChoiceSection.innerHTML=`<div class="airport-choice-columns">${[['from','出発空港'],['to','到着空港']].map(([key,title])=>`<div><h3>${title}</h3><div class="actions"><select id="airport-choice-${key}" aria-label="追加する${title}"></select><button data-airport-choice-add="${key}">追加</button></div><div id="airport-choice-list-${key}" class="airport-choice-list"></div></div>`).join('')}</div>`;
airportChoiceSection.hidden=true;$('settings-page').appendChild(airportChoiceSection);
function renderAirportChoices(){for(const key of ['from','to']){
 const list=Toki.airportChoices[key];$('airport-choice-'+key).innerHTML=Object.entries(airports).filter(([code])=>!list.includes(code)).map(([code,name])=>`<option value="${code}">${code} ／ ${esc(name)}</option>`).join('');
 $('airport-choice-list-'+key).innerHTML=list.filter(code=>airports[code]).map(code=>`<div><b>${code}</b> ${esc(airports[code])}<button data-airport-choice-remove="${key}" data-code="${code}" aria-label="${code}を選択肢から外す">×</button></div>`).join('');
}}
function saveAirportChoices(next){try{localStorage.setItem('toki-airport-choices-v1',JSON.stringify(next));Toki.airportChoices=next;render();renderAirportChoices();}catch(e){toast('保存できませんでした。');}}
airportChoiceSection.onclick=e=>{const add=e.target.closest('[data-airport-choice-add]'),remove=e.target.closest('[data-airport-choice-remove]'),next=structuredClone(Toki.airportChoices);
 if(add){const key=add.dataset.airportChoiceAdd,code=$('airport-choice-'+key).value;if(airports[code]&&!next[key].includes(code)){next[key].push(code);saveAirportChoices(next);}}
 if(remove){const key=remove.dataset.airportChoiceRemove;if(next[key].length<=1){toast('空港は1つ以上残してください。');return;}next[key]=next[key].filter(code=>code!==remove.dataset.code);saveAirportChoices(next);}
};
const showSettingsBeforeChoices=showSettingsPage;showSettingsPage=function(show){showSettingsBeforeChoices(show);if(show)renderAirportChoices();};
renderAirportChoices();

const airportSaveBeforeChoices=$('airport-save').onclick;$('airport-save').onclick=()=>{const code=$('airport-code').value.trim().toUpperCase(),name=$('airport-name').value.trim();if(!/^[A-Z]{3}$/.test(code)||!name||name.length>60)return airportSaveBeforeChoices();airportSaveBeforeChoices();if(airports[code]!==name)return;const next=structuredClone(Toki.airportChoices);for(const direction of ['from','to'])if(!next[direction].includes(code))next[direction].push(code);saveAirportChoices(next);renderAirportMaster();if(typeof renderJapanAirportList==='function'){renderJapanAirportList();renderJapanAirportDetail();}};
