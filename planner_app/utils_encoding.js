// Dependency-free XLSX export for offline browser use. Text uses inline strings,
// so user-provided names are never interpreted as formulas.
(function(root){
'use strict';
const enc=new TextEncoder();
const xml=s=>String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function crc32(data){let c=0xffffffff;for(const byte of data){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function zip(files){
 const parts=[],central=[];let offset=0,centralSize=0;
 for(const [name,body] of Object.entries(files)){
  const n=enc.encode(name),d=enc.encode(body),crc=crc32(d),local=new Uint8Array(30+n.length),v=new DataView(local.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,d.length,true);v.setUint32(22,d.length,true);v.setUint16(26,n.length,true);local.set(n,30);
  const h=new Uint8Array(46+n.length),w=new DataView(h.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,crc,true);w.setUint32(20,d.length,true);w.setUint32(24,d.length,true);w.setUint16(28,n.length,true);w.setUint32(42,offset,true);h.set(n,46);
  parts.push(local,d);central.push(h);offset+=local.length+d.length;centralSize+=h.length;
 }
 const tail=new Uint8Array(22),t=new DataView(tail.buffer);t.setUint32(0,0x06054b50,true);t.setUint16(8,central.length,true);t.setUint16(10,central.length,true);t.setUint32(12,centralSize,true);t.setUint32(16,offset,true);
 const all=[...parts,...central,tail],result=new Uint8Array(offset+centralSize+22);let pos=0;for(const a of all){result.set(a,pos);pos+=a.length;}return result;
}
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const column=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
function sheet(rows,widths){
 const body=rows.map((row,i)=>`<row r="${i+1}"${i===0?' ht="30" customHeight="1"':''}>${row.map((v,j)=>{const ref=column(j)+(i+1),style=i===0?1:(v&&typeof v==='object'?v.style||0:0),value=v&&typeof v==='object'?v.value:v;return typeof value==='number'?`<c r="${ref}" s="${style}"><v>${value}</v></c>`:`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value??'')}</t></is></c>`;}).join('')}</row>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${ns}"><dimension ref="A1:${column(rows[0].length-1)}${rows.length}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData><autoFilter ref="A1:${column(rows[0].length-1)}${rows.length}"/></worksheet>`;
}
function exportExcel(state,T){
 const flights=[['日付','曜日','便名','機体','機種','出発空港','到着空港','出発(JST)','ブロックタイム(時間+分)','到着(JST)','公表ダイヤとの差','祝日']];
 const checks=[['日付','区分','関連便','チェック結果（出力時点）']];
 for(const date of Object.keys(state.days).sort()){
  const fs=state.days[date],base=T.schedule(date),weekday=new Date(date+'T12:00:00+09:00').toLocaleDateString('ja-JP',{weekday:'short',timeZone:'Asia/Tokyo'}),serial=Math.round((Date.parse(date+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000);
  const dateCell={value:serial,style:2};
  for(const f of [...fs].sort((a,b)=>T.minutes(a.dep)-T.minutes(b.dep))){const m=state.machines.find(m=>m.id===f.aircraft),b=base.find(b=>b.id===f.id);flights.push([dateCell,weekday,f.id,m?.name||'未割り当て',m?.type||'',T.airports[f.from],T.airports[f.to],{value:T.minutes(f.dep)/1440,style:3},{value:(T.minutes(f.arr)-T.minutes(f.dep))/1440,style:4},{value:T.minutes(f.arr)/1440,style:3},!b?(date.startsWith('2026-12-')?'追加':'公表データ未収録'):['from','to','dep','arr'].some(k=>b[k]!==f[k])?'変更':'同じ',T.holiday(date)?T.holiday(date).name+(T.holiday(date).provisional?'（暫定）':''):'']);}
  for(const b of base)if(!fs.some(f=>f.id===b.id))checks.push([dateCell,'公表便の削除',b.id,'検討案から削除された公表便です。']);
  const issues=T.check(fs,state.machines,state.turn,state.events||[],date);for(const issue of issues)checks.push([dateCell,issue.type==='error'?'不整合':'翌日確認',issue.ids.join('・'),issue.text]);
  if(!issues.length)checks.push([dateCell,'当日チェック','','設定条件内で当日の不整合なし（翌日接続等は対象外）']);
 }
 const settings=[['設定項目','値','補足'],['出力期間',Object.keys(state.days).sort()[0]+'〜'+Object.keys(state.days).sort().at(-1),'時刻は日本時間'],['最低折り返し時間(分)',state.turn,'検討用の設定値'],...state.machines.map(m=>[m.name,m.type||'未設定','開始空港：'+T.airports[m.start]]),['公表時刻の出典','https://tokiair.com/schedules/','2026年10月24日確認'],['機材割り当て','検討案','公式の機体割り当てではありません'],['チェックの範囲','各日を独立して判定','翌日接続・整備・乗員・空港制約・機種適合は対象外'],['Excelでの編集','出力時点の結果','Excelの変更はソフトに反映されず、到着時刻・チェック結果も再計算されません']];
 const sheets=[['運航便一覧',flights,[14,8,14,16,12,20,20,14,24,14,26,24]],['機材・設定',settings,[30,48,86]],['チェック結果',checks,[14,20,30,110]]];
 return packSheets(sheets);
}
function packSheets(sheets){
 const files={
 '[Content_Types].xml':`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
 '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name],i)=>`<sheet name="${name}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`,
 'xl/_rels/workbook.xml.rels':`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
 'xl/styles.xml':`<styleSheet xmlns="${ns}"><numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy/mm/dd"/><numFmt numFmtId="165" formatCode="hh:mm"/><numFmt numFmtId="166" formatCode="[h]&quot;+&quot;mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Yu Gothic"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Yu Gothic"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123E47"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
 };
 sheets.forEach(([,rows,widths],i)=>files[`xl/worksheets/sheet${i+1}.xml`]=sheet(rows,widths));return zip(files);
}
if(typeof module!=='undefined')module.exports=exportExcel;else{root.exportTokiExcel=exportExcel;root.exportIntegratedExcel=(rows,widths)=>packSheets([['統合スケジュール',rows,widths]]);}
})(typeof window!=='undefined'?window:globalThis);
