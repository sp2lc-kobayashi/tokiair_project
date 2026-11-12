(function(root){
'use strict';
const cache=new Map();
const iso=d=>d.toISOString().slice(0,10);
function holidays(year){
 if(cache.has(year))return cache.get(year);
 const days={};const set=(month,day,name)=>days[`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`]=name;
 const monday=(month,n)=>1+(8-new Date(Date.UTC(year,month-1,1)).getUTCDay())%7+7*(n-1);
 [[1,1,'元日'],[2,11,'建国記念の日'],[2,23,'天皇誕生日'],[4,29,'昭和の日'],[5,3,'憲法記念日'],[5,4,'みどりの日'],[5,5,'こどもの日'],[8,11,'山の日'],[11,3,'文化の日'],[11,23,'勤労感謝の日']].forEach(a=>set(...a));
 set(1,monday(1,2),'成人の日');set(7,monday(7,3),'海の日');set(9,monday(9,3),'敬老の日');set(10,monday(10,2),'スポーツの日');
 set(3,year===2026?20:year===2027?21:Math.floor(20.8431+0.242194*(year-1980)-Math.floor((year-1980)/4)),'春分の日');
 set(9,year<=2027?23:Math.floor(23.2488+0.242194*(year-1980)-Math.floor((year-1980)/4)),'秋分の日');
 const national={...days};
 for(let t=Date.UTC(year,0,2);t<Date.UTC(year+1,0,1)-86400000;t+=86400000){const d=new Date(t),key=iso(d);if(!national[key]&&national[iso(new Date(t-86400000))]&&national[iso(new Date(t+86400000))])days[key]='国民の休日';}
 for(const date of Object.keys(national).sort())if(new Date(date+'T00:00:00Z').getUTCDay()===0){let t=Date.parse(date+'T00:00:00Z')+86400000;while(national[iso(new Date(t))])t+=86400000;days[iso(new Date(t))]='振替休日';}
 cache.set(year,days);return days;
}
function holiday(date){const name=holidays(Number(date.slice(0,4)))[date];return name?{name,provisional:Number(date.slice(0,4))>=2028}:null;}
const api={holidays,holiday};if(typeof module!=='undefined')module.exports=api;else root.JapanHolidays=api;
})(typeof window!=='undefined'?window:globalThis);
