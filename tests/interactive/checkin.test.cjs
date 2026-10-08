const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../../app/src/main/assets/patient-upgrade.js','utf8');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
function setup(){
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://meditaly.test',runScripts:'outside-only'}),w=dom.window;
 w.state={session:{user:{id:'00000000-0000-4000-8000-000000000001'},access_token:'fake-test-only'},selectedCareDoctor:'00000000-0000-4000-8000-000000000002',careDoctors:[{clinician_id:'00000000-0000-4000-8000-000000000002',profiles:{full_name:'Medico Demo'}}],tab:'home'};
 w.MediTurn={stop:()=>{},ask:(text,options)=>{w.lastVoiceTurn={text,...options};}};w.mediSpeakCloud=()=>{};w.checkinVoiceValue=(field,text)=>text;
 w.mediVoiceActive=false;w.mediStopCloud=()=>{};w.mediSpeechOnDone=null;w.loadCareDoctors=async()=>{};w.esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));w.confirm=()=>true;w.alert=()=>{};w.patientView=async()=>{};w.patientHome=()=>{};w.dispatchChatPush=()=>true;w.mediVoiceNotice=()=>{};
 w.window.MEDITALY_SUPABASE={url:'https://example.invalid',publishableKey:'fake'};
 w.eval(source+"\nwindow.TestFlow=CheckinFlow;");return w;
}
const tick=()=>new Promise(r=>setImmediate(r));
test('well patient skips symptom detail, reported symptoms require detail',()=>{const w=setup();assert.equal(w.eval("TestFlow.steps({mood:'Bene',symptoms:'Nessun disturbo nuovo'}).some(x=>x.id==='onset')"),false);assert.equal(w.eval("TestFlow.steps({mood:'Bene',symptoms:'Tosse'}).some(x=>x.id==='onset')"),true);w.close();});
test('negated and composite commands are never executed by local parser',()=>{const w=setup();for(const q of ['non aprire le terapie','apri terapie e manda un messaggio','cancella la terapia'])assert.equal(w.localPatientAction(q),null);assert.equal(w.localPatientAction('apri i referti').target,'reports');assert.equal(w.localPatientAction('rimanda il check-in di 30 minuti').minutes,30);w.close();});
test('provider cannot execute arbitrary actions',async()=>{const w=setup();assert.equal(await w.executePatientAction({action:'delete',target:'therapy'}),false);assert.equal(await w.executePatientAction({action:'open',target:'javascript:alert(1)'}),false);w.close();});
test('guided flow does not send before confirmation, retains nonce across retry',async()=>{
 const w=setup();let calls=[];let fail=true;w.sb={rpc:async(n,p)=>{calls.push({n,p});return fail?{error:{message:'offline'}}:{data:{message_id:'demo'}};}};
 await w.startInteractiveCheckin('green');assert.match(w.document.body.textContent,/Rispetto a ieri/);assert.equal(calls.length,0);
 for(let i=0;i<12&&w.document.querySelector('#ciSkip');i++){w.document.querySelector('#ciSkip').click();await tick();}
 assert.ok(w.document.querySelector('#ciSend'));assert.equal(calls.length,0);
 w.document.querySelector('#ciSend').click();w.document.querySelector('#ciSend').click();await tick();assert.equal(calls.length,1);assert.match(w.document.querySelector('#ciResult').textContent,/In attesa/);
 assert.ok(w.localStorage.getItem('meditaly-checkin-pending-'+w.state.session.user.id));
 fail=false;w.document.querySelector('#ciSend').click();await tick();assert.equal(calls.length,2);assert.equal(calls[0].p.p_request,calls[1].p.p_request);assert.equal(calls[0].p.p_clinician,w.state.selectedCareDoctor);assert.equal(w.localStorage.length,0);w.close();
});
test('closing and reopening pending check-in preserves confirmed recipient and payload',async()=>{
 const w=setup();w.sb={rpc:async()=>({error:{message:'offline'}})};await w.startInteractiveCheckin('yellow');while(w.document.querySelector('#ciSkip'))w.document.querySelector('#ciSkip').click();w.document.querySelector('#ciSend').click();await tick();
 const before=JSON.parse(w.localStorage.getItem('meditaly-checkin-pending-'+w.state.session.user.id));w.document.querySelector('#ciClose').click();w.state.selectedCareDoctor=null;await w.startInteractiveCheckin();assert.ok(w.document.querySelector('#ciDoctor').disabled);assert.equal(w.document.querySelector('#ciDoctor').value,before.recipient);w.close();
});
test('late voice result cannot fill a different question',async()=>{
 const w=setup();await w.startInteractiveCheckin('green');const previous=w.lastVoiceTurn;
 w.document.querySelector('#ciSkip').click();const heading=w.document.querySelector('#ciStep h3').textContent;
 previous.answer('Peggio');assert.equal(w.document.querySelector('#ciStep h3').textContent,heading);w.close();
});
test('session switch prevents sending the previous patient responses',async()=>{
 const w=setup();let calls=0;w.sb={rpc:async()=>{calls++;return {data:{}}}};await w.startInteractiveCheckin('green');while(w.document.querySelector('#ciSkip'))w.document.querySelector('#ciSkip').click();w.state.session.user.id='other';w.document.querySelector('#ciSend').click();await tick();assert.equal(calls,0);w.close();
});
