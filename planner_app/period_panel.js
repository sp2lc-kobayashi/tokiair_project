// Fold the range editor while keeping schedule diagnostics visible.
const periodPanel=document.querySelector('.period-panel');const periodFold=document.createElement('details');periodFold.id='period-range-fold';const periodFoldSummary=document.createElement('summary');periodFoldSummary.textContent='適用期間';periodFold.appendChild(periodFoldSummary);
try{periodFold.open=localStorage.getItem('toki-period-range-fold-open')!=='false';}catch(e){periodFold.open=true;}
periodPanel.insertBefore(periodFold,periodPanel.firstChild);
for(const selector of ['.primary-period-range','#period-extra-ranges','#period-add-range']){const element=periodPanel.querySelector(selector);if(element)periodFold.appendChild(element);}
periodFold.addEventListener('toggle',()=>{try{localStorage.setItem('toki-period-range-fold-open',String(periodFold.open));}catch(e){}});

const periodDiagnostics=document.createElement('div');periodDiagnostics.id='period-diagnostics';periodPanel.insertAdjacentElement('afterend',periodDiagnostics);for(const id of ['period-mode','issue-count','issues']){const element=$(id);if(element)periodDiagnostics.appendChild(element);}
