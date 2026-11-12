Toki.newFlightAirports={from:'KIJ',to:'NGO'};
try{const saved=JSON.parse(localStorage.getItem('toki-new-flight-airports-v1')||'null');if(saved&&airports[saved.from]&&airports[saved.to]&&saved.from!==saved.to)Toki.newFlightAirports={from:saved.from,to:saved.to};}catch(e){}
function renderNewFlightAirports(){$('new-flight-from').innerHTML=airportOptions(Toki.newFlightAirports.from);$('new-flight-to').innerHTML=airportOptions(Toki.newFlightAirports.to);}
for(const [id,key] of [['new-flight-from','from'],['new-flight-to','to']])$(id).onchange=e=>{
 const next={...Toki.newFlightAirports,[key]:e.target.value};if(!airports[next.from]||!airports[next.to]||next.from===next.to){renderNewFlightAirports();toast('出発空港と到着空港は別の空港を選んでください。');return;}
 try{localStorage.setItem('toki-new-flight-airports-v1',JSON.stringify(next));Toki.newFlightAirports=next;}catch(e){renderNewFlightAirports();toast('初期空港を保存できませんでした。');}
};
renderNewFlightAirports();
