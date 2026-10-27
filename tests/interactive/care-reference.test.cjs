const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const source=fs.readFileSync(__dirname+'/../../app/src/main/assets/live.js','utf8');
function setup(){
 const d=new JSDOM('<main id="app"></main>',{runScripts:'outside-only',url:'https://example.invalid'}),w=d.window,calls=[];
 Object.assign(w,{app:w.document.getElementById('app'),state:{session:{user:{id:'patient'}},profile:{}},esc:s=>String(s??''),msg:s=>s,romeMunicipioField:()=>'<select id="initialMunicipio"><option value=""></option></select>',conditionsEditor:()=>'<div id="initialConditions"></div><input id="initialConditionsOther">',bindConditionOther:()=>{},bindRomeMunicipio:()=>{},officialAslLookup:()=>[{}],safeSignOut:()=>{},patientView:async()=>{},mediVoiceNotice:()=>{}});
 const result={error:null,data:{}};const chain=new Proxy({}, {get:(t,p)=>p==='then'?(ok,bad)=>Promise.resolve(result).then(ok,bad):()=>chain});
 w.sb={from:()=>chain,rpc:async(name,args)=>{calls.push({name,args});return {error:null,data:name==='list_verified_clinicians'?[{clinician_id:'doctor',display_name:'Medico'}]:name==='list_patient_centers'?[{id:'center',name:'Centro'}]:'pending'};}};
 w.eval(source.slice(source.indexOf('async function patientInitialDoctorChoice()'),source.indexOf('async function askResidenceAtStart()')));
 return {w,calls,close:()=>d.window.close(),fill:()=>{for(const [id,value] of Object.entries({initialBirthDate:'1980-01-01',initialScreeningSex:'female',initialResidenceCity:'Napoli',initialResidenceProvince:'NA'}))w.document.getElementById(id).value=value;}};
}
test('first access requires a doctor or center, and a center selection sends only a center request',async()=>{
 const x=setup();await x.w.patientInitialDoctorChoice();x.fill();assert.equal(x.w.document.getElementById('initialTestChoice'),null);
 x.w.document.getElementById('initialCenterConfirm').click();await new Promise(r=>setTimeout(r,10));assert.equal(x.calls.filter(c=>c.name.startsWith('patient_choose')).length,0);
 x.w.document.getElementById('initialCenterCode').value='0000';x.w.document.getElementById('initialCenterConfirm').click();await new Promise(r=>setTimeout(r,20));
 assert.equal(x.calls.filter(c=>c.name==='patient_choose_initial_doctor').length,0);assert.equal(x.calls.find(c=>c.name==='patient_request_center_by_code').args.p_code,'0000');assert.equal(x.w.state.doctorChoiceCompleted,true);x.close();
});
test('directory failure cannot silently bypass mandatory selection',async()=>{const x=setup();x.w.sb.rpc=async()=>({data:null,error:{message:'offline'}});await x.w.patientInitialDoctorChoice();assert.match(x.w.app.textContent,/non disponibile/);assert.equal(x.w.state.doctorChoiceCompleted,undefined);assert.ok(x.w.document.getElementById('retryDoctorChoice'));x.close();});
test('administrator personal therapy never displays schedules belonging to other test patients',async()=>{
 const d=new JSDOM('<main id="content"></main>',{runScripts:'outside-only',url:'https://example.invalid'}),w=d.window;
 const meds=[{patient_id:'admin',name:'Terapia personale',active:true,medication_schedules:[{id:'mine',time_of_day:'09:00'}]},{patient_id:'other',name:'Terapia altro paziente',active:true,medication_schedules:[{id:'theirs',time_of_day:'09:00'}]}];
 Object.assign(w,{state:{session:{user:{id:'admin'}},profile:{role:'Administrator'}},content:w.document.getElementById('content'),pendingTherapySpeechSlot:'',chosenCareDoctor:()=>null,esc:s=>String(s??''),msg:s=>s,patientView:()=>{}});
 w.sb={from:table=>{const filters=[];const chain=new Proxy({}, {get:(t,p)=>p==='then'?(ok,bad)=>Promise.resolve({data:table==='medications'?meds.filter(m=>filters.every(([key,v])=>m[key]===v)):[],error:null}).then(ok,bad):(...args)=>{if(p==='eq')filters.push(args);return chain;}});return chain;}};
 w.eval(source.slice(source.indexOf('async function patientTherapy()'),source.indexOf('async function patientFollowups()')));await w.patientTherapy();assert.match(w.content.textContent,/Terapia personale/);assert.doesNotMatch(w.content.textContent,/Terapia altro paziente/);assert.equal(w.document.querySelector('[data-schedule="theirs"]'),null);assert.ok(w.document.querySelector('[data-schedule="mine"]'));d.window.close();
});
function centerPanelSetup({invalid=false}={}){
 const d=new JSDOM('<section id="patientCenterLink"></section>',{runScripts:'outside-only',url:'https://example.invalid'}),w=d.window,calls=[];let pending=[];
 Object.assign(w,{state:{session:{user:{id:'patient'}}},esc:s=>String(s??''),msg:s=>s});
 w.sb={rpc:async(name,args)=>{if(name==='list_patient_centers')return {data:[{id:'center',name:'Centro verifica'}]};calls.push({name,args});if(invalid)return {error:{message:'CENTER_CODE_INVALID'}};pending=[{center_id:'center',status:'pending',created_at:new Date().toISOString()}];return {data:'pending'};},from:table=>{let chain;chain=new Proxy({}, {get:(_,p)=>p==='then'?(ok,bad)=>Promise.resolve({data:table==='profiles'?{assigned_center_id:null}:pending}).then(ok,bad):()=>chain});return chain;}};
 w.eval(source.slice(source.indexOf('async function renderPatientCenterLink()'),source.indexOf('function parseOcrSuggestion(text)')));
 return {w,calls,close:()=>d.window.close()};
}
test('registered patient can request a center with leading zeros and sees pending approval',async()=>{
 const x=centerPanelSetup();await x.w.renderPatientCenterLink();x.w.document.querySelector('[name="centerCode"]').value='0000';x.w.document.querySelector('form').dispatchEvent(new x.w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,20));
 assert.equal(x.calls[0].name,'patient_request_center_by_code');assert.equal(x.calls[0].args.p_code,'0000');assert.match(x.w.document.body.textContent,/in attesa di approvazione/);assert.match(x.w.document.getElementById('patientCenterStatus').textContent,/Richiesta inviata/);x.close();
});
test('invalid center code keeps the input available and reports the failed request',async()=>{
 const x=centerPanelSetup({invalid:true});await x.w.renderPatientCenterLink();x.w.document.querySelector('[name="centerCode"]').value='0001';x.w.document.querySelector('form').dispatchEvent(new x.w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,20));
 assert.match(x.w.document.getElementById('patientCenterStatus').textContent,/Codice non valido/);assert.equal(x.w.document.querySelector('button').disabled,false);assert.equal(x.w.document.querySelector('[name="centerCode"]').value,'0001');x.close();
});
