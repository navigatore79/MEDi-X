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
 x.w.document.getElementById('initialCenterSelect').value='center';x.w.document.getElementById('initialCenterConfirm').click();await new Promise(r=>setTimeout(r,20));
 assert.equal(x.calls.filter(c=>c.name==='patient_choose_initial_doctor').length,0);assert.equal(x.calls.find(c=>c.name==='patient_choose_initial_center').args.p_center,'center');assert.equal(x.w.state.doctorChoiceCompleted,true);x.close();
});
test('directory failure cannot silently bypass mandatory selection',async()=>{const x=setup();x.w.sb.rpc=async()=>({data:null,error:{message:'offline'}});await x.w.patientInitialDoctorChoice();assert.match(x.w.app.textContent,/non disponibile/);assert.equal(x.w.state.doctorChoiceCompleted,undefined);assert.ok(x.w.document.getElementById('retryDoctorChoice'));x.close();});
test('administrator personal therapy never displays schedules belonging to other test patients',async()=>{
 const d=new JSDOM('<main id="content"></main>',{runScripts:'outside-only',url:'https://example.invalid'}),w=d.window;
 const meds=[{patient_id:'admin',name:'Terapia personale',active:true,medication_schedules:[{id:'mine',time_of_day:'09:00'}]},{patient_id:'other',name:'Terapia altro paziente',active:true,medication_schedules:[{id:'theirs',time_of_day:'09:00'}]}];
 Object.assign(w,{state:{session:{user:{id:'admin'}},profile:{role:'Administrator'}},content:w.document.getElementById('content'),pendingTherapySpeechSlot:'',chosenCareDoctor:()=>null,esc:s=>String(s??''),msg:s=>s,patientView:()=>{}});
 w.sb={from:table=>{const filters=[];const chain=new Proxy({}, {get:(t,p)=>p==='then'?(ok,bad)=>Promise.resolve({data:table==='medications'?meds.filter(m=>filters.every(([key,v])=>m[key]===v)):[],error:null}).then(ok,bad):(...args)=>{if(p==='eq')filters.push(args);return chain;}});return chain;}};
 w.eval(source.slice(source.indexOf('async function patientTherapy()'),source.indexOf('async function patientFollowups()')));await w.patientTherapy();assert.match(w.content.textContent,/Terapia personale/);assert.doesNotMatch(w.content.textContent,/Terapia altro paziente/);assert.equal(w.document.querySelector('[data-schedule="theirs"]'),null);assert.ok(w.document.querySelector('[data-schedule="mine"]'));d.window.close();
});
