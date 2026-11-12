// A stable, compact date picker with explicit year/month selectors.
let pickerTarget=null,pickerYear=2026,pickerMonth=4;
function renderDatePicker(){
 const min=pickerTarget?.min||START,max=pickerTarget?.max||END;
 $('picker-year').innerHTML=Array.from({length:11},(_,i)=>{const y=2026+i;return `<option value="${y}" ${y===pickerYear?'selected':''} ${y<Number(min.slice(0,4))||y>Number(max.slice(0,4))?'disabled':''}>${y}年</option>`;}).join('');
 $('picker-month').innerHTML=Array.from({length:12},(_,i)=>{const m=i+1,prefix=`${pickerYear}-${String(m).padStart(2,'0')}`;return `<option value="${m}" ${m===pickerMonth?'selected':''} ${prefix<min.slice(0,7)||prefix>max.slice(0,7)?'disabled':''}>${m}月</option>`;}).join('');
 const prefix=`${pickerYear}-${String(pickerMonth).padStart(2,'0')}`,first=new Date(Date.UTC(pickerYear,pickerMonth-1,1)).getUTCDay(),count=new Date(Date.UTC(pickerYear,pickerMonth,0)).getUTCDate();
 let html=['日','月','火','水','木','金','土'].map((w,i)=>`<span class="${i===0?'sun':i===6?'sat':''}">${w}</span>`).join('');
 for(let i=0;i<first;i++)html+='<span></span>';
 for(let day=1;day<=count;day++){const d=prefix+'-'+String(day).padStart(2,'0'),h=Toki.holiday(d),dow=new Date(d+'T00:00:00Z').getUTCDay();html+=`<button type="button" data-pick-date="${d}" ${d<min||d>max?'disabled':''} class="${h||dow===0?'sun':dow===6?'sat':''} ${d===pickerTarget?.value?'picked':''}" title="${h?esc(h.name):d}">${day}</button>`;}
 $('picker-days').innerHTML=html;
 $('picker-prev').disabled=prefix<=min.slice(0,7);$('picker-next').disabled=prefix>=max.slice(0,7);
}
function openDatePicker(input){
 pickerTarget=input;let d=validDate(input.value)?input.value:(input.min||START);
 if(d<(input.min||START))d=input.min;if(d>(input.max||END))d=input.max;
 pickerYear=Number(d.slice(0,4));pickerMonth=Number(d.slice(5,7));renderDatePicker();$('date-picker-dialog').showModal();
}
function shiftPickerMonth(n){const d=new Date(Date.UTC(pickerYear,pickerMonth-1+n,1));pickerYear=d.getUTCFullYear();pickerMonth=d.getUTCMonth()+1;renderDatePicker();}
$('picker-prev').onclick=()=>shiftPickerMonth(-1);$('picker-next').onclick=()=>shiftPickerMonth(1);
$('picker-year').onchange=e=>{pickerYear=Number(e.target.value);const min=pickerTarget.min||START,max=pickerTarget.max||END;if(pickerYear===Number(min.slice(0,4)))pickerMonth=Math.max(pickerMonth,Number(min.slice(5,7)));if(pickerYear===Number(max.slice(0,4)))pickerMonth=Math.min(pickerMonth,Number(max.slice(5,7)));renderDatePicker();};
$('picker-month').onchange=e=>{pickerMonth=Number(e.target.value);renderDatePicker();};
$('picker-close').onclick=()=>$('date-picker-dialog').close();
$('picker-days').onclick=e=>{const button=e.target.closest('[data-pick-date]');if(!button||button.disabled||!pickerTarget)return;const target=pickerTarget;target.value=button.dataset.pickDate;$('date-picker-dialog').close();target.dispatchEvent(new Event('change',{bubbles:true}));};
document.addEventListener('pointerdown',e=>{if(e.button!==0||!e.target.matches('input[type="date"]'))return;e.preventDefault();openDatePicker(e.target);},true);
document.addEventListener('keydown',e=>{if(e.target.matches('input[type="date"]')&&((e.altKey&&e.key==='ArrowDown')||e.key===' ')){e.preventDefault();openDatePicker(e.target);}},true);

document.addEventListener('click',e=>{if(e.target.matches('input[type="date"]'))e.preventDefault();},true);
