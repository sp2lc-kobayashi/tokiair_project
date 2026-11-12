// Reset the no-op 72-seat confirmations requested by the user, keeping other blocks and history.
(function resetNoop72SeatConfirmations(){
 if(!seatChangeWritable)return;const before=structuredClone(seatChangeStore),next=structuredClone(seatChangeStore);let count=0;
 for(const item of Object.values(next.entries)){const a=item.approved;if(!a||a.seats!==72||!(a.blocked===0||(a.blocked===undefined&&a.autoBaseAtSubmit===72)))continue;item.history.push({action:'reset',time:new Date().toISOString(),actor:'リセット',seats:72,blocked:0,reason:'変更のない72席表示を通常表示に戻す',requestId:a.id});delete item.approved;count++;}
 if(!count)return;try{if(!localStorage.getItem('toki-before-noop72-seat-reset'))localStorage.setItem('toki-before-noop72-seat-reset',JSON.stringify(before));localStorage.setItem(SEAT_REQUESTS_KEY,JSON.stringify(next));seatChangeStore=next;if(showingIntegrated)renderIntegratedSchedule();}catch(e){toast('72席の表示をリセットできませんでした。');}
})();
