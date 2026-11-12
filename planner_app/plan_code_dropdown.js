// Split code controls preserve the stable code string consumed by create/rename handlers.
function installPlanCodeDropdown(inputId,dialogId,saveId,renaming=false){
 const input=$(inputId),dialog=$(dialogId);input.type='hidden';
 const row=document.createElement('div');row.className='plan-code-dropdowns';row.innerHTML=`<label>アルファベット<select id="${inputId}-letter" aria-label="ダイヤコードのアルファベット">${Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).map(l=>`<option value="${l}">${l}</option>`).join('')}</select></label><label>数字<select id="${inputId}-number" aria-label="ダイヤコードの数字"></select></label><span id="${inputId}-preview" class="code-dropdown-preview"></span>`;input.parentNode.insertBefore(row,input.nextSibling);
 const letter=$(inputId+'-letter'),number=$(inputId+'-number'),preview=$(inputId+'-preview');
 function usedCodes(){const self=renaming?planLibrary.items.find(p=>p.id===renamingPlanId):null,key=self?(self.seasonKey||self.data?.season?.key||''):seasonRange(Number($('season-year').value),pendingSeasonKind||calendarSeason().kind).key;return new Set(planLibrary.items.filter(p=>p.id!==self?.id&&(p.seasonKey||p.data?.season?.key||'')===key).map(p=>p.name));}
 function syncValue(){input.value=letter.value+number.value;preview.textContent=input.value;$(saveId).disabled=usedCodes().has(input.value);}
 function fillNumbers(wanted=''){
 const used=usedCodes(),values=['',...Array.from({length:1000},(_,i)=>String(i))];if(wanted&&!values.includes(wanted))values.push(wanted);
 number.innerHTML=values.map(n=>`<option value="${n}" ${used.has(letter.value+n)?'disabled':''}>${n===''?'なし':n}${used.has(letter.value+n)?'（使用済み）':''}</option>`).join('');
 number.value=!used.has(letter.value+wanted)?wanted:values.find(n=>!used.has(letter.value+n))??'';syncValue();
 }
 letter.onchange=()=>fillNumbers(number.value);number.onchange=syncValue;
 const originalShow=dialog.showModal.bind(dialog);dialog.showModal=function(){const match=/^([A-Z])([0-9]{0,3})$/.exec(input.value);letter.value=match?.[1]||'A';fillNumbers(match?.[2]||'');originalShow();letter.focus();};
 row.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!$(saveId).disabled)$(saveId).onclick();}});
}
installPlanCodeDropdown('new-plan-name','create-plan-dialog','confirm-create-plan');
installPlanCodeDropdown('rename-plan-code','rename-plan-dialog','rename-plan-save',true);
