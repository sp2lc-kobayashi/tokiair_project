// Named plans share one local library; compact snapshots omit empty dates.
const LIBRARY_KEY='toki-plan-library-v1';
let planLibrary={version:1,activeId:'',items:[]},libraryWritable=true,librarySaved=true;
const planId=()=> 'D'+Date.now().toString(36)+Math.random().toString(36).slice(2,9);
function compactPlan(s){const copy=structuredClone(s);copy.days=Object.fromEntries(Object.entries(copy.days).filter(([,fs])=>fs.length));return copy;}
function validateLibrary(library){
 if(!library||library.version!==1||!Array.isArray(library.items)||library.items.length>100)throw Error('ダイヤ一覧の形式が正しくありません。');
 const ids=new Set();
 for(const p of library.items){
  if(!p||typeof p.id!=='string'||!/^D[a-z0-9]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60)throw Error('ダイヤ一覧が正しくありません。');
  for(const period of p.data?.periods||[])if(/^PofficialD[a-z0-9]+$/.test(period.id)){const previous=period.id;period.id='Pofficial'+previous.slice(9).toLowerCase();if(p.data.editingPeriodId===previous)p.data.editingPeriodId=period.id;}
  ids.add(p.id);validate(expandDates(structuredClone(p.data)));
 }
 if(!ids.has(library.activeId))library.activeId=library.items[0]?.id||'';
 return library;
}
function selectedPlan(){return planLibrary.items.find(p=>p.id===planLibrary.activeId);}
try{
 const stored=localStorage.getItem(LIBRARY_KEY);
 if(stored){planLibrary=validateLibrary(JSON.parse(stored));const p=selectedPlan();if(p){state=migrateAircraftNames(validate(expandDates(structuredClone(p.data))));date=validDate(p.date)?p.date:START;}else{state=fresh();for(const d of Object.keys(state.days))state.days[d]=[];state.periods=[];date=START;}}
 else{const id=planId();planLibrary={version:1,activeId:id,items:[{id,name:'これまでの検討ダイヤ',updated:new Date().toISOString(),date,data:compactPlan(state)}]};}
}catch(err){
 libraryWritable=false;librarySaved=false;
 const id=planId();planLibrary={version:1,activeId:id,items:[{id,name:'現在の検討ダイヤ',date,data:compactPlan(state)}]};
 toast('保存済みの一覧を読み込めませんでした。既存の一覧は上書きせず、現在のダイヤを表示しています。');
}
function persistLibrary(){
 if(!libraryWritable){librarySaved=false;return false;}
 try{localStorage.setItem(LIBRARY_KEY,JSON.stringify(planLibrary));librarySaved=true;return true;}
 catch(err){librarySaved=false;return false;}
}
function initializeAssignments(){
 if(planLibrary.assignments&&typeof planLibrary.assignments==='object'&&!Array.isArray(planLibrary.assignments))return;
 planLibrary.assignments={};
 const ordered=[...planLibrary.items].sort((a,b)=>(a.updated||'').localeCompare(b.updated||''));
 for(const plan of ordered)for(const period of plan.data.periods||[])for(const day of period.dates||[])if(Toki.isPlanApplied(plan.data,day))planLibrary.assignments[day]=plan.id;
}
initializeAssignments();
Toki.assignedPlanId=day=>{const owner=planLibrary.assignments?.[day];return owner&&!planLibrary.items.some(p=>p.id===owner)?null:owner;};
Toki.assignAppliedDates=dates=>{
 initializeAssignments();
 if(typeof activeHistory==='function'){const h=activeHistory();if(h)h.entries[h.index].assignments=JSON.stringify(planLibrary.assignments);}
 const owner=selectedPlan()?.id;if(!owner)return;
 for(const day of dates){if(planLibrary.assignments[day]!==owner)Toki.assignmentChanged=true;planLibrary.assignments[day]=owner;}
};
function capturePlan(){const p=selectedPlan();if(p){p.data=compactPlan(state);p.date=date;p.updated=new Date().toISOString();}}
function renderPlanList(){
 const scope=Toki.planListSeasonKey===undefined?(selectedPlan()?.data?.season?.key||'legacy'):Toki.planListSeasonKey;
 const visible=planLibrary.items.filter(p=>scope==='legacy'?!p.data?.season&&!p.seasonKey:scope&&(p.data?.season?.key||p.seasonKey)===scope);
 $('plan-list').innerHTML=visible.map(p=>{
  const days=Object.keys(p.data.days),flights=Object.values(p.data.days).reduce((sum,fs)=>sum+fs.length,0),periods=p.data.periods?.length||0;
  const range=days.length?`${days.sort()[0]}〜${days.at(-1)}`:'便は未設定';
  return `<button draggable="true" class="plan-card ${p.id===planLibrary.activeId?'active':''} ${p.locked?'plan-locked':''}" data-plan-id="${p.id}" style="--plan-color:${Toki.planColor(p.name)}" title="${esc(p.name)} ／ ${esc(range)} ／ ${days.length}日・${flights}便（右クリックで変更・コピー・削除）" aria-haspopup="menu" aria-pressed="${p.id===planLibrary.activeId}"><strong>${esc(p.name)}</strong>${p.locked?'<i class="plan-lock-mark" aria-label="ロック中">🔒</i>':''}</button>`;
 }).join('')||'<div class="sidebar-no-events">'+(scope?'ダイヤ未作成':'夏・冬を選択')+'</div>';
}
function renderSidebar(){renderPlanList();
 $('library-status').textContent=librarySaved?'':'一覧を保存できません。検討案をファイル保存してください。';
 $('library-status').style.color=librarySaved?'#b6c2d4':'#ff939d';
 const current=selectedPlan();
 if(Toki.charterMode){$('active-plan-name').textContent=Toki.currentCharterCode?.()||'チャーター未選択';}else{
 $('active-plan-name').innerHTML='<span class="header-plan-code" style="background:'+Toki.planColor(Toki.dateViewUnset?'':current?.name||'')+'">'+esc(Toki.dateViewUnset?'未設定':current?.name||'ダイヤ未選択')+'</span>';
 }
 const season=current?.data?.season;
 $('editing-season').classList.toggle('winter-season',season?.kind==='W');
 $('editing-season').textContent=season&&Number.isInteger(season.year)&&['S','W'].includes(season.kind)?`${season.kind}${String(season.year).slice(-2)}`:'シーズン未指定';
 const formatDate=d=>{const [y,m,day]=d.split('-').map(Number);return `${y}年${m}月${day}日`;};
 const configuredPeriods=current?.data?.periods||[];
 const flightDates=Object.keys(current?.data?.days||{}).sort();
 const starts=configuredPeriods.map(p=>p.start).filter(validDate),ends=configuredPeriods.map(p=>p.end).filter(validDate);
 const from=season?.from||(starts.length?starts.sort()[0]:flightDates[0]);
 const to=season?.to||(ends.length?ends.sort().at(-1):flightDates.at(-1));
 $('editing-range').textContent=validDate(from)&&validDate(to)?`${formatDate(from)} 〜 ${formatDate(to)}`:'期間未設定';

}
const saveBeforeLibrary=save;
save=function(){
 if(!selectedPlan()){const id=planId();planLibrary.activeId=id;planLibrary.items.push({id,name:'新しいダイヤ',date,data:compactPlan(state)});}
 saveBeforeLibrary();capturePlan();persistLibrary();
 if(!librarySaved)$('storage').textContent=' ダイヤ一覧への自動保存に失敗しました。検討案をファイルにも保存してください。';
 renderSidebar();
};
function openPlan(id){
 Toki.dateViewUnset=false;
 if(id===planLibrary.activeId)return;
 const target=planLibrary.items.find(p=>p.id===id);if(!target)return;
 try{
  const next=migrateAircraftNames(validate(expandDates(structuredClone(target.data))));
  capturePlan();planLibrary.activeId=id;state=next;state.periods=state.periods||[];date=validDate(target.date)?target.date:START;
  activePeriodId='';dragUndo=null;$('undo-drag').disabled=true;
  save();render();refreshPeriods();renderSidebar();
 }catch(err){toast('ダイヤを開けません：'+err.message);}
}
$('plan-list').onclick=e=>{const button=e.target.closest('[data-plan-id]');if(button)openPlan(button.dataset.planId);};
$('create-plan').onclick=()=>{
 const name=$('new-plan-name').value.trim();
 if(!name||name.length>60){toast('新しいダイヤの名前を1〜60文字で入力してください。');return;}
 if(planLibrary.items.length>=100){toast('ダイヤは最大100件です。');return;}
 capturePlan();const source=$('new-plan-source').value,next=source==='current'?structuredClone(state):fresh();
 if(source==='blank'){for(const d of Object.keys(next.days))next.days[d]=[];next.periods=[];}
 const id=planId(),nextDate=source==='baseline'?'2026-12-05':date;
 planLibrary.items.push({id,name,date:nextDate,updated:new Date().toISOString(),data:compactPlan(next)});
 planLibrary.activeId=id;state=next;state.periods=state.periods||[];date=nextDate;activePeriodId='';dragUndo=null;$('undo-drag').disabled=true;
 $('new-plan-name').value='';save();render();refreshPeriods();renderSidebar();toast('「'+name+'」を作成しました。');
};
// A named JSON backup retains compatibility with the existing import workflow.
$('download').onclick=()=>{const p=selectedPlan();if(!p){toast('保存するダイヤを作成してください。');return;}const name=p.name.replace(/[\\/:*?"<>|]/g,'_');download(name+'-検討案.json',JSON.stringify({...state,planName:p.name},null,2),'application/json');};
if(libraryWritable)persistLibrary();
activePeriodId='';state.periods=state.periods||[];render();refreshPeriods();renderSidebar();
