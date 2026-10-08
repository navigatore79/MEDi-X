if(!window.supabase) throw new Error('Supabase non caricato');
if(!window.MEDITALY_SUPABASE) throw new Error('Configurazione Supabase mancante');
const { createClient } = window.supabase;
const sb = createClient(window.MEDITALY_SUPABASE.url, window.MEDITALY_SUPABASE.publishableKey, {
 auth:{persistSession:true,autoRefreshToken:true}
});
// Un unico tratto per le icone delle pagine paziente, come nella navigazione.
function uiIcon(name){
 const paths={
  home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  diary:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 3v18M11 9h5M11 13h5"/>',
  pill:'<rect x="5" y="3" width="14" height="18" rx="7" transform="rotate(44 12 12)"/><path d="m7.5 16.5 9-9"/>',
  messages:'<path d="M4 5h16v12H9l-5 4zM8 10h8m-8 4h5"/>',
  heartmail:'<rect x="2" y="5" width="20" height="15" rx="2"/><path d="m3 7 9 7 9-7"/><path d="M12 10.5c-.8-1.2-2.5-.6-2.5.7 0 1.2 2.5 2.8 2.5 2.8s2.5-1.6 2.5-2.8c0-1.3-1.7-1.9-2.5-.7z" fill="currentColor" stroke="none"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  microphone:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/>',
  video:'<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-3v10l-4-3"/>',
  camera:'<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="3"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1"/><path d="m4 18 6-6 3 3 3-3 4 5"/>',
  play:'<path d="m9 6 9 6-9 6z"/>',
  share:'<path d="M12 16V3m0 0L7 8m5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  trash:'<path d="M4 7h16M10 3h4m-8 4 1 14h10l1-14M10 11v6m4-6v6"/>',
  vaccine:'<path d="m6 18 12-12M14 4l6 6M4 14l6 6M3 21l3-3M17 3l4 4"/>',
  import:'<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v4h16v-4"/>',
  report:'<path d="M6 3h9l4 4v14H6zM15 3v5h4M9 12h7M9 16h7"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h3"/>',
  form:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  bell:'<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zm5 3h4"/>',
  shield:'<path d="m12 3 8 4v5c0 5-3 8-8 10-5-2-8-5-8-10V7zM9 12l2 2 4-4"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  doctor:'<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M8 16h8m-4-4v8"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  back:'<path d="m15 5-7 7 7 7"/>'
 };
 return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||paths.form}</svg>`;
}
const app = document.getElementById('app');
let content = null;
const state = { session:null, profile:null, tab:'home', selectedPatient:null, selectedChatPeer:null, selectedClinicianChat:null, chatChannel:null, chatChannelFor:null, chatPollTimer:null, lastIncomingChatId:null, clinicianChatTimer:null, residencePromptCheckedFor:null, pushStatus:null, mfa:null, adminArea:false, careChannel:null, careRefreshTimer:null, chatRefreshTimer:null,doctorChoiceFor:null,doctorChoiceCompleted:false, lastPatientTab:null, lastPatientUser:null, homeVoicePending:false,lastGreetingAt:0, selectedCareDoctor:null,careDoctors:[],doctorPromptDoneFor:null, currentLocation:null, locationAttemptedFor:null };
const CIRO_ADMIN_EMAIL = 'maiellociro@gmail.com';
const LEGAL_VERSION = '2.2';
const APP_MFA_ENABLED = false; // sospensione temporanea fino a successiva riattivazione
const MEDI_ASSISTANT_URL = 'https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/medi-assistant';
const MEDI_TTS_URL = 'https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/medi-tts';
let pendingTherapySpeechSlot = '';
let mediCloudAudio = null;
let mediVoiceTarget = null;
let mediConversation = [];
let mediRequestInFlight = false;
let mediWakeEnabled = false;
let mediVoiceActive = false;
let mediVoicePhase = 'question';
let mediVoiceDraft = '';
let mediSpeechOnDone = null;
window.onMediSpeechError=()=>{mediSpeechOnDone=null;state.greetingInFlight=false;mediVoiceNotice("Voce del dispositivo non disponibile. Controlla volume e sintesi vocale italiana nelle impostazioni Android.");welcomeStatus("Il saluto è visibile ma la voce Android non è disponibile. Puoi scrivere la risposta oppure riprovare.");};
window.onMediSpeechDone=()=>{const callback=mediSpeechOnDone;mediSpeechOnDone=null;callback?.();};
window.onMeditalyVoiceInput=(text)=>{const targetId=mediVoiceTarget;mediVoiceTarget=null;if(targetId==='mediCommand'){if(text?.trim() && document.getElementById('mediModal')&&!document.getElementById('mediModal').classList.contains('hidden'))mediHandleVoice(text);else mediSetVoiceStatus('Tocca il microfono per riprovare.');return;}const target=targetId&&document.getElementById(targetId);if(target){target.value=String(text||'');target.dispatchEvent(new Event('input',{bubbles:true}));target.focus();}};
window.onMediWakeState=status=>{mediWakeEnabled=status==='active';const button=document.getElementById('mediWakeToggle');if(button){button.classList.toggle('active',mediWakeEnabled);button.setAttribute('aria-pressed',String(mediWakeEnabled));button.textContent=mediWakeEnabled?'● Hey Medi attivo':'🎙 Attiva Hey Medi';}if(status==='denied')mediVoiceNotice('Autorizza il microfono nelle impostazioni per usare Hey Medi.');if(status==='unavailable')mediVoiceNotice('Il riconoscimento vocale non è disponibile su questo dispositivo. Usa il pulsante microfono.');};
window.onMediWakeDetected=spoken=>{const command=String(spoken||'').replace(/^(?:.*?)(?:hey|hei|ehi|ei)\s+medi[,.!?\s]*/i,'').trim();if(command){mediRunVoiceCommand(command);return;}mediVoiceTarget='mediCommand';window.AndroidBridge?.startVoiceInput?.();};
async function mediRunVoiceCommand(utterance){
 const original=String(utterance||'').trim();
 if(!original||!state.session||!['Patient','Administrator'].includes(state.profile?.role))return;
 const local=localPatientAction(original);if(local){await executePatientAction(local);return;}
 if(state.tab!=='home'){state.tab='home';await patientView();}
 document.getElementById('mediModal')?.classList.remove('hidden');
 await mediHandleVoice(original);
}
function mediVoiceNotice(text){let el=document.getElementById('mediVoiceNotice');if(!el){el=document.createElement('div');el.id='mediVoiceNotice';el.className='medi-voice-notice';document.body.appendChild(el);}el.textContent=text;el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),4200);}
async function mediSpeakCloud(text,onDone=null){
  const clean=String(text||'').replace(/https?:\/\/\S+/g,'').replace(/[*_#`>]/g,' ').replace(/\s+/g,' ').trim(); if(!clean)return;
  if(window.AndroidBridge?.speak){mediStopCloud();mediSpeechOnDone=onDone;AndroidBridge.speak(clean);return;}
  if(window.speechSynthesis){mediStopCloud();const utterance=new SpeechSynthesisUtterance(clean);utterance.lang='it-IT';utterance.rate=0.95;utterance.onend=()=>onDone?.();utterance.onerror=()=>onDone?.();speechSynthesis.speak(utterance);return;}
  try{
    const r=await fetch(MEDI_TTS_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':window.MEDITALY_SUPABASE.publishableKey},body:JSON.stringify({text:clean})});
    if(!r.ok) throw new Error(await r.text());
    const d=await r.json(); if(!d.audio_base64) throw new Error('Audio cloud non disponibile');
    if(mediCloudAudio){try{mediCloudAudio.pause();}catch{}}
    mediCloudAudio=new Audio(`data:${d.mime_type||'audio/mpeg'};base64,${d.audio_base64}`);
    mediCloudAudio.onended=()=>onDone?.();
    await mediCloudAudio.play();
  }catch(e){console.warn('Medi cloud TTS unavailable',e);mediVoiceNotice('La voce cloud di Medi non è disponibile. Riprova tra poco.');onDone?.();}
}
function mediStopCloud(){mediSpeechOnDone=null;try{window.AndroidBridge?.stopSpeaking?.();window.speechSynthesis?.cancel();}catch{}if(mediCloudAudio){try{mediCloudAudio.pause();mediCloudAudio.currentTime=0;}catch{}mediCloudAudio=null;}}
function mediStartVoiceInput(targetId){
  mediVoiceTarget=targetId;
  try{if(window.AndroidBridge?.startVoiceInput){AndroidBridge.startVoiceInput();return;}}catch(e){console.warn(e)}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return alert('Input vocale non disponibile su questo dispositivo.');
  const rec=new SR();rec.lang='it-IT';rec.interimResults=false;rec.maxAlternatives=1;rec.onresult=e=>window.onMeditalyVoiceInput(e.results?.[0]?.[0]?.transcript||'');rec.start();
}
function mediSetVoiceStatus(message,listening=false){
 const label=document.getElementById('mediVoiceStatus');if(label)label.textContent=message;
 document.getElementById('mediModal')?.classList.toggle('medi-listening',listening);
}
function mediListen(){
 const modal=document.getElementById('mediModal');
 if(!mediVoiceActive||!modal||modal.classList.contains('hidden'))return;
 mediSetVoiceStatus('Ti ascolto…',true);mediStartVoiceInput('mediCommand');
}
function mediLocalReply(question,answer,sources=[]){
 const box=document.getElementById('mediAnswer');if(box){mediRenderAnswer(box,{answer,sources},{conversation:true,question});
  const video=sources.find(x=>x.url==='https://www.youtube.com/watch?v=aiDpVAKt3Mw'||x.url==='https://www.youtube.com/watch?v=-mcn3S_ZP3M');
  if(video){const id=new URL(video.url).searchParams.get('v');const turn=box.querySelector('.medi-turn.assistant:last-child');if(turn)turn.insertAdjacentHTML('beforeend',`<iframe class="medi-video" title="${esc(video.title)}" src="https://www.youtube-nocookie.com/embed/${id}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);}
 }
 mediSetVoiceStatus('Medi sta parlando…');mediSpeakCloud(answer,mediListen);
}
async function mediTodayMedications(question){
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
 const day=new Date(`${date}T12:00:00Z`).getUTCDay();
 const {data,error}=await sb.from('medications').select('name,dose,starts_on,ends_on,medication_schedules(time_of_day,weekdays)').eq('patient_id',state.session.user.id).eq('active',true);
 if(error)throw error;
 const slots=(data||[]).filter(m=>(!m.starts_on||m.starts_on<=date)&&(!m.ends_on||m.ends_on>=date))
  .flatMap(m=>(m.medication_schedules||[]).filter(s=>s.time_of_day&&(!s.weekdays?.length||s.weekdays.includes(day)))
   .map(s=>({time:s.time_of_day.slice(0,5),name:m.name,dose:m.dose||''}))).sort((a,b)=>a.time.localeCompare(b.time));
 const answer=slots.length?`Per oggi risultano ${slots.length} orari programmati: ${slots.map(s=>`${s.time}, ${s.name}${s.dose?' '+s.dose:''}`).join('; ')}. Verifica sempre il piano aggiornato dal medico.`:'Non risultano farmaci programmati per oggi nel tuo piano. Se ti aspettavi una terapia, apri Terapie o contatta il medico.';
 mediLocalReply(question,answer);
}
async function mediAslContacts(question){
 const {data,error}=await sb.from('patient_screening_profiles').select('residence_city,residence_province,residence_municipio').eq('patient_id',state.session.user.id).maybeSingle();
 if(error)throw error;
 const area=aslAreaFor(data),asl=area?.asl;
 if(!asl){mediLocalReply(question,'Non ho trovato una ASL verificata per la tua residenza. Puoi aggiornare comune e provincia nel profilo oppure aprire l’elenco ufficiale del Ministero.',[{title:'Elenco ASL · Ministero della Salute',url:'https://www.salute.gov.it/new/it/ministero/aziende-sanitarie-locali/',domain:'salute.gov.it'}]);return;}
 mediLocalReply(question,`Per ${area.city} ho trovato ${asl.name}. Ti mostro il collegamento al sito ufficiale per recapiti, sedi e servizi.`,[{title:`${asl.name} · sito ufficiale`,url:asl.site||asl.contacts,domain:new URL(asl.site||asl.contacts).hostname}]);
}
async function mediSendVoiceDraft(){
 const clinician=state.careDoctors.find(x=>x.clinician_id===state.selectedCareDoctor)||state.careDoctors[0];
 if(!clinician){mediVoicePhase='question';mediLocalReply('Invia il messaggio','Non hai un medico collegato. Collegane uno dal Menu prima di inviare un messaggio.');return;}
 const body=mediVoiceDraft.trim();if(!body)return;
 mediSetVoiceStatus('Invio del messaggio…');
 const {data,error}=await sb.from('chat_messages').insert({sender_id:state.session.user.id,recipient_id:clinician.clinician_id,body}).select('id').single();
 if(error)throw error;
 mediVoiceDraft='';mediVoicePhase='question';
 state.selectedChatPeer=clinician.clinician_id;
 let notified=false;try{notified=await dispatchChatPush(data.id);}catch(error){console.warn('Chat push after Medi voice message',error);}
 mediLocalReply('Conferma invio',notified?'Messaggio inviato al medico selezionato. Lo trovi nella conversazione.':'Messaggio salvato nella conversazione. La notifica al medico non è stata confermata.');
}
async function mediHandleVoice(utterance){
 const original=String(utterance||'').trim();if(!original)return mediSetVoiceStatus('Tocca il microfono per riprovare.');
 const q=original.toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 try{
  if(mediVoicePhase==='question'&&/\b(non|evita|senza)\b.*\b(aprire|apri|scrivere|scrivi|inviare|invia|mandare|manda)\b/.test(q)){await mediRunQuery({inputId:'mediQuestion',answerId:'mediAnswer',mode:'conversation',question:original});return;}
  if(mediVoicePhase==='question'){const action=localPatientAction(original);if(action){await executePatientAction(action);return;}}
  if(mediVoicePhase==='confirm'){
   if(/^(si|certo|confermo|invia|manda|ok)(\b|[.!])/i.test(q))return await mediSendVoiceDraft();
   if(/^(no|annulla|cancella|non inviare)(\b|[.!])/i.test(q)){mediVoiceDraft='';mediVoicePhase='question';mediLocalReply(original,'Ho annullato il messaggio. Che altro posso fare?');return;}
   mediLocalReply(original,'Per inviare il messaggio, di’ confermo. Per scartarlo, di’ annulla.');return;
  }
  if(mediVoicePhase==='draft'){
   mediVoiceDraft=original.slice(0,2000);mediVoicePhase='confirm';
   mediLocalReply('Dettatura del messaggio',`Ho preparato questo messaggio: ${mediVoiceDraft}. Vuoi inviarlo al medico selezionato? Di’ confermo oppure annulla.`);return;
  }
  if(/\b(scrivi|manda|invia|avvisa|messaggio)\b.*\b(medico|dottoressa|dottore)\b|\b(medico|dottoressa|dottore)\b.*\b(messaggio|scrivi)\b/.test(q)){
   if(!state.careDoctors.length){mediLocalReply(original,'Non hai un medico collegato. Collegane uno dal Menu prima di scrivergli.');return;}
   const draft=original.replace(/^.*?\b(?:medico|dottoressa|dottore)\b\s*(?:che|:)?\s*/i,'').trim();
   if(draft){mediVoiceDraft=draft.slice(0,2000);mediVoicePhase='confirm';mediLocalReply(original,`Ho preparato questo messaggio: ${mediVoiceDraft}. Vuoi inviarlo al medico selezionato? Di’ confermo oppure annulla.`);}
   else {mediVoicePhase='draft';mediLocalReply(original,'Dimmi che cosa vuoi scrivere al tuo medico. Ti rileggerò il messaggio prima di inviarlo.');}
   return;
  }
  if(/\b(farmac|medicine|medicin|pillol|terapi)\w*.*\b(oggi|prendere|assumere)\b|\b(oggi|prendere|assumere)\b.*\b(farmac|medicine|medicin|pillol|terapi)/.test(q))return await mediTodayMedications(original);
  if(/\b(asl|azienda sanitaria)\b/.test(q))return await mediAslContacts(original);
  if(/\b(video|filmato|mostrami|fammi vedere)\b.*\b(soffocament\w*|disostruzion\w*|heimlich)\b/.test(q)){
   mediLocalReply(original,'Ti mostro un video della Croce Rossa Italiana sulle manovre salvavita pediatriche e la guida ufficiale sul soffocamento. Se il soffocamento sta avvenendo ora, chiama subito il 112: non attendere il video.',[
    {title:'Video CRI · manovre salvavita pediatriche',url:'https://www.youtube.com/watch?v=aiDpVAKt3Mw',domain:'youtube.com'},
    {title:'CRI · soffocamento da corpo estraneo',url:'https://cri.it/cosa-facciamo/salute/primo-soccorso/pillole-di-primo-soccorso/soffocamento-da-corpo-estraneo/',domain:'cri.it'}]);return;
  }
  if(/\b(video|filmato|mostrami|fammi vedere)\b.*\b(primo soccorso|rianimazion\w*|manovr\w* salvavita)\b/.test(q)){
   mediLocalReply(original,'Ti mostro un video della Croce Rossa Italiana sulle manovre salvavita. Se c’è un’emergenza in corso, chiama subito il 112 e segui le indicazioni dell’operatore.',[
    {title:'CRI · manovre salvavita',url:'https://www.youtube.com/watch?v=-mcn3S_ZP3M',domain:'youtube.com'},
    {title:'CRI · pillole di primo soccorso',url:'https://cri.it/cosa-facciamo/salute/primo-soccorso/pillole-di-primo-soccorso/',domain:'cri.it'}]);return;
  }
  const mode=/linee guida|raccomandazion/.test(q)?'guidelines':'conversation';
  await mediRunQuery({inputId:'mediQuestion',answerId:'mediAnswer',mode,question:original});
 }catch(error){mediLocalReply(original,error.message||'Non riesco a completare la richiesta. Riprova.');}
}
async function mediGetLocation(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Localizzazione non disponibile.'));navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),e=>reject(new Error(e.message||'Permesso posizione non concesso.')),{enableHighAccuracy:false,timeout:12000,maximumAge:300000});});}
const pendingAslLocations=new Map();
window.meditalyReverseGeocodeResult=(id,json)=>{const pending=pendingAslLocations.get(id);if(!pending)return;pendingAslLocations.delete(id);clearTimeout(pending.timer);try{pending.resolve(JSON.parse(json));}catch{pending.resolve(null);}};
async function currentAslLocation(){
 const userId=state.session?.user?.id;if(!userId)throw new Error('Accedi per vedere i servizi della tua zona.');
 const coordinates=await mediGetLocation();
 if(!window.AndroidBridge?.reverseGeocodeForAsl)throw new Error('La ricerca del comune dalla posizione richiede l’app Android aggiornata.');
 const id=`asl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 const place=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pendingAslLocations.delete(id);reject(new Error('Non riesco a identificare il comune. Inseriscilo in Screening.'));},12000);pendingAslLocations.set(id,{resolve,timer});window.AndroidBridge.reverseGeocodeForAsl(id,coordinates.latitude,coordinates.longitude);});
 const asl=screeningLocalAsl(place?.city,place?.province);
 if(!asl)throw new Error('Non abbiamo ancora verificato la ASL per questa posizione. Inserisci il comune di residenza nella sezione Screening.');
 if(state.session?.user?.id!==userId)throw new Error('Sessione cambiata.');
 state.currentLocation={userId,city:place.city,province:place.province,asl};
 return state.currentLocation;
}
function aslAreaFor(residence){
 if(residence?.residence_city&&residence?.residence_province)return {city:residence.residence_city,province:residence.residence_province,asl:screeningLocalAsl(residence.residence_city,residence.residence_province,residence.residence_municipio),source:'residenza'};
 const loc=state.currentLocation?.userId===state.session?.user?.id?state.currentLocation:null;
 return loc?{...loc,source:'posizione'}:null;
}
async function mediAsk(question,mode='conversation',location=null){
  const q=String(question||'').trim(); if(mode!=='screening'&&!q)throw new Error('Scrivi una domanda per Medi.');
  if(state.session?.access_token&&mode==='conversation')return patientGemini({question:q||'Quali fonti ufficiali consultare per gli screening?',mode,history:mediConversation.slice(-4)});
  const headers={'Content-Type':'application/json','apikey':window.MEDITALY_SUPABASE.publishableKey};
  if(state.session?.access_token)headers.Authorization='Bearer '+state.session.access_token;
  const history=mode==='conversation'?mediConversation.slice(-8):[];
  const r=await fetch(MEDI_ASSISTANT_URL,{method:'POST',headers,body:JSON.stringify({question:q,mode,location,radius_km:50,history})});
  if(!r.ok){let detail='Medi non è disponibile in questo momento.';try{const j=await r.json();detail=j.error||detail;}catch{}throw new Error(detail)}
  return await r.json();
}
function mediRenderAnswer(box,data,options={}){
  const sources=(data?.sources||[]).slice(0,8);
  const answer=esc(data?.answer||'Nessuna risposta disponibile.').replace(/\n/g,'<br>');
  const sourceHtml=sources.length?`<div class="medi-source-list"><strong>Fonti consultate</strong>${sources.map(x=>`<a href="${esc(x.url||'#')}" target="_blank" rel="noopener"><span>${esc(x.title||x.domain||'Fonte')}</span><small>${esc(x.domain||'')}</small></a>`).join('')}</div>`:'';
  if(options.conversation){
    if(!box.querySelector('.medi-dialogue'))box.innerHTML='<div class="medi-dialogue"></div>';
    const dialogue=box.querySelector('.medi-dialogue');
    dialogue.insertAdjacentHTML('beforeend',`<div class="medi-turn user"><small>Tu</small><div>${esc(options.question||'').replace(/\n/g,'<br>')}</div></div><div class="medi-turn assistant"><small>Medi</small><div>${answer}</div>${sourceHtml}${data?.doctor_linked?'<button class="medi-doctor-link" type="button">Scrivi al medico</button>':''}</div>`);
    dialogue.querySelectorAll('.medi-doctor-link').forEach(button=>button.onclick=()=>{mediStopCloud();state.tab='chat';patientView();});
    dialogue.lastElementChild?.scrollIntoView({behavior:'smooth',block:'nearest'});
    return;
  }
  box.innerHTML=`<div class="medi-answer-text">${answer}</div>${sourceHtml}<div class="medi-disclaimer">Informazioni divulgative da fonti pubblicate. Medi non formula diagnosi e non modifica terapie o prescrizioni.</div>`;
}
async function mediRunQuery({inputId,answerId,mode='conversation',autoSpeak=true,question=null}){
  const input=document.getElementById(inputId),box=document.getElementById(answerId);if(!box)return;
  const q=String(question??input?.value??'').trim();if(mode!=='screening'&&!q)return input?.focus();
  if(mediRequestInFlight)return;mediRequestInFlight=true;
  const local=localPatientAction(q);if(local){mediRequestInFlight=false;await executePatientAction(local);return;}
  const previous=box.innerHTML;
  if(mode==='conversation')box.insertAdjacentHTML('beforeend','<div class="medi-thinking" id="mediThinking">Medi sta pensando…</div>');
  else box.innerHTML=msg(mode==='screening'?'Cerco campagne di screening nella tua zona…':'Cerco nelle fonti sanitarie pubblicate…');
  try{
    let loc=null;if(mode==='screening'){loc=await mediGetLocation();}
    const data=await mediAsk(q,mode,loc);document.getElementById('mediThinking')?.remove();
    if(await executePatientAction(data))return;
    mediRenderAnswer(box,data,{conversation:mode==='conversation',question:q});
    if(mode==='conversation'){mediConversation.push({role:'user',content:q},{role:'assistant',content:String(data?.answer||'')});mediConversation=mediConversation.slice(-10);if(input)input.value='';}
    if(autoSpeak&&data?.answer)await mediSpeakCloud(data.answer,mediVoiceActive?mediListen:null);
  }catch(e){document.getElementById('mediThinking')?.remove();if(mode==='conversation'){box.innerHTML=previous;box.insertAdjacentHTML('beforeend',msg(e.message||'Impossibile completare la richiesta.','error'));}else box.innerHTML=msg(e.message||'Impossibile completare la richiesta.','error');if(mediVoiceActive)mediSpeakCloud(e.message||'Non riesco a rispondere ora. Riprova.',mediListen);}
  finally{mediRequestInFlight=false;}
}
function isCiroAdminAccount(){return (state.session?.user?.email||'').toLowerCase()===CIRO_ADMIN_EMAIL;}
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = d => d ? new Date(d).toLocaleDateString('it-IT') : '—';

let meditalyLastPushToken=null;
window.onMeditalyPushToken=async(token)=>{
  try{
    if(!state.session || !token) return;
    const {error}=await sb.rpc('register_my_push_token',{p_token:token,p_platform:'android',p_device_label:'Meditaly Android'});
    if(error){state.pushStatus='Registrazione notifiche non riuscita: '+error.message;console.warn('Push token registration failed',error.message);}
    else {state.pushStatus='Dispositivo registrato per le notifiche';meditalyLastPushToken=token;if(state.tab==='home')patientHome();}
  }catch(e){console.warn('Push token registration failed',e);}
};
window.onMeditalyPushUnavailable=(reason)=>{state.pushStatus='Notifiche non disponibili: '+reason;console.info('Meditaly push unavailable:',reason);};
async function syncPushToken(){
  if(state.session && window.AndroidBridge && typeof window.AndroidBridge.requestPushToken==='function'){
    try{window.AndroidBridge.requestPushToken();}catch(e){console.warn('Push token request failed',e);}
  }
}
async function safeSignOut(){
  cancelPatientWelcome();state.lastPatientUser=null;state.lastGreetingAt=0;
  try{
    window.AndroidBridge?.setMediWakeEnabled?.(false);
    if(meditalyLastPushToken && state.session){await sb.rpc('unregister_my_push_token',{p_token:meditalyLastPushToken});}
    if(state.session && window.AndroidBridge?.cancelDailyReminder){
      const key=`meditaly-reminders-${state.session.user.id}`;
      for(const id of JSON.parse(localStorage.getItem(key)||'[]')) AndroidBridge.cancelDailyReminder(`med-${id}`);
      AndroidBridge.cancelDailyReminder(`adherence-${state.session.user.id}`);
      AndroidBridge.cancelDailyReminder(`checkin-${state.session.user.id}`);
      localStorage.removeItem(key);
    }
  }catch(e){console.warn('Push token unregister failed',e);}
  await sb.auth.signOut();
}
async function dispatchPush(outboxId){
  if(!outboxId || !state.session) return false;
  try{
    const r=await fetch('https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/dispatch-push',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+state.session.access_token,'apikey':window.MEDITALY_SUPABASE.publishableKey},
      body:JSON.stringify({outbox_id:outboxId})
    });
    if(!r.ok){console.warn('Push dispatch not completed',await r.text());return false;}
    return true;
  }catch(e){console.warn('Push dispatch failed',e);return false;}
}
async function dispatchChatPush(messageId){
 if(!messageId || !state.session) return false;
 try{
  const {data,error}=await sb.functions.invoke('dispatch-chat-push',{body:{message_id:messageId}});
  if(error || !data?.ok){console.warn('Chat push not delivered',error||data?.reason);return false;}
  return true;
 }catch(error){console.warn('Chat push unavailable',error);return false;}
}
window.openMeditalyMessages=()=>window.openMeditalyTab('chat');
async function showChatNotification(messageId){
 const uid=state.session?.user?.id;if(!uid)return;
 const validId=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(messageId||'');
 let query=sb.from('chat_messages').select('id,sender_id,recipient_id,body,sent_at').eq('recipient_id',uid);
 if(validId)query=query.eq('id',messageId);
 else query=query.eq('is_read',false).order('sent_at',{ascending:false}).limit(1);
 let {data:messages,error}=await query;
 if(!validId&&!messages?.length&&!error){({data:messages,error}=await sb.from('chat_messages').select('id,sender_id,recipient_id,body,sent_at').eq('recipient_id',uid).order('sent_at',{ascending:false}).limit(1));}
 if(state.session?.user?.id!==uid)return;
 if(error||!messages?.length){mediVoiceNotice('Il messaggio non è disponibile per questo account.');window.openMeditalyTab('chat');return;}
 const message=messages[0];
 const {data:sender}=await sb.from('profiles').select('full_name').eq('id',message.sender_id).maybeSingle();
 if(state.session?.user?.id!==uid)return;
 document.getElementById('betaLaunchNotice')?.remove();
 if(state.profile?.role==='Clinician'){state.tab='messages';state.selectedClinicianChat=message.sender_id;await clinicianView();}
 else if(state.profile?.role==='Administrator'){state.adminArea=true;state.tab='test_messages';state.selectedTestPatient=message.sender_id;await render();}
 else{state.adminArea=false;state.tab='chat';state.selectedChatPeer=message.sender_id;state.selectedCareDoctor=message.sender_id;await render();}

}
window.openMeditalyChatNotification=(messageId='')=>{
 if(!state.session||!state.profile)return false;
 void showChatNotification(String(messageId||'')).catch(error=>{console.warn('Anteprima messaggio non disponibile',error);mediVoiceNotice('Impossibile aprire il messaggio.');});
 return true;
};
let focusCheckinFromNotification=false;
let notificationCheckinMood=null;
window.openMeditalyCheckinAction=(action)=>{
  if(!state.session||!['Patient','Administrator'].includes(state.profile?.role))return false;
  document.getElementById('betaLaunchNotice')?.remove();
  const mood=action?.status;
  if(!['start','green','yellow','red'].includes(mood))return true;
  if(action.patient_id!==state.session.user.id){mediVoiceNotice('Questa notifica appartiene a un altro account. Accedi con il tuo profilo per rispondere.');return true;}
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
  if(action.date!==today){mediVoiceNotice('Il promemoria selezionato è scaduto. Puoi fare il check-in di oggi.');return window.openMeditalyTab('checkin');}
  notificationCheckinMood=mood;
  state.adminArea=false;state.tab='home';render();
  return true;
};
window.openMeditalyTab=(tab)=>{
  if(!state.session||!state.profile)return false;
  document.getElementById('betaLaunchNotice')?.remove();
  if(state.profile.role==='Clinician'){state.tab=tab==='chat'?'messages':tab||'dashboard';render();return true;}
  if(state.profile.role==='Administrator'&&tab==='chat'){state.adminArea=true;state.tab='test_messages';render();return true;}
  if(!['Patient','Administrator'].includes(state.profile.role))return false;
  focusCheckinFromNotification=tab==='checkin';
  state.adminArea=false;
  state.tab=tab==='checkin'?'home':tab||'home';
  if(state.tab==='chat')state.selectedChatPeer=null;
  render();
  return true;
};
window.openMeditalyTherapyReminder=(slot)=>{
 if(!state.session || !state.profile)return false;
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot))return false;
 pendingTherapySpeechSlot=slot;
 return window.openMeditalyTab('therapy');
};
window.onMeditalyAppResume=()=>{
 if(window.MeditalyAudio?.busy()||window.MeditalyCalls?.busy())return;
 if(!state.session)return;
 if(state.tab==='devices'&&!meditalyConnectPending&&meditalyDevicePageActive()){window.AndroidBridge?.readPhoneHealth?.(meditalyHealthRequest);return;}
 void syncPushToken();
 if((state.profile?.role==='Clinician'&&state.tab==='messages')||state.tab==='chat'||state.tab==='test_messages'){
  void refreshActiveChat();return;
 }
 if(!['Patient','Administrator'].includes(state.profile?.role)||state.adminArea||state.greetingInFlight||mediVoiceActive||state.tab!=='home'||activeCheckin)return;
 if(Date.now()-state.lastGreetingAt<30000)return;
 state.homeVoicePending=true;patientView();
};
const meditalyTabHistory=[];
let meditalyHistoryUser=null,meditalyReturning=false;
window.meditalyHandleBack=()=>{
  const visible=[...document.querySelectorAll('.medi-modal,.sheet,.modal')].find(x=>!x.classList.contains('hidden')&&getComputedStyle(x).display!=='none');
  if(visible){const close=visible.querySelector('.medi-close,[id^="close"]');if(close)close.click();else visible.classList.add('hidden');return true;}
  if(!state.session){const back=document.getElementById('backToLogin');if(back&&!back.classList.contains('hidden')){back.click();return true;}return false;}
  if(state.adminArea){document.getElementById('backPatientArea')?.click();return true;}
  if(state.profile?.role==='Clinician'){if(state.tab!=='patients'){state.tab='patients';clinicianView();return true;}return false;}
  if(['Patient','Administrator'].includes(state.profile?.role)){
    if(document.querySelector('.doctor-onboarding'))return false;
    if(meditalyTabHistory.length>1){meditalyTabHistory.pop();const previous=meditalyTabHistory[meditalyTabHistory.length-1];meditalyReturning=true;state.tab=previous;Promise.resolve(patientView()).finally(()=>{meditalyReturning=false;});return true;}
    if(state.tab!=='home'){state.tab='home';patientView();return true;}
  }
  return false;
};
window.consumeMeditalyNativeTab=()=>{
  try{
    if(!state.session || !state.profile || !window.AndroidBridge || typeof window.AndroidBridge.consumeInitialTab!=='function') return;
    const call=String(window.AndroidBridge.consumeInitialCall?.()||'').trim();
    if(call){const action=JSON.parse(call);window.openMeditalyCall(action.id,action.action);return;}
    const intake=String(window.AndroidBridge.consumeInitialIntakeAction?.()||'').trim();
    if(intake){window.openMeditalyIntakeAction(JSON.parse(intake));return;}
    const action=String(window.AndroidBridge.consumeInitialCheckinAction?.()||'').trim();
    if(action){window.openMeditalyCheckinAction(JSON.parse(action));return;}
    const slot=String(window.AndroidBridge.consumeInitialTherapySlot?.()||'').trim();
    const tab=String(window.AndroidBridge.consumeInitialTab()||'').trim();
    if(tab==='therapy' && slot && window.openMeditalyTherapyReminder(slot))return;
    if(tab==='chat'){window.openMeditalyChatNotification(String(window.AndroidBridge.consumeInitialChatMessageId?.()||''));return;}
    if(tab)window.openMeditalyTab(tab);
  }catch(e){console.warn('Native navigation unavailable',e);}
};
const msg = (t,type='notice') => `<div class="notice ${type}">${esc(t)}</div>`;
function shell(content){return `<div class="shell">${content}</div>`}
function navButton(id,label){return `<button class="btn secondary" data-tab="${id}">${label}</button>`}
function bindNav(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=async()=>{
 if(b.dataset.tab==='chat'&&b.dataset.openDoctorChat==='true'){
  try{const doctor=chosenCareDoctor()||await getAssignedClinician();state.selectedChatPeer=doctor?.clinician_id||null;}
  catch(e){console.warn('Contatto medico non disponibile',e);state.selectedChatPeer=null;}
 }else if(b.dataset.tab==='chat')state.selectedChatPeer=null;
 state.tab=b.dataset.tab;await render();
})}
function showBetaLaunchNotice(){
  if(localStorage.getItem('meditaly_beta_notice_acknowledged')==='1')return;
  if(document.getElementById('betaLaunchNotice'))return;
  const overlay=document.createElement('div');
  overlay.id='betaLaunchNotice';
  overlay.className='modal beta-launch-overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','betaLaunchTitle');
  overlay.innerHTML=`<div class="modal-card beta-launch-card"><div class="beta-launch-mark" aria-hidden="true">β</div><div class="eyebrow dark">VERSIONE SPERIMENTALE</div><h2 id="betaLaunchTitle">Meditaly è in fase beta</h2><p>Stai utilizzando una versione sperimentale: alcune funzioni possono cambiare o non essere ancora disponibili. Verifica sempre con il tuo medico le indicazioni sul tuo percorso e non modificare la terapia sulla base dell’app.</p><p class="small muted">Per urgenze non usare i messaggi dell’app: chiama il 112 o rivolgiti ai servizi sanitari competenti.</p><button id="closeBetaLaunchNotice" class="btn full" type="button">Ho capito, continua</button></div>`;
  document.body.appendChild(overlay);
  const close=()=>{localStorage.setItem('meditaly_beta_notice_acknowledged','1');overlay.remove();};
  overlay.querySelector('#closeBetaLaunchNotice').addEventListener('click',close);
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  overlay.querySelector('#closeBetaLaunchNotice').focus();
}
async function boot(){const {data:{session}}=await sb.auth.getSession(); state.session=session; if(session){await loadProfile();await persistPendingLegal();await syncPushToken();await ensureChatRealtime();} await render(); showBetaLaunchNotice(); if(session)setTimeout(()=>window.consumeMeditalyNativeTab?.(),150); sb.auth.onAuthStateChange((event,s)=>{const previousUser=state.session?.user.id;state.session=s;if(event==='TOKEN_REFRESHED'||(event==='INITIAL_SESSION'&&previousUser===s?.user.id))return;setTimeout(async()=>{try{if(s!==state.session)return;if(s){await loadProfile();await persistPendingLegal();await syncPushToken();await ensureChatRealtime();}else{MeditalyAudio.cancel();MeditalyCalls.init(sb,null,false);await stopChatRealtime();state.selectedClinicianChat=null;state.profile=null;state.residencePromptCheckedFor=null;mediWakeEnabled=false;window.AndroidBridge?.setMediWakeEnabled?.(false);}await render();if(s)setTimeout(()=>window.consumeMeditalyNativeTab?.(),150);}catch(error){console.error('Ripristino sessione non riuscito',error);}},0);});}
async function refreshActiveChat(){
 if(!state.session||!content)return;
 const oldThread=document.getElementById('chatThread');
 const previousScroll=oldThread?.scrollTop;
 const pinnedToBottom=oldThread?oldThread.scrollHeight-oldThread.scrollTop-oldThread.clientHeight<90:true;
 const input=document.querySelector('#chatBody,#clinicianChatBody,#adminTestBody');
 const draft=input?.value||'',focus=input===document.activeElement,selection=input?.selectionStart;
 if(state.adminArea&&state.tab==='test_messages')await adminTestMessages();
 else if(state.profile?.role==='Clinician'&&state.tab==='messages')await clinicianMessages();
 else if(!state.adminArea&&state.tab==='chat')await patientChat();
 else if(state.tab==='home'&&state.profile?.role==='Patient')await patientHome();
 const restored=document.querySelector('#chatBody,#clinicianChatBody,#adminTestBody');
 if(restored&&draft){restored.value=draft;restored.dispatchEvent(new Event('input'));if(focus){restored.focus();restored.setSelectionRange(selection,selection);}}
 const newThread=document.getElementById('chatThread');
 if(newThread&&!pinnedToBottom){newThread.dataset.keepScroll='true';newThread.scrollTop=previousScroll;}
}
async function stopChatRealtime(){
 clearInterval(state.chatPollTimer);state.chatPollTimer=null;
 clearTimeout(state.chatRefreshTimer);
 if(state.chatChannel)await sb.removeChannel(state.chatChannel);
 state.chatChannel=null;state.chatChannelFor=null;state.lastIncomingChatId=null;
}
async function ensureChatRealtime(){
 const uid=state.session?.user?.id;if(!uid||state.chatChannelFor===uid)return;
 await stopChatRealtime();state.chatChannelFor=uid;
 const refresh=()=>{clearTimeout(state.chatRefreshTimer);state.chatRefreshTimer=setTimeout(()=>{if(state.session?.user?.id===uid)void refreshActiveChat();},80);};
 state.chatChannel=sb.channel(`meditaly-chat-${uid}`)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:`recipient_id=eq.${uid}`},payload=>{state.lastIncomingChatId=payload.new?.id||null;refresh();})
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_messages',filter:`sender_id=eq.${uid}`},refresh)
  .subscribe(status=>{if(status==='SUBSCRIBED')refresh();});
 // Recupera i messaggi persi quando la connessione Realtime era sospesa.
 state.chatPollTimer=setInterval(async()=>{
  if(state.session?.user?.id!==uid||!['chat','messages','test_messages'].includes(state.tab))return;
  const {data,error}=await sb.from('chat_messages').select('id').eq('recipient_id',uid).order('sent_at',{ascending:false}).limit(1);
  if(error||!data?.length)return;
  if(state.lastIncomingChatId!==data[0].id)refresh();
  state.lastIncomingChatId=data[0].id;
 },5000);
}
async function loadProfile(){const {data,error}=await sb.from('profiles').select('*').eq('id',state.session.user.id).single(); if(error) throw error; state.profile=data;}
function authView(){
  app.innerHTML=`<div class="auth-shell final-auth auth-option-b">
    <div class="auth-stage">
      <header class="login-brandbar">
        <div class="brand-lockup">
          <div class="brand-mark login-clinical-mark" aria-hidden="true">M<span>+</span></div>
          <div><div class="brand-name">Meditaly</div><div class="brand-payoff">La tua salute, ogni giorno</div></div>
        </div>
      </header>
      <section class="login-hero-card">
        <div class="login-hero-copy">
          <span class="login-kicker">BENTORNATO</span>
          <h1>Prenditi cura<br><span>di te, ogni giorno.</span></h1>
          <p>Ritrova il tuo medico e il tuo percorso.</p>
          <div class="login-feature-row">
            <div class="login-feature therapy"><span class="login-feature-icon therapy">●</span><div><strong>Terapie</strong><small>Promemoria e piano</small></div></div>
            <div class="login-feature control"><span class="login-feature-icon control">◷</span><div><strong>Controlli</strong><small>Scadenze ordinate</small></div></div>
            <div class="login-feature reports"><span class="login-feature-icon reports">▤</span><div><strong>Referti</strong><small>Documenti protetti</small></div></div>
          </div>
        </div>
        <div class="login-medi-wrap"><div class="login-b-heart" aria-hidden="true"><svg viewBox="0 0 90 90" fill="none"><path d="M24 42c0-11 10-20 21-20s21 9 21 20c0 16-16 27-21 30-5-3-21-14-21-30Z" fill="#116475"/><path d="M30 44h10l5-9 5 18 5-9h7" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><button class="guest-medi-pill" id="guestMediLaunch" type="button"><strong>Medi</strong><span>Linee guida e screening</span><b>↗</b></button></div>
      </section>
      <section class="auth-card card final-login-card">
        <div class="login-card-heading"><span class="login-mini-shield">✓</span><div><h2>Accedi in sicurezza</h2><p>Il tuo spazio sanitario protetto.</p></div></div>
        <div id="authMsg" role="status" aria-live="polite"></div>
        <div class="field"><label>Email</label><div class="auth-input-wrap"><span class="auth-input-icon email">@</span><input class="input" id="email" type="email" autocomplete="email" placeholder="nome@email.it"></div></div>
        <div class="field"><div class="field-head"><label>Password</label><button class="text-link" id="forgotPassword" type="button">Password dimenticata?</button></div><div class="password-wrap auth-input-wrap"><span class="auth-input-icon password">◆</span><input class="input password-input" id="password" type="password" autocomplete="current-password" placeholder="La tua password"><button class="password-eye" id="togglePassword" type="button" aria-label="Mostra password" aria-pressed="false" title="Mostra password"><span class="eye-open" aria-hidden="true">👁</span></button></div></div>
        <div id="registrationFields" class="registration-fields hidden">
          <div class="field"><label>Nome e cognome</label><div class="auth-input-wrap"><span class="auth-input-icon profile">●</span><input class="input" id="fullName" autocomplete="name" placeholder="Nome Cognome"></div></div>
          <div class="field"><label for="confirmPassword">Ripeti password</label><div class="auth-input-wrap"><span class="auth-input-icon password">◆</span><input class="input" id="confirmPassword" type="password" autocomplete="new-password" placeholder="Ripeti la password scelta"></div></div>
          <div class="legal-box login-legal-box">
            <label class="check-row"><input id="ackPrivacy" type="checkbox"><span>Ho letto l'<a href="https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/legal-docs?doc=privacy" target="_blank">Informativa privacy v2.2</a>.</span></label>
            <label class="check-row"><input id="ackTerms" type="checkbox"><span>Accetto i <a href="https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/legal-docs?doc=terms" target="_blank">Termini di utilizzo v2.2</a>.</span></label>
            <label class="check-row"><input id="ackSecurity" type="checkbox"><span>Ho letto le <a href="https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/legal-docs?doc=security" target="_blank">informazioni sulla sicurezza v2.2</a>.</span></label>
            <label class="check-row"><input id="consentBeta" type="checkbox"><span>Acconsento, ove applicabile, al trattamento dei dati sanitari per le finalità beta descritte nell'informativa.</span></label>
          </div>
          <div class="beta-note"><strong>Beta controllata</strong><span>Il 2FA di clinici e amministratori è temporaneamente sospeso fino alla prossima riattivazione.</span></div>
        </div>
        <button class="btn full login-primary" id="login">Entra in Meditaly <span>→</span></button>
        <button class="btn full login-primary hidden" id="registerSubmit">Crea account <span>→</span></button>
        <div class="login-divider"><span>oppure</span></div>
        <button class="btn full login-outline" id="signup">Crea account</button>
        <button class="text-link full hidden" id="backToLogin" type="button">Hai già un account? Accedi</button>
        <div class="login-trust"><span class="secure">HTTPS</span><span class="roles">Permessi per ruolo</span><span class="docs">Documenti v2.2</span></div>
      </section>
      <aside class="sponsored-banner"><span>PUBBLICITÀ</span><div><strong>Assumi integratore XXX</strong><small>Messaggio pubblicitario separato dai contenuti clinici di Meditaly.</small></div><button type="button">Scopri</button></aside>
      <div id="guestMediModal" class="medi-modal hidden"><div class="medi-modal-card medi-assistant-card"><button class="medi-close" id="closeGuestMedi">×</button><img src="medi-avatar.png" alt="Medi"><div class="medi-assistant-main"><div class="eyebrow dark">Medi · accesso senza account</div><div class="medi-title-row"><h2>Ciao, come stai oggi?</h2><button class="medi-speak small" id="guestMediSpeak" aria-label="Ascolta Medi">🔊</button></div><p>Ti riassumo e spiego le linee guida pubblicate. Dimmi la patologia o l’argomento, oppure posso cercare campagne di screening vicino a te.</p><div class="medi-query-row"><textarea id="guestMediQuestion" class="textarea" rows="3" placeholder="Es. diabete, pressione alta, sclerosi multipla…"></textarea><button class="medi-mic" id="guestMediMic" type="button" aria-label="Parla con Medi">🎙️</button></div><div class="medi-actions"><button class="btn" id="guestMediGuidelines">Linee guida</button><button class="btn secondary" id="guestMediScreening">Screening entro 50 km</button></div><div id="guestMediAnswer" class="medi-answer"></div><p class="small muted">Non serve accedere. Per gli screening Meditaly chiede la posizione solo al momento della ricerca. La voce usa la sintesi disponibile sul dispositivo quando presente.</p></div></div></div>
      <footer class="auth-copyright">Meditaly è stata creata da <strong>Ciro Maiello</strong><br>© 2026 Ciro Maiello · Tutti i diritti riservati.</footer>
    </div>
  </div>`;
  const el=id=>document.getElementById(id);
  const setRegistrationMode=(on)=>{
    el('registrationFields').classList.toggle('hidden',!on);
    el('forgotPassword').classList.toggle('hidden',on);
    el('authMsg').textContent='';
    el('password').autocomplete=on?'new-password':'current-password';
    el('login').classList.toggle('hidden',on);
    el('registerSubmit').classList.toggle('hidden',!on);
    el('signup').classList.toggle('hidden',on);
    el('backToLogin').classList.toggle('hidden',!on);
    if(on) setTimeout(()=>el('fullName')?.focus(),80);
  };
  el('signup').onclick=()=>setRegistrationMode(true);
  el('backToLogin').onclick=()=>setRegistrationMode(false);
  el('togglePassword').onclick=()=>{
    const input=el('password'), btn=el('togglePassword');
    const showing=input.type==='text';
    input.type=showing?'password':'text';
    btn.setAttribute('aria-pressed',String(!showing));
    btn.setAttribute('aria-label',showing?'Mostra password':'Nascondi password');
    btn.title=showing?'Mostra password':'Nascondi password';
    btn.querySelector('.eye-open').textContent=showing?'👁':'🙈';
    input.focus();
  };
  el('login').onclick=async()=>{try{const {error}=await sb.auth.signInWithPassword({email:el('email').value.trim(),password:el('password').value}); if(error)throw error}catch(e){const invalid=e.code==='invalid_credentials'||/invalid login credentials/i.test(e.message||'');el('authMsg').innerHTML=msg(invalid?'Email o password non corrispondono. Se hai appena confermato la registrazione, usa la password scelta alla prima iscrizione. Puoi impostarne una nuova con “Password dimenticata?”.':e.message,'error')}};
  el('forgotPassword').onclick=async()=>{
    const button=el('forgotPassword');
    if(button.disabled)return;
    button.disabled=true;
    try{
      const emailValue=el('email').value.trim();
      if(!emailValue) throw new Error('Inserisci prima il tuo indirizzo email.');
      const {error}=await sb.auth.resetPasswordForEmail(emailValue,{redirectTo:'https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/password-reset'});
      if(error) throw error;
      el('authMsg').innerHTML=msg('Se questo indirizzo è registrato, riceverai un link per impostare una nuova password. Controlla anche la cartella spam.','ok');
    }catch(e){
      const limited=e.code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(e.message||'');
      el('authMsg').innerHTML=msg(limited?'Il servizio email ha raggiunto il limite temporaneo del progetto. Nessuna email è stata inviata: riprova più tardi.':e.message,'error');
    }finally{button.disabled=false}
  };
  el('registerSubmit').onclick=async()=>{
    const button=el('registerSubmit');
    if(button.disabled)return;
    button.disabled=true;
    try{
      const emailValue=el('email').value.trim(), passwordValue=el('password').value, nameValue=el('fullName').value.trim();
      if(!nameValue) throw new Error('Inserisci nome e cognome.');
      if(passwordValue.length<8) throw new Error('La password deve contenere almeno 8 caratteri.');
      if(passwordValue!==el('confirmPassword').value) throw new Error('Le due password non coincidono. Ricontrollale prima di registrarti.');
      if(!el('ackPrivacy').checked || !el('ackTerms').checked || !el('ackSecurity').checked || !el('consentBeta').checked) throw new Error('Per registrarti devi completare le prese visioni e il consenso beta richiesto.');
      const pending={privacy:true,terms:true,security:true,beta:true,version:LEGAL_VERSION,createdAt:new Date().toISOString()};
      localStorage.setItem('meditaly_pending_legal',JSON.stringify(pending));
      const {data,error}=await sb.auth.signUp({email:emailValue,password:passwordValue,options:{
        data:{full_name:nameValue,privacy_version:LEGAL_VERSION,terms_version:LEGAL_VERSION,security_notice_version:LEGAL_VERSION,beta_consent_version:LEGAL_VERSION},
        emailRedirectTo:'https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/account-confirmed'
      }});
      if(error)throw error;
      el('authMsg').innerHTML=msg('Se è un nuovo account riceverai l’email di conferma. Se hai già usato questo indirizzo, scegli “Accedi” oppure “Password dimenticata?”: una nuova registrazione non cambia la password esistente.','ok');
      if(data.session) await persistPendingLegal();
    }catch(e){const limited=e.code==='over_email_send_rate_limit'||/email rate limit exceeded/i.test(e.message||'');el('authMsg').innerHTML=msg(limited?'Il servizio email ha raggiunto il limite temporaneo del progetto. La conferma non è stata inviata; riprova più tardi oppure, se hai già un account, torna ad Accedi.':e.message,'error')}
    finally{button.disabled=false}
  };
  const guestModal=el('guestMediModal');
  const openGuestMedi=()=>{guestModal.classList.remove('hidden');};
  el('guestMediLaunch').onclick=openGuestMedi;
  el('closeGuestMedi').onclick=()=>guestModal.classList.add('hidden');
  guestModal.onclick=e=>{if(e.target===guestModal)guestModal.classList.add('hidden')};
  el('guestMediSpeak').onclick=()=>mediSpeakCloud('Ciao, come stai oggi?');
  el('guestMediMic').onclick=()=>mediStartVoiceInput('guestMediQuestion');
  el('guestMediGuidelines').onclick=()=>mediRunQuery({inputId:'guestMediQuestion',answerId:'guestMediAnswer',mode:'guidelines'});
  el('guestMediScreening').onclick=()=>mediRunQuery({inputId:'guestMediQuestion',answerId:'guestMediAnswer',mode:'screening'});
}
async function persistPendingLegal(){
  const raw=localStorage.getItem('meditaly_pending_legal');
  if(!raw || !state.session) return;
  try{
    const p=JSON.parse(raw); const rows=[];
    if(p.privacy) rows.push({patient_id:state.session.user.id,consent_type:'PRIVACY_ACKNOWLEDGEMENT',document_version:p.version,granted:true});
    if(p.terms) rows.push({patient_id:state.session.user.id,consent_type:'TERMS_ACCEPTANCE',document_version:p.version,granted:true});
    if(p.security) rows.push({patient_id:state.session.user.id,consent_type:'SECURITY_NOTICE_ACKNOWLEDGEMENT',document_version:p.version,granted:true});
    if(p.beta) rows.push({patient_id:state.session.user.id,consent_type:'BETA_HEALTH_DATA_CONSENT',document_version:p.version,granted:true});
    if(rows.length){const {error}=await sb.from('privacy_consents').insert(rows); if(error) throw error;}
    localStorage.removeItem('meditaly_pending_legal');
  }catch(e){console.warn('Pending legal consent not yet persisted',e);}
}
async function requireMFA(){if(!APP_MFA_ENABLED || !state.profile || state.profile.role==='Patient' || isCiroAdminAccount()) return false; const {data,error}=await sb.auth.mfa.getAuthenticatorAssuranceLevel(); if(error) throw error; state.mfa=data; return data.currentLevel!=='aal2';}
function mfaQrSrc(qr){if(!qr)return ''; if(qr.startsWith('data:'))return qr; if(qr.trim().startsWith('<svg'))return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr); return qr;}
function openGoogleAuthenticator(uri){try{if(window.AndroidBridge&&typeof window.AndroidBridge.openAuthenticator==='function'){window.AndroidBridge.openAuthenticator(uri);return;} window.location.href=uri;}catch(e){console.warn(e)}}
function copyMfaSecret(secret){try{if(window.AndroidBridge&&typeof window.AndroidBridge.copyText==='function'){window.AndroidBridge.copyText(secret);return;} navigator.clipboard?.writeText(secret);}catch(e){console.warn(e)}}
function mfaRoleLabel(){return state.profile?.role==='Administrator'?'amministratore':'medico';}
async function waitForAAL2(){
  for(let i=0;i<6;i++){
    const {data:{session}}=await sb.auth.getSession();
    if(session) state.session=session;
    const {data,error}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if(!error && data){state.mfa=data;if(data.currentLevel==='aal2')return true;}
    await new Promise(r=>setTimeout(r,220));
  }
  try{
    const refreshed=await sb.auth.refreshSession();
    if(refreshed?.data?.session) state.session=refreshed.data.session;
    const {data}=await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    state.mfa=data;
    return data?.currentLevel==='aal2';
  }catch(_){return false;}
}
async function verifyTotpWithRetry(factorId, codeEl, box, button, successLabel='Verifica OTP e accedi'){
  const code=codeEl.value.replace(/\D/g,'').slice(0,6);
  codeEl.value=code;
  if(code.length!==6){box.innerHTML=msg('Inserisci un codice OTP di 6 cifre.','error');codeEl.focus();return false;}
  if(button.dataset.busy==='1') return false;
  button.dataset.busy='1';
  button.disabled=true;
  const normalText=button.dataset.normalText||button.textContent||successLabel;
  button.dataset.normalText=normalText;
  button.textContent='Verifica in corso…';
  box.innerHTML='';
  try{
    const res=await sb.auth.mfa.challengeAndVerify({factorId,code});
    if(res.error){
      const codeName=res.error.code||'';
      codeEl.value='';
      const text=codeName==='mfa_challenge_expired'
        ? 'La verifica è scaduta. È già pronta una nuova verifica: inserisci il codice OTP corrente e riprova.'
        : 'Codice OTP non valido o scaduto. Attendi il codice corrente di Google Authenticator e riprova: non devi rifare la configurazione.';
      box.innerHTML=msg(text,'error');
      setTimeout(()=>codeEl.focus(),120);
      return false;
    }
    box.innerHTML=msg('Codice verificato. Accesso in corso…','ok');
    const ready=await waitForAAL2();
    if(!ready){
      const refreshed=await sb.auth.refreshSession();
      if(refreshed?.data?.session) state.session=refreshed.data.session;
    }
    return true;
  }catch(e){
    codeEl.value='';
    box.innerHTML=msg('Verifica non completata. Puoi riprovare subito con il nuovo codice OTP.','error');
    setTimeout(()=>codeEl.focus(),120);
    return false;
  }finally{
    button.dataset.busy='0';
    button.disabled=false;
    button.textContent=normalText;
  }
}

async function clearPendingTotpFactors(factors){
  for(const f of (factors||[]).filter(f=>f.status!=='verified')){
    try{await sb.auth.mfa.unenroll({factorId:f.id});}catch(e){console.warn('Unable to clear pending MFA factor',e);}
  }
}

async function mfaView(){
  const {data,error}=await sb.auth.mfa.listFactors();
  if(error){
    app.innerHTML=shell(`<div class="mfa-shell"><section class="mfa-card"><div class="mfa-icon">!</div><h1>Impossibile verificare il 2FA</h1><p>${esc(error.message)}</p><button class="btn" id="retryMfa">Riprova</button></section></div>`);
    document.getElementById('retryMfa').onclick=()=>render();
    return;
  }

  const totp=data?.totp||[];
  const verified=totp.find(f=>f.status==='verified');
  if(verified){
    app.innerHTML=shell(`<div class="mfa-shell"><section class="mfa-card"><div class="mfa-brand"><div class="brand-mark meditaly-heart-mark"><img src="brand-heart.png" alt="" aria-hidden="true"></div><div><strong>Meditaly</strong><small>Accesso clinico protetto</small></div></div><div class="mfa-icon shield">✓</div><div class="eyebrow dark">SECONDO FATTORE</div><h1>Inserisci il codice OTP</h1><p>Apri <strong>Google Authenticator</strong> e inserisci il codice a 6 cifre associato a Meditaly.</p><button class="btn ghost mfa-secondary-action" id="openGa">Apri Google Authenticator</button><div class="mfa-code-wrap"><input id="code" class="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000"></div><button class="btn mfa-primary" id="verify">Verifica OTP e accedi</button><div id="mfaMsg"></div><div class="mfa-help">Se sbagli codice, puoi riprovare subito: Meditaly crea una nuova verifica senza bloccarti.</div></section></div>`);
    document.getElementById('openGa').onclick=()=>openGoogleAuthenticator('');
    const codeEl=document.getElementById('code'),box=document.getElementById('mfaMsg'),btn=document.getElementById('verify');
    codeEl.oninput=()=>{codeEl.value=codeEl.value.replace(/\D/g,'').slice(0,6)};
    const verify=async()=>{if(await verifyTotpWithRetry(verified.id,codeEl,box,btn)){await render();}};
    btn.onclick=verify; codeEl.onkeydown=e=>{if(e.key==='Enter')verify()};
    setTimeout(()=>codeEl.focus(),120);
    return;
  }

  const pending=totp.find(f=>f.status!=='verified');
  if(pending){
    app.innerHTML=shell(`<div class="mfa-shell"><section class="mfa-card setup"><div class="mfa-brand"><div class="brand-mark meditaly-heart-mark"><img src="brand-heart.png" alt="" aria-hidden="true"></div><div><strong>Meditaly</strong><small>Sicurezza account ${esc(mfaRoleLabel())}</small></div></div><div class="mfa-step">2 di 2</div><div class="mfa-icon shield">G</div><div class="eyebrow dark">COMPLETA CONFIGURAZIONE</div><h1>Inserisci il primo codice OTP</h1><p>Google Authenticator è già stato aggiunto. Non devi ricominciare: apri Google Authenticator e inserisci il codice a 6 cifre.</p><button class="btn ghost mfa-secondary-action" id="openGaPending">Apri Google Authenticator</button><div class="mfa-code-wrap"><input id="pendingCode" class="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000"></div><button class="btn mfa-primary" id="verifyPending">Verifica OTP e termina</button><div id="pendingMsg"></div><button class="btn ghost mfa-secondary-action" id="restartMfa">Non ho più il token: ricomincia configurazione</button></section></div>`);
    document.getElementById('openGaPending').onclick=()=>openGoogleAuthenticator('');
    const codeEl=document.getElementById('pendingCode'),box=document.getElementById('pendingMsg'),btn=document.getElementById('verifyPending');
    codeEl.oninput=()=>{codeEl.value=codeEl.value.replace(/\D/g,'').slice(0,6)};
    const verify=async()=>{if(await verifyTotpWithRetry(pending.id,codeEl,box,btn,'Verifica OTP e termina')){await render();}};
    btn.onclick=verify; codeEl.onkeydown=e=>{if(e.key==='Enter')verify()};
    document.getElementById('restartMfa').onclick=async()=>{await clearPendingTotpFactors(totp);await render();};
    setTimeout(()=>codeEl.focus(),120);
    return;
  }

  app.innerHTML=shell(`<div class="mfa-shell"><section class="mfa-card setup"><div class="mfa-brand"><div class="brand-mark meditaly-heart-mark"><img src="brand-heart.png" alt="" aria-hidden="true"></div><div><strong>Meditaly</strong><small>Sicurezza account ${esc(mfaRoleLabel())}</small></div></div><div class="mfa-step">1 di 2</div><div class="mfa-icon shield">G</div><div class="eyebrow dark">PRIMA CONFIGURAZIONE</div><h1>Collega Google Authenticator</h1><p>Configura il secondo fattore una sola volta. Dopo il collegamento inserirai il codice OTP direttamente in Meditaly.</p><div class="mfa-benefits"><div>1. Collega Meditaly a Google Authenticator</div><div>2. Torna in Meditaly</div><div>3. Inserisci il primo codice OTP a 6 cifre</div></div><button class="btn mfa-primary" id="enroll">Inizia configurazione 2FA</button><button class="btn ghost mfa-secondary-action" id="logoutMfa">Esci dall'account</button><div id="mfaBox"></div></section></div>`);
  document.getElementById('logoutMfa').onclick=()=>safeSignOut();
  document.getElementById('enroll').onclick=async()=>{
    const btn=document.getElementById('enroll');
    btn.disabled=true;btn.textContent='Preparazione…';
    await clearPendingTotpFactors(totp);
    const enr=await sb.auth.mfa.enroll({factorType:'totp',friendlyName:'Google Authenticator - Meditaly'});
    if(enr.error){document.getElementById('mfaBox').innerHTML=msg(enr.error.message,'error');btn.disabled=false;btn.textContent='Riprova';return;}
    const d=enr.data, qr=mfaQrSrc(d.totp.qr_code), secret=d.totp.secret||'', uri=d.totp.uri||'';
    btn.classList.add('hidden');
    document.getElementById('mfaBox').innerHTML=`<div class="mfa-setup-box"><div class="mfa-step">2 di 2</div><h2>Completa l'attivazione</h2><p class="small muted"><strong>Importante:</strong> dopo aver aggiunto Meditaly a Google Authenticator, torna qui e inserisci il codice OTP. Se sbagli, puoi riprovare senza rifare il QR.</p><button class="btn mfa-google" id="openGoogle">1 · Apri Google Authenticator</button><div class="field mfa-otp-first"><label>2 · Inserisci il codice OTP</label><input id="setupCode" class="mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000"></div><button class="btn mfa-primary" id="verifySetup">3 · Attiva 2FA con questo OTP</button><div id="setupMsg"></div><div class="mfa-or"><span></span>in alternativa<span></span></div><p class="small muted">Se usi Google Authenticator su un altro dispositivo, puoi scansionare questo QR.</p><div class="mfa-qr"><img src="${esc(qr)}" alt="QR per Google Authenticator"></div><div class="mfa-secret"><div><small>Chiave di configurazione manuale</small><strong>${esc(secret)}</strong></div><button class="btn ghost" id="copySecret">Copia</button></div></div>`;
    document.getElementById('openGoogle').onclick=()=>openGoogleAuthenticator(uri);
    document.getElementById('copySecret').onclick=()=>copyMfaSecret(secret);
    const codeEl=document.getElementById('setupCode'),box=document.getElementById('setupMsg'),verifyBtn=document.getElementById('verifySetup');
    codeEl.oninput=()=>{codeEl.value=codeEl.value.replace(/\D/g,'').slice(0,6)};
    const focusOtp=()=>setTimeout(()=>{codeEl.focus();codeEl.scrollIntoView({behavior:'smooth',block:'center'});},180);
    document.getElementById('openGoogle').addEventListener('click',()=>setTimeout(focusOtp,600));
    const verifySetup=async()=>{
      if(await verifyTotpWithRetry(d.id,codeEl,box,verifyBtn,'3 · Attiva 2FA con questo OTP')){
        app.innerHTML=shell(`<div class="mfa-shell"><section class="mfa-card mfa-success"><div class="mfa-icon shield">✓</div><div class="eyebrow dark">2FA ATTIVATO</div><h1>Google Authenticator collegato</h1><p>La configurazione è terminata. Ai prossimi accessi vedrai direttamente il campo OTP.</p><div class="notice ok">Secondo fattore verificato correttamente.</div><button class="btn mfa-primary" id="continueAfterMfa">Entra in Meditaly</button></section></div>`);
        document.getElementById('continueAfterMfa').onclick=()=>render();
      }
    };
    verifyBtn.onclick=verifySetup; codeEl.onkeydown=e=>{if(e.key==='Enter')verifySetup()};
    focusOtp();
  };
}
async function loadCareDoctors(){
 const uid=state.session.user.id;
 const {data,error}=await sb.from('patient_clinicians').select('clinician_id,profiles!patient_clinicians_clinician_id_fkey(full_name)').eq('patient_id',uid).eq('active',true).order('assigned_at',{ascending:false});
 if(error){state.careDoctors=[];return []}
 state.careDoctors=(data||[]).filter(x=>x.clinician_id&&x.profiles?.full_name);
 const key=`meditaly-care-doctor-${uid}`,saved=localStorage.getItem(key);
 if(!state.careDoctors.some(x=>x.clinician_id===state.selectedCareDoctor))state.selectedCareDoctor=state.careDoctors.some(x=>x.clinician_id===saved)?saved:state.careDoctors[0]?.clinician_id||null;
 return state.careDoctors;
}
function chosenCareDoctor(){return state.careDoctors.find(x=>x.clinician_id===state.selectedCareDoctor)||null}
async function promptCareDoctorAtOpen(){
 const uid=state.session.user.id;
 if(state.doctorPromptDoneFor===uid)return false;
 state.doctorPromptDoneFor=uid;
 if(state.careDoctors.length<2)return false;
 const choices=state.careDoctors.map(x=>`<option value="${esc(x.clinician_id)}" ${x.clinician_id===state.selectedCareDoctor?'selected':''}>${esc(x.profiles.full_name)}</option>`).join('');
 app.innerHTML=`<section class="doctor-onboarding care-switch-onboarding"><div class="brand-mini"><div class="brand-mark mini meditaly-heart-mark"><img src="brand-heart.png" alt=""></div><strong>Meditaly</strong></div><div class="card"><span class="eyebrow dark">IL TUO RIFERIMENTO</span><h1>Con quale medico vuoi iniziare?</h1><p class="muted">Terapie, controlli e chat mostrano il medico scelto. I promemoria arrivano per tutti i tuoi piani.</p><label class="field"><span>Medico collegato</span><select id="openCareDoctor" class="input">${choices}</select></label><button class="btn" type="button" id="confirmCareDoctor">Continua</button></div></section>`;
 document.getElementById('confirmCareDoctor').onclick=()=>{state.selectedCareDoctor=document.getElementById('openCareDoctor').value;localStorage.setItem(`meditaly-care-doctor-${uid}`,state.selectedCareDoctor);patientView()};
 return true;
}
async function header(){const adminSwitch=state.profile?.role==='Administrator'?`<button class="icon-btn admin-mode-btn" id="adminSwitch" aria-label="${state.adminArea?'Torna alla mia area personale':'Apri area amministratore'}">${state.adminArea?'⌂':'⚙'}</button>`:'';return `<div class="mobile-top"><div class="brand-mini"><div class="brand-mark mini meditaly-heart-mark"><img src="brand-heart.png" alt="" aria-hidden="true"></div><div><strong>Meditaly</strong><div class="tiny muted">${esc(state.profile.full_name)}</div>${state.profile?.role==='Patient'&&state.careDoctors.length?`<label class="doctor-header-select"><span class="sr-only">Medico di riferimento</span><select id="careDoctorSelect" aria-label="Medico di riferimento">${state.careDoctors.map(x=>`<option value="${esc(x.clinician_id)}" ${x.clinician_id===state.selectedCareDoctor?'selected':''}>${esc(x.profiles.full_name)}</option>`).join('')}</select></label>`:''}</div></div><div class="spacer"></div>${adminSwitch}<button class="icon-btn" id="openNotifications" aria-label="Notifiche">◉</button><button class="icon-btn" id="logout" aria-label="Esci">↪</button>${state.tab==='home'?'<button class="home-medi-avatar" id="headerMedi" type="button" aria-label="Apri Medi"><img src="medi-avatar.png" alt=""></button>':''}</div>`}
async function render(){if(!state.session){MeditalyAudio.cancel();MeditalyCalls.init(sb,null,false);return authView();} await loadProfile(); if(await requireMFA()){MeditalyCalls.init(sb,null,false);return mfaView();}MeditalyCalls.init(sb,state.session.user.id,state.profile.role==='Patient'); if(state.profile.role==='Patient') return patientView(); if(state.profile.role==='Clinician') return clinicianView(); if(state.profile.role==='Administrator') return state.adminArea?adminView():patientView(); return authView();}
const chronicTopics=[
 ['diabetes_type_2','Diabete di tipo 2','Il percorso di cura comprende controlli concordati, attività quotidiana e terapia personalizzata. Chiedi al medico quali controlli sono previsti per te.','https://www.iss.it/-/snlg-terapia-diabete-tipo2','ISS · Linea guida sul diabete di tipo 2'],
 ['hypertension','Ipertensione','Controllare la pressione e seguire il piano concordato aiuta a ridurre il rischio cardiovascolare. Chiedi come e quando misurarla.','https://www.who.int/news-room/fact-sheets/detail/hypertension','OMS · Ipertensione'],
 ['copd','BPCO','Un piano condiviso può comprendere controlli respiratori, uso corretto dei farmaci ed evitare il fumo. Chiedi quando segnalare un peggioramento.','https://www.who.int/health-topics/chronic-respiratory-diseases','OMS · Malattie respiratorie croniche'],
 ['asthma','Asma','Riconoscere i sintomi e sapere come usare il trattamento prescritto aiuta a tenere sotto controllo l’asma. Chiedi un piano scritto al medico.','https://www.who.int/news-room/fact-sheets/detail/asthma','OMS · Asma'],
 ['heart_failure','Scompenso cardiaco','Riferisci al curante eventuali cambiamenti dei sintomi e concorda i controlli e i farmaci. Non cambiare da solo la terapia.','https://www.who.int/health-topics/cardiovascular-diseases','OMS · Malattie cardiovascolari'],
 ['ckd','Malattia renale cronica','I controlli aiutano a seguire la funzione dei reni nel tempo. Concorda con il medico esami, pressione e terapia adatti al tuo caso.','https://www.who.int/news-room/fact-sheets/detail/kidney-disease','OMS · Malattie renali']
];
const conditionsEditor=(id,selected=[])=>`<div id="${id}" class="condition-options">${chronicTopics.map(([code,label])=>`<label><input type="checkbox" value="${code}" ${selected.includes(code)?'checked':''}><span>${esc(label)}</span></label>`).join('')}<label><input type="checkbox" value="other" ${selected.includes('other')?'checked':''}><span>Altra condizione già diagnosticata</span></label></div><label class="field condition-other ${selected.includes('other')?'':'hidden'}"><span>Specifica la condizione (facoltativo)</span><input class="input" id="${id}Other" maxlength="120" autocomplete="off" placeholder="Nome della condizione"></label>`;
function bindConditionOther(id){const box=document.getElementById(id),input=document.getElementById(id+'Other');box?.querySelector('input[value="other"]')?.addEventListener('change',e=>{input.closest('.condition-other').classList.toggle('hidden',!e.target.checked);if(!e.target.checked)input.value='';});}
const romeMunicipioField=(id,value='')=>`<label class="field rome-municipio-field hidden"><span>Municipio di Roma</span><select class="input" id="${id}"><option value="">Seleziona il municipio</option>${Array.from({length:15},(_,i)=>`<option value="${i+1}" ${Number(value)===i+1?'selected':''}>Municipio ${i+1}</option>`).join('')}</select></label>`;
function bindRomeMunicipio(cityId,provinceId,fieldId){const city=document.getElementById(cityId),province=document.getElementById(provinceId),field=document.getElementById(fieldId);const draw=()=>{const needed=city.value.trim().toLocaleLowerCase('it')==='roma'&&province.value.trim().toUpperCase()==='RM';field.closest('.rome-municipio-field').classList.toggle('hidden',!needed);field.required=needed;if(!needed)field.value=''};city.addEventListener('input',draw);province.addEventListener('input',draw);draw();}
async function patientInitialDoctorChoice(){
 const [{data:doctors,error:directoryError},{data:contact,error:contactError}]=await Promise.all([
  sb.rpc('list_verified_clinicians'),
  sb.from('patient_care_contacts').select('test_support_admin_id').eq('patient_id',state.session.user.id).single()
 ]);
 if(directoryError||contactError){app.innerHTML=`<section class="doctor-onboarding"><div class="card"><h2>Scelta del medico non disponibile</h2>${msg(directoryError?.message||contactError?.message,'error')}<button class="btn secondary" id="retryDoctorChoice">Riprova</button><button class="btn secondary" id="logoutDoctorChoice">Esci</button></div></section>`;document.getElementById('retryDoctorChoice').onclick=()=>patientView();document.getElementById('logoutDoctorChoice').onclick=()=>safeSignOut();return;}
 app.innerHTML=`<section class="doctor-onboarding"><div class="brand-mini"><div class="brand-mark mini meditaly-heart-mark"><img src="brand-heart.png" alt="" aria-hidden="true"></div><strong>Meditaly</strong></div><div class="card"><div class="eyebrow dark">PRIMO ACCESSO</div><h1>Scegli il tuo riferimento</h1><p class="muted">Per un medico reale invii una richiesta: potrai usare l'app mentre aspetti la sua accettazione. Puoi aggiungere altri medici in seguito.</p><div class="screening-intake"><h2>Informazioni per gli screening</h2><p class="muted">Età e residenza aiutano a mostrare i programmi pertinenti e la tua ASL, quando verificabile. Il sesso serve solo a orientare gli screening; se la tua situazione è diversa, chiedi al medico.</p><label class="field"><span>Data di nascita</span><input class="input" id="initialBirthDate" type="date" required max="${new Date().toISOString().slice(0,10)}" value="${esc(state.profile.date_of_birth||'')}"></label><label class="field"><span>Sesso per le indicazioni di screening</span><select class="input" id="initialScreeningSex" required><option value="">Seleziona</option><option value="female">Donna</option><option value="male">Uomo</option><option value="undisclosed">Preferisco non indicarlo</option></select></label><div class="intake-residence"><label class="field"><span>Comune di residenza</span><input class="input" id="initialResidenceCity" autocomplete="address-level2" placeholder="Es. Nola" maxlength="100" required></label><label class="field"><span>Provincia</span><input class="input" id="initialResidenceProvince" autocomplete="address-level1" placeholder="NA" maxlength="2" required></label></div>${romeMunicipioField("initialMunicipio")}<small class="muted">Non inserire sintomi o diagnosi in questi campi.</small></div><div class="screening-intake"><h2>Condizioni croniche già note <small>(facoltativo)</small></h2><p class="muted">Indica soltanto condizioni già comunicate da un medico. Non è una diagnosi: puoi modificarle o rimuoverle in seguito.</p><div class="condition-choice-row"><label><input type="radio" name="initialHasConditions" value="no" checked> No</label><label><input type="radio" name="initialHasConditions" value="yes"> Sì</label></div><div id="initialConditionsWrap" class="hidden">${conditionsEditor("initialConditions")}</div></div><label class="field"><span>Cerca il medico registrato nella dashboard</span><input class="input" id="initialDoctorSearch" placeholder="Filtra per nome o specializzazione" autocomplete="off"></label><label class="field"><span>Seleziona dall’elenco</span><select class="input" id="initialDoctorSelect"><option value="">Scegli un medico verificato</option></select></label><button class="btn" type="button" id="initialDoctorConfirm">Invia richiesta al medico</button><p class="small muted">Il medico deve accettare il collegamento. Potrai sceglierne altri dal menu.</p></div><div class="card"><h2>Contatto di prova</h2><p class="muted">Ciro Maiello · Test Medico è separato dai medici verificati e non può prescrivere.</p><button class="btn secondary" type="button" id="initialTestChoice">Entra in modalità test</button></div><div id="initialDoctorMsg" aria-live="polite"></div><button class="btn secondary" id="initialLogout">Esci dall'account</button></section>`;
 const draw=()=>{const q=document.getElementById('initialDoctorSearch').value.toLocaleLowerCase('it').trim(),select=document.getElementById('initialDoctorSelect'),previous=select.value;const filtered=(doctors||[]).filter(d=>[d.display_name,d.specialty,d.center_label].join(' ').toLocaleLowerCase('it').includes(q));select.innerHTML='<option value="">Scegli un medico verificato</option>'+filtered.map(d=>`<option value="${esc(d.clinician_id)}">${esc(d.display_name)} · ${esc(d.specialty||'Medico')}${d.center_label?' · '+esc(d.center_label):''}</option>`).join('');if(filtered.some(d=>d.clinician_id===previous))select.value=previous;};
 const choose=async(id,button)=>{const birth=document.getElementById('initialBirthDate').value,sex=document.getElementById('initialScreeningSex').value,city=document.getElementById('initialResidenceCity').value.trim().replace(/\s+/g,' '),province=document.getElementById('initialResidenceProvince').value.trim().toUpperCase();const municipio=Number(document.getElementById('initialMunicipio').value)||null;const out=document.getElementById('initialDoctorMsg');if(!officialAslLookup(city,province).length){out.innerHTML=msg('Comune e provincia non corrispondono ai dati ufficiali: controlla la grafia e la sigla.','error');return;}if(city.toLocaleLowerCase('it')==='roma'&&province==='RM'&&!municipio){out.innerHTML=msg('Per Roma seleziona anche il municipio: il comune è diviso fra più ASL.','error');return;}if(!birth||new Date(birth+'T12:00:00Z')>new Date()||!['female','male','undisclosed'].includes(sex)||city.length<2||!/^[A-Z]{2}$/.test(province)){out.innerHTML=msg('Completa data di nascita, sesso per gli screening, comune e sigla della provincia.','error');return;}button.disabled=true;out.innerHTML=msg('Salvataggio delle informazioni e invio della richiesta…');const {error:birthError}=await sb.from('profiles').update({date_of_birth:birth}).eq('id',state.session.user.id);const {error:intakeError}=birthError?{error:null}:await sb.from('patient_screening_profiles').upsert({patient_id:state.session.user.id,sex_for_screening:sex,residence_city:city,residence_province:province,residence_municipio:municipio,updated_at:new Date().toISOString()},{onConflict:'patient_id'});const codes=document.querySelector('input[name=initialHasConditions]:checked')?.value==='yes'?[...document.querySelectorAll('#initialConditions input:checked')].map(x=>x.value):[];const other=codes.includes('other')?document.getElementById('initialConditionsOther').value.trim():'';const {error:conditionsError}=birthError||intakeError?{error:null}:await sb.from('patient_chronic_conditions').upsert({patient_id:state.session.user.id,condition_codes:codes,other_details:other||null,updated_at:new Date().toISOString()},{onConflict:'patient_id'});const {data,error}=birthError||intakeError||conditionsError?{error:birthError||intakeError||conditionsError}:await sb.rpc('patient_choose_initial_doctor',{p_clinician:id});if(error){out.innerHTML=msg('Non è stato possibile completare il primo accesso: '+error.message,'error');button.disabled=false;return;}state.profile.date_of_birth=birth;state.doctorChoiceFor=state.session.user.id;state.doctorChoiceCompleted=true;state.tab='home';await patientView();if(data==='pending')mediVoiceNotice('Richiesta al medico inviata: puoi già usare l’app.');};
 document.getElementById('initialDoctorSearch').oninput=draw;document.getElementById('initialDoctorConfirm').onclick=e=>{const id=document.getElementById('initialDoctorSelect').value;if(!id){document.getElementById('initialDoctorMsg').innerHTML=msg('Seleziona un medico dalla tendina.','error');return;}choose(id,e.currentTarget)};document.getElementById('initialTestChoice').onclick=e=>choose(null,e.currentTarget);bindConditionOther('initialConditions');bindRomeMunicipio('initialResidenceCity','initialResidenceProvince','initialMunicipio');document.querySelectorAll('input[name=initialHasConditions]').forEach(r=>r.onchange=()=>{document.getElementById('initialConditionsWrap').classList.toggle('hidden',r.value!=='yes'||!r.checked)});document.getElementById('initialLogout').onclick=()=>safeSignOut();draw();
}
async function askResidenceAtStart(){
 const uid=state.session.user.id;
 if(state.residencePromptCheckedFor===uid)return false;
 const {data:profile,error}=await sb.from('patient_screening_profiles')
  .select('sex_for_screening,residence_city,residence_province,residence_municipio').eq('patient_id',uid).maybeSingle();
 if(error){
  app.innerHTML=`<section class="doctor-onboarding"><div class="card"><h1>Residenza non verificata</h1><p class="muted">Non riesco a leggere i dati di residenza. Puoi riprovare o accedere comunque.</p>${msg(error.message,'error')}<div class="row"><button class="btn" id="retryResidence">Riprova</button><button class="btn secondary" id="laterResidence">Continua</button></div></div></section>`;
  document.getElementById('retryResidence').onclick=()=>patientView();
  document.getElementById('laterResidence').onclick=()=>{state.residencePromptCheckedFor=uid;patientView();};
  return true;
 }
 if(profile?.residence_city?.trim()&&profile?.residence_province?.trim()&&!(profile.residence_city.trim().toLocaleLowerCase('it')==='roma'&&profile.residence_province.trim().toUpperCase()==='RM'&&!profile.residence_municipio)){
  state.residencePromptCheckedFor=uid;return false;
 }
 app.innerHTML=`<section class="doctor-onboarding"><div class="brand-mini"><div class="brand-mark mini meditaly-heart-mark"><img src="brand-heart.png" alt="" aria-hidden="true"></div><strong>Meditaly</strong></div><div class="card"><div class="eyebrow dark">IL TUO TERRITORIO</div><h1>Dove risiedi?</h1><p class="muted">Comune e provincia aiutano a mostrarti la ASL e i servizi della tua zona. Non serve l'indirizzo di casa.</p><form id="startupResidenceForm"><label class="field"><span>Comune di residenza</span><input class="input" id="startupResidenceCity" autocomplete="address-level2" maxlength="100" required placeholder="Es. Nola" value="${esc(profile?.residence_city||'')}"></label><label class="field"><span>Provincia (sigla di due lettere)</span><input class="input" id="startupResidenceProvince" autocomplete="address-level1" maxlength="2" required placeholder="NA" value="${esc(profile?.residence_province||'')}"></label>${profile?.sex_for_screening?'':`<label class="field"><span>Dato per orientare gli screening</span><select class="input" id="startupScreeningSex" required><option value="">Seleziona</option><option value="female">Donna</option><option value="male">Uomo</option><option value="undisclosed">Preferisco non indicarlo</option></select></label><p class="small muted">Questo dato è richiesto soltanto perché il tuo profilo Screening non è stato ancora creato. Puoi modificarlo più tardi.</p>`}${romeMunicipioField("startupMunicipio",profile?.residence_municipio)}<div id="startupResidenceMessage" role="status" aria-live="polite"></div><button class="btn" type="submit">Salva e continua</button><button class="btn secondary" id="laterResidence" type="button">Più tardi</button></form></div></section>`;
 document.getElementById('laterResidence').onclick=()=>{state.residencePromptCheckedFor=uid;patientView();};
 bindRomeMunicipio('startupResidenceCity','startupResidenceProvince','startupMunicipio');
 document.getElementById('startupResidenceForm').onsubmit=async e=>{
  e.preventDefault();const city=document.getElementById('startupResidenceCity').value.trim().replace(/\s+/g,' '),province=document.getElementById('startupResidenceProvince').value.trim().toUpperCase(),sex=profile?.sex_for_screening||document.getElementById('startupScreeningSex')?.value;
  const municipio=Number(document.getElementById('startupMunicipio').value)||null;const out=document.getElementById('startupResidenceMessage'),button=e.currentTarget.querySelector('button[type="submit"]');
  if(city.length<2||city.length>100||!/^[A-Z]{2}$/.test(province)||!['female','male','undisclosed'].includes(sex)||(city.toLocaleLowerCase('it')==='roma'&&province==='RM'&&!municipio)){out.innerHTML=msg('Inserisci comune, sigla della provincia e, se richiesto, il dato per gli screening.','error');return;}
  if(!officialAslLookup(city,province).length){out.innerHTML=msg('Comune e provincia non corrispondono ai dati ufficiali: controlla la grafia e la sigla.','error');return;}button.disabled=true;out.innerHTML=msg('Salvataggio della residenza…');
  const {error:saveError}=await sb.from('patient_screening_profiles').upsert({patient_id:uid,sex_for_screening:sex,residence_city:city,residence_province:province,residence_municipio:municipio,updated_at:new Date().toISOString()},{onConflict:'patient_id'});
  if(saveError){out.innerHTML=msg('Residenza non salvata: '+saveError.message,'error');button.disabled=false;return;}
  state.residencePromptCheckedFor=uid;await patientView();
 };
 return true;
}
async function patientView(){
  if(state.tab==='questionnaire')state.tab='assignedQuestionnaires';
  if(state.tab!=='assignedQuestionnaires')stopAssignedQuestionnaireVoice();
  if(state.tab!=='home'&&patientWelcome)cancelPatientWelcome();
  if(state.profile?.role==='Patient' && (state.doctorChoiceFor!==state.session.user.id || !state.doctorChoiceCompleted)){
    const {data,error}=await sb.from('patient_care_contacts').select('choice_completed_at').eq('patient_id',state.session.user.id).maybeSingle();
    if(error||!data?.choice_completed_at)return patientInitialDoctorChoice();
    state.doctorChoiceFor=state.session.user.id;state.doctorChoiceCompleted=true;
  }
  if(await askResidenceAtStart())return;
  await loadCareDoctors();
  if(await promptCareDoctorAtOpen())return;
  if(meditalyHistoryUser!==state.session.user.id){meditalyTabHistory.length=0;meditalyHistoryUser=state.session.user.id;}
  if(state.tab==='home' && state.lastPatientUser!==state.session.user.id){state.homeVoicePending=true;state.lastGreetingAt=0;}
  state.lastPatientTab=state.tab;state.lastPatientUser=state.session.user.id;
  if(!meditalyReturning && meditalyTabHistory[meditalyTabHistory.length-1]!==state.tab){meditalyTabHistory.push(state.tab);if(meditalyTabHistory.length>20)meditalyTabHistory.shift();}
  const h=await header();
  const nav=[['home','home','Home'],['chat','messages','Messaggi'],['inviteDoctor','doctor','Invita'],['more','menu','Menu']];
  app.innerHTML=`<div class="patient-shell new-ui ${state.tab==='home'?'patient-home-focus':''}">${h}<div class="mobile-content" id="content"></div><nav class="bottom-nav v6-nav patient-professional-nav">${nav.map(([id,ic,label])=>`<button type="button" class="nav-btn  ${state.tab===id?'active':''}" data-tab="${id}" ${id==='chat'?'data-open-doctor-chat="true"':''} aria-label="${label}" ${state.tab===id?'aria-current="page"':''}><span class="nav-icon nav-line-icon icon-${ic}" aria-hidden="true">${uiIcon(ic)}</span><span>${label}</span></button>`).join('')}</nav></div>`;
  content=document.getElementById('content');
  document.getElementById('logout').onclick=()=>safeSignOut();
  const adminSwitch=document.getElementById('adminSwitch'); if(adminSwitch) adminSwitch.onclick=()=>{state.adminArea=true;state.tab='users';render();};
  const bell=document.getElementById('openNotifications'); if(bell) bell.onclick=()=>{state.tab='notifications';patientView();};
  bindNav();
  document.getElementById('careDoctorSelect')?.addEventListener('change',e=>{state.selectedCareDoctor=e.target.value;localStorage.setItem(`meditaly-care-doctor-${state.session.user.id}`,state.selectedCareDoctor);state.selectedChatPeer=state.selectedCareDoctor;patientView()});
  if(state.tab==='home')await patientHome();
  if(state.tab==='therapy')await patientTherapy();
  if(state.tab==='reports')await patientReports();
  if(state.tab==='journal')await patientJournal();
  if(state.tab==='screening')await patientScreening();
  if(state.tab==='vaccines')await patientVaccines();
  if(state.tab==='conditions')await patientConditions();
  if(state.tab==='doctor')await patientDoctorLink();
  if(state.tab==='inviteDoctor')await patientInviteDoctor();
  if(state.tab==='imports')await patientCareImports();
  if(state.tab==='followup')await patientFollowups();
  if(state.tab==='questionnaire')await patientQuestionnaire();
  if(state.tab==='assignedQuestionnaires')await patientAssignedQuestionnaires();
  if(state.tab==='devices')await patientDevices();
  if(state.tab==='notifications')await patientNotifications();
  if(state.tab==='chat')await patientChat();
  if(state.tab==='privacy')await patientPrivacy();
  if(state.tab==='more'){await patientMore();addCareMenuEntries();}
}
async function patientHome(){
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
 const [{data:m},{data:f},{data:n},{data:p},{data:r},{data:ch},{data:checkin},{data:monitor},{data:todayIntakes},{data:careSignals},{data:residence}]=await Promise.all([
  sb.from('medications').select('*,medication_schedules(*)').eq('active',true).order('created_at',{ascending:false}),
  sb.from('followup_milestones').select('*').eq('completed',false).order('due_date'),
  sb.from('notifications').select('*').eq('is_read',false),
  sb.from('profiles').select('assigned_center_id').eq('id',state.session.user.id).single(),
  sb.from('medical_reports').select('id').order('uploaded_at',{ascending:false}),
  sb.from('chat_messages').select('id').eq('recipient_id',state.session.user.id).eq('is_read',false),
  sb.from('patient_daily_checkins').select('*').eq('patient_id',state.session.user.id).eq('checkin_date',today).maybeSingle(),
  sb.from('patient_monitoring_settings').select('*').eq('patient_id',state.session.user.id).maybeSingle(),
  sb.from('medication_intakes').select('medication_schedule_id,status').eq('patient_id',state.session.user.id).eq('intake_date',today),
  sb.from('care_signals').select('kind,status,created_at,reviewed_at').eq('patient_id',state.session.user.id).order('created_at',{ascending:false}).limit(3),
  sb.from('patient_screening_profiles').select('residence_city,residence_province,residence_municipio').eq('patient_id',state.session.user.id).maybeSingle()
 ]);
 const clinician=await getAssignedClinician();
 const selectedDoctor=chosenCareDoctor();
 const visibleM=(m||[]).filter(x=>!selectedDoctor||x.prescribed_by===selectedDoctor.clinician_id||!x.prescribed_by);
 const visibleF=(f||[]).filter(x=>!selectedDoctor||x.created_by===selectedDoctor.clinician_id||!x.created_by||x.created_by===state.session.user.id);
 let center=null;
 if(p?.assigned_center_id){ const c=await sb.from('centers').select('id,name').eq('id',p.assigned_center_id).single(); center=c.data; }
 const next=visibleF[0];
 const firstNameRaw=(state.profile.full_name||'').split(' ')[0]||'';
 const firstName=esc(firstNameRaw);
 const aslArea=aslAreaFor(residence),localAsl=aslArea?.asl,isCampaniaAsl=localAsl?.region==='CAMPANIA'||localAsl?.name==='ASL Napoli 3 Sud';
 const therapyCount=visibleM.length, msgCount=ch?.length||0;
 const nowMinutes=new Date().toLocaleTimeString('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const todayWeekday=new Date(`${today}T12:00:00Z`).getUTCDay();
 const todayTherapies=visibleM.filter(x=>(!x.starts_on||x.starts_on<=today)&&(!x.ends_on||x.ends_on>=today)).flatMap(med=>(med.medication_schedules||[]).filter(s=>s.time_of_day&&(!s.weekdays?.length||s.weekdays.includes(todayWeekday))).map(schedule=>({med,schedule}))).sort((a,b)=>a.schedule.time_of_day.localeCompare(b.schedule.time_of_day));
 const todayIntakeStates=new Map((todayIntakes||[]).map(x=>[x.medication_schedule_id,x.status]));
 const nextSlot=todayTherapies.find(x=>x.schedule.time_of_day.slice(0,5)>=nowMinutes)||todayTherapies[0];
 const nextTherapy=nextSlot?.med;
 const therapyTime=nextSlot?.schedule.time_of_day.slice(0,5)||'';
 const checkinLabel=checkin?.status==='green'?'Bene':checkin?.status==='yellow'?'Così così':checkin?.status==='red'?'Non sto bene':null;
 const checkinEmoji=checkin?.status==='green'?'🟢':checkin?.status==='yellow'?'🟡':checkin?.status==='red'?'🔴':'💙';
 const motivational=checkin?`Grazie per l'aggiornamento di oggi: <strong>${checkinEmoji} ${esc(checkinLabel)}</strong>.${next?` Il prossimo controllo è il <strong>${fmt(next.due_date)}</strong>.`:''}`:next?`Hai un controllo il <strong>${fmt(next.due_date)}</strong>. Prima però dimmi come ti senti oggi.`:`Prendersi cura di te oggi significa anche raccontare come stai. Facciamo il check-in quotidiano.`;
 const mediSpeech=checkin?`Ciao ${firstNameRaw}. Come stai oggi? Hai già indicato ${checkinLabel}; se vuoi, puoi aggiornare la risposta.`:`Ciao ${firstNameRaw}. Come stai oggi? Puoi scegliere bene, così così oppure non sto bene.`;

 // Sincronizza sul dispositivo i promemoria locali configurati dal medico.
 if(window.AndroidBridge){
   try{
     // Il backend invia la push alle 09:00; l'allarme locale aiuta i dispositivi
     // che non hanno un token FCM attivo. Il ricevitore evita la doppia notifica.
     if(typeof AndroidBridge.scheduleDailyReminder==='function'){
       AndroidBridge.scheduleDailyReminder(`checkin-${state.session.user.id}`,9,0,'checkin');
     }
     // Un token registrato non garantisce la consegna FCM: il promemoria locale resta attivo.
     if(typeof AndroidBridge.scheduleMedicationReminderNamed==='function'){
       const reminderKey=`meditaly-reminders-${state.session.user.id}`;
       const previous=JSON.parse(localStorage.getItem(reminderKey)||'[]');
       const current=[];
       for(const med of (m||[])) for(const sch of (med.medication_schedules||[])){
         if(!sch.time_of_day) continue;
         if(monitor?.medication_reminder_enabled===false){AndroidBridge.cancelDailyReminder?.(`med-${sch.id}`);continue;}
         const [hh,mm]=sch.time_of_day.slice(0,5).split(':').map(Number);
         AndroidBridge.scheduleMedicationReminderNamed(`med-${sch.id}`,hh||0,mm||0,(sch.weekdays||[]).join(','),med.starts_on||'',med.ends_on||'',med.name,med.dose||'',state.session.user.id);
         current.push(sch.id);
       }
       for(const id of previous)if(!current.includes(id))AndroidBridge.cancelDailyReminder?.(`med-${id}`);
       localStorage.setItem(reminderKey,JSON.stringify(current));
     }
     if(typeof AndroidBridge.scheduleDailyReminder==='function' && typeof AndroidBridge.cancelDailyReminder==='function'){
       if((m||[]).some(x=>(x.medication_schedules||[]).length)) AndroidBridge.scheduleDailyReminder(`adherence-${state.session.user.id}`,20,30,'adherence');
       else AndroidBridge.cancelDailyReminder(`adherence-${state.session.user.id}`);
     }
     if(typeof AndroidBridge.scheduleOneTimeReminder==='function'){
       for(const fu of (f||[])){
         const offsets=(fu.reminder_offsets||monitor?.followup_reminder_offsets||[7,1,0]);
         for(const off of offsets){
           const d=new Date(`${fu.due_date}T09:00:00`); d.setDate(d.getDate()-Number(off||0));
           AndroidBridge.scheduleOneTimeReminder(`fu-${fu.id}-${off}`,d.getTime(),'control');
         }
       }
     }
   }catch(e){console.warn('Local reminder sync failed',e)}
 }

 const doctorTileSub=clinician?.profiles?.full_name||'Scegli dalla directory verificata';
 const focusIsTherapy=Boolean(nextTherapy);
 const focusTab=focusIsTherapy?'therapy':next?'followup':'more';
 const focusLabel=focusIsTherapy?'TERAPIA DI OGGI':next?'PROSSIMO CONTROLLO':'IL TUO PERCORSO';
 const focusTitle=focusIsTherapy?`${esc(nextTherapy.name)} ${esc(nextTherapy.dose||'')}`:next?esc(next.milestone_label):'Nessuna attività programmata';
 const focusDetail=focusIsTherapy?`Orario previsto · ${esc(therapyTime)}`:next?`Data · ${fmt(next.due_date)}`:'Consulta il tuo percorso sanitario';
 const focusAction=focusIsTherapy?'Apri terapia':next?'Apri controllo':'Esplora il percorso';
 content.innerHTML=`
 <section class="clinical-home-head">
   <div><span class="eyebrow dark">BENVENUTO SU MEDITALY</span><h1>Ciao ${firstName}, come stai oggi?</h1>${localAsl?`<p class="home-asl-line">${aslArea.source==='posizione'?'ASL della zona in cui ti trovi':'ASL per il comune di residenza'} · ${esc(aslArea.city)}: <a href="${localAsl.site||localAsl.contacts}" target="_blank" rel="noopener noreferrer" aria-label="Apri il sito ufficiale di ${esc(localAsl.name)}"><strong>${esc(localAsl.name)}</strong> ↗</a></p>`:!residence?.residence_city||!residence?.residence_province?'<p class="home-asl-line">Non hai indicato la residenza. <button id="homeFindAsl" type="button" class="text-link">Usa la posizione attuale per trovare i servizi della zona</button> · <a href="https://www.salute.gov.it/new/it/ministero/aziende-sanitarie-locali/" target="_blank" rel="noopener noreferrer">Trova la tua ASL ↗</a></p>':'<p class="home-asl-line"><a href="https://www.salute.gov.it/new/it/ministero/aziende-sanitarie-locali/" target="_blank" rel="noopener noreferrer">Trova il sito della tua ASL nell’elenco ufficiale ↗</a></p>'}<p id="homeLocationMsg" role="status" aria-live="polite"></p><p>${motivational}</p></div>
 </section>
 <section class="daily-checkin-card ${checkin?'done status-'+checkin.status:''}">
   <div class="daily-checkin-head"><div><span class="eyebrow dark">CHECK-IN QUOTIDIANO</span><h2>Come ti senti oggi?</h2><p>${checkin?`Hai indicato: <strong>${checkinEmoji} ${esc(checkinLabel)}</strong>. Puoi aggiornare la risposta.`:'Scegli come stai. La risposta resterà nel tuo percorso e sarà visibile al tuo riferimento collegato.'}</p></div></div>
   <div id="checkinVoiceStatus" class="checkin-voice-status" role="status" aria-live="polite"></div>
   <div class="mood-row">
     <button class="mood-btn green ${checkin?.status==='green'?'selected':''}" data-mood="green"><span class="mood-face" aria-hidden="true">🙂</span><strong>Bene</strong></button>
     <button class="mood-btn yellow ${checkin?.status==='yellow'?'selected':''}" data-mood="yellow"><span class="mood-face" aria-hidden="true">😐</span><strong>Così così</strong></button>
     <button class="mood-btn red ${checkin?.status==='red'?'selected':''}" data-mood="red"><span class="mood-face" aria-hidden="true">😟</span><strong>Non sto bene</strong></button>
   </div>
 </section>
 <section class="home-prevention" aria-label="Prevenzione"><div class="eyebrow dark">PREVENZIONE</div><h2>Prenditi cura di te</h2><div class="home-prevention-grid"><button data-go="screening" type="button" class="prevention-tile screening"><span class="prevention-icon" aria-hidden="true">⌕</span><strong>Screening</strong><small>Indicazioni e servizi della tua zona</small><b>Esplora →</b></button><button data-go="vaccines" type="button" class="prevention-tile vaccines"><span class="prevention-icon" aria-hidden="true">✚</span><strong>Piano vaccinale</strong><small>Consulta e aggiorna il tuo percorso</small><b>Apri →</b></button></div></section>
 <section class="home-path-card" aria-label="Il tuo percorso">
 <div class="home-path-heading"><div><span class="eyebrow dark">IL TUO PERCORSO</span><h2>La tua salute, passo dopo passo</h2></div><button id="homePathToggle" class="home-path-toggle" type="button" aria-controls="homePathContent" aria-expanded="false" aria-label="Apri Il tuo percorso"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg></button></div>
 <div id="homePathContent" class="home-path-content" hidden>
 <button class="focus-next-action" data-go="${focusTab}" type="button"><span class="focus-kicker">${focusLabel}</span><strong>${focusTitle}</strong><small>${focusDetail}</small><span class="focus-action">${focusAction} <b>→</b></span></button>
 <section class="focus-pair-grid" aria-label="Altre attività e medico">
   <button class="focus-pair control" data-go="${focusIsTherapy?'followup':'therapy'}" type="button"><span>${focusIsTherapy?'CONTROLLI':'TERAPIE'}</span><strong>${focusIsTherapy?(next?esc(next.milestone_label):'Nessun controllo programmato'):(therapyCount?`${therapyCount} terapie attive`:'Nessuna terapia attiva')}</strong><small>${focusIsTherapy?(next?fmt(next.due_date):'Consulta il calendario'):'Apri il piano delle terapie'} →</small></button>
   <button class="focus-pair doctor" id="myDoctor" type="button"><span>IL MIO MEDICO</span><strong>${esc(doctorTileSub)}</strong><small>${clinician?'Apri il profilo':'Collega un medico'} →</small></button>
 </section>
 </div></section>
 <section class="home-today-plan"><div class="row between"><div><span class="eyebrow dark">OGGI</span><h2>Il mio piano di oggi</h2></div><button class="text-link" data-go="conditions" type="button">Le mie condizioni →</button></div><p class="muted">${todayTherapies.length?`${todayTherapies.filter(x=>todayIntakeStates.get(x.schedule.id)==='taken').length} di ${todayTherapies.length} assunzioni dichiarate`:'Nessuna assunzione programmata oggi'} · ${next?`Prossimo controllo ${fmt(next.due_date)}`:'Nessun controllo in programma'}</p><div class="today-plan-items">${todayTherapies.slice(0,4).map(x=>`<button class="today-plan-item" data-go="therapy" type="button"><span>${esc(x.schedule.time_of_day.slice(0,5))} · ${esc(x.med.name)}</span><strong>${todayIntakeStates.get(x.schedule.id)==='taken'?'Assunto':todayIntakeStates.get(x.schedule.id)==='skipped'?'Non assunto':todayIntakeStates.get(x.schedule.id)==='unknown'?'Non ricordo':'Da confermare'} →</strong></button>`).join('')||'<span class="muted">Il tuo piano è aggiornato dal medico collegato.</span>'}</div>${careSignals?.some(x=>x.status==='open')?'<p class="small muted">Un aggiornamento rilevante è disponibile al medico nel suo pannello. Se hai urgenza, contattalo direttamente; per emergenze chiama il 112.</p>':careSignals?.some(x=>x.status==='reviewed' && x.reviewed_at && Date.now()-Date.parse(x.reviewed_at)<7*86400000)?'<p class="small muted">Il tuo medico ha preso visione di un aggiornamento recente. Per parlargli direttamente, usa Messaggi.</p>':''}</section>
 <section class="home-command-grid">
   <button data-go="journal" class="command-journal"><span class="command-mark journal">${uiIcon('diary')}</span><strong>Diario</strong><small>Testo, voce o video</small></button>
   <button data-go="chat" class="command-messages"><span class="command-mark messages">${uiIcon('messages')}</span>${msgCount?`<b class="command-badge">${msgCount}</b>`:''}<strong>Messaggi</strong><small>Con il tuo medico</small></button>
   <button data-go="reports" class="command-reports"><span class="command-mark reports">${uiIcon('report')}</span><strong>Referti</strong><small>Carica e consulta</small></button>
   <button id="settingsTile" class="command-more"><span class="command-mark more">${uiIcon('menu')}</span><strong>Menu</strong><small>Questionari e privacy</small></button>
   <button data-go="inviteDoctor" class="command-invite"><span class="command-mark invite">${uiIcon('doctor')}</span><strong>Invita il tuo medico</strong><small>Invia un invito via email</small></button>
 </section>

 <section class="next-card">
   <div class="next-head"><h2>Prossime attività</h2><button class="text-link" id="seeAllActivities">Vedi tutte</button></div>
   <div class="next-list">
     ${nextTherapy?`<button class="next-row" data-go="therapy"><span class="next-symbol">${uiIcon('pill')}</span><span><strong>Terapia</strong><small>${esc(nextTherapy.name)} ${esc(nextTherapy.dose||'')}</small></span><em>${esc(therapyTime)}</em><b>›</b></button>`:`<div class="next-empty">Nessuna terapia attiva.</div>`}
     ${next?`<button class="next-row" data-go="followup"><span class="next-symbol">${uiIcon('calendar')}</span><span><strong>Controllo</strong><small>${esc(next.milestone_label)}</small></span><em>${fmt(next.due_date)}</em><b>›</b></button>`:`<div class="next-empty">Nessun controllo programmato.</div>`}
   </div>
 </section>
 <section class="home-territory" aria-label="Servizi sanitari territoriali">
   <div class="eyebrow dark">SERVIZI PUBBLICI</div><h2>La tua salute, anche fuori dall’app</h2>
   <article class="home-territory-card"><h3>Fascicolo Sanitario Elettronico</h3><p>${isCampaniaAsl?'Consulta il portale ufficiale della Regione Campania.':'Consulta il portale ufficiale nazionale e scegli la tua Regione.'} Il fascicolo si apre fuori da Meditaly con autenticazione personale: <strong>non è collegato né sincronizzato</strong> con questa app.</p><a class="btn secondary" href="${isCampaniaAsl?'https://sinfonia.regione.campania.it/':'https://www.fascicolosanitario.gov.it/'}" target="_blank" rel="noopener noreferrer">Apri il Fascicolo ufficiale ↗</a></article>
   ${localAsl?.district?`<article class="home-territory-card"><h3>${esc(localAsl.name)} · ${esc(localAsl.district||'territorio')}</h3><p>Screening organizzati: mammella, cervice uterina e colon-retto secondo età e condizioni individuali. Le campagne e gli Open Day cambiano: consulta gli avvisi ufficiali per date e disponibilità.</p><div class="territory-links"><a href="${localAsl.site||localAsl.contacts}" target="_blank" rel="noopener noreferrer">Sito ufficiale ASL ↗</a><a href="${localAsl.programs}" target="_blank" rel="noopener noreferrer">Programmi screening ↗</a><a href="${localAsl.campaigns}" target="_blank" rel="noopener noreferrer">Campagne pubblicate ↗</a><a href="${localAsl.vaccinations}" target="_blank" rel="noopener noreferrer">Vaccinazioni ASL ↗</a></div>${localAsl.contactPhone?`<p class="territory-phone">${esc(localAsl.contactLabel)}: <a href="tel:${localAsl.contactPhone}">${esc(localAsl.contactPhone)}</a> · <a href="${localAsl.contacts}" target="_blank" rel="noopener noreferrer">Verifica recapiti ↗</a></p>`:''}<small>Informazioni sintetiche da fonti ASL; verifica sempre requisiti, orari e contatti prima di recarti allo sportello.</small></article>`:''}
   ${localAsl&&!localAsl.district?`<article class="home-territory-card"><h3>${esc(localAsl.name)}</h3><p>ASL individuata dal comune di residenza. Per servizi, screening e recapiti consulta il sito dell’ente.</p><a class="btn secondary" href="${esc(localAsl.site)}" target="_blank" rel="noopener noreferrer">Apri il sito ufficiale ↗</a><small>Associazione comune–ASL: Ministero della Salute. Verifica sul sito eventuali aggiornamenti.</small></article>`:''}
   ${localAsl?.district?`<article class="home-territory-card"><h3>Servizi del tuo territorio</h3><div class="territory-service-list"><div><strong>Prenota visite ed esami · CUP ASL</strong><p><a href="tel:081185555">081 185555</a> · Lun–ven 8:00–18:30, sab 8:00–13:00. È un numero ordinario, non un numero verde. Tieni pronta l'impegnativa.</p><a href="https://www.aslnapoli3sud.it/cup" target="_blank" rel="noopener noreferrer">Modalità di prenotazione ↗</a></div><div><strong>Esenzioni e scelta del medico</strong><p>Verifica requisiti per patologia o reddito e sportelli competenti.</p><a href="https://www.aslnapoli3sud.it/web/guest/servizi-al-cittadino/ticket-ed-esenzione" target="_blank" rel="noopener noreferrer">Esenzioni ASL ↗</a></div>${localAsl.district==='Distretto 49'?`<div><strong>Diabete · Centro antidiabete Nola</strong><p><a href="tel:08118437542">081 18437542</a> · Via Fontanarosa 25. Numero ordinario; prenotazioni e indicazioni nella pagina ufficiale.</p><a href="https://www.aslnapoli3sud.it/distretto-49/centro-anti-diabete" target="_blank" rel="noopener noreferrer">Centro antidiabete ↗</a></div><div><strong>Assistenza fuori orario · continuità assistenziale</strong><p>Per problemi che non possono attendere il medico curante, di notte e nei festivi. Scegli il recapito del punto più vicino nella pagina ufficiale.</p><a href="https://www.aslnapoli3sud.it/distretto-49/guardia-medica" target="_blank" rel="noopener noreferrer">Sedi e numeri del Distretto 49 ↗</a></div><div><strong>Consultorio e assistenza domiciliare</strong><p>Per il consultorio di Nola: <a href="tel:08118437535">081 18437535</a>. Per bisogni assistenziali a domicilio, chiedi informazioni al Punto Unico di Accesso (PUA).</p><a href="https://www.aslnapoli3sud.it/pua49" target="_blank" rel="noopener noreferrer">PUA Distretto 49 ↗</a></div>`:`<div><strong>Consultori e servizi distrettuali</strong><p>Sedi e recapiti dipendono dal comune. Consulta la rubrica ufficiale dell'ASL prima di rivolgerti a uno sportello.</p><a href="${localAsl.contacts}" target="_blank" rel="noopener noreferrer">Rubrica ASL ↗</a></div>`}</div></article>`:''}
   <article class="home-territory-card public-helplines"><h3>Numeri verdi pubblici per tema</h3><p>Servizi nazionali gratuiti di <strong>informazione e orientamento</strong>. Non fanno diagnosi, non sostituiscono il medico e non sono numeri per emergenze. Non tutte le patologie hanno un telefono verde pubblico.</p><div class="helpline-list">${PUBLIC_HELPLINES.map(x=>`<div class="helpline-row"><div><strong>${esc(x.label)}</strong><small>${esc(x.body)} · ${esc(x.hours)}</small></div><div class="helpline-actions"><a class="helpline-phone" href="tel:${x.number}" aria-label="Chiama ${esc(x.label)} ${esc(x.number)}">${esc(x.display)}</a><a class="helpline-source" href="${x.url}" target="_blank" rel="noopener noreferrer" aria-label="Fonte ufficiale ${esc(x.label)}">Fonte ↗</a></div></div>`).join('')}</div>${localAsl?.district?`<p class="small">Approfondimento per lo screening della cervice uterina dopo un esito alterato: ASL Napoli 3 Sud <a href="tel:800196993">800 196993</a> · <a href="https://www.aslnapoli3sud.it/pdta-cervice-uterina-ovaio" target="_blank" rel="noopener noreferrer">criteri e orari ufficiali ↗</a>. Non è il numero per tutti gli screening.</p>`:''}<p class="helpline-emergency">Per un'emergenza sanitaria chiama <a href="tel:112">112</a>. I telefoni verdi non gestiscono urgenze.</p></article>
 </section>
 <div class="creator-footer v6-footer">Meditaly è stata creata da <strong>Ciro Maiello</strong><br>© 2026 Ciro Maiello · Tutti i diritti riservati.</div>
 <div id="checkinModal" class="medi-modal hidden" role="dialog" aria-modal="true" aria-labelledby="checkinModalTitle"><div class="medi-modal-card checkin-modal-card"><div class="checkin-modal-header"><div class="eyebrow dark">CHECK-IN QUOTIDIANO</div><button class="medi-close" id="closeCheckin" type="button" aria-label="Chiudi">×</button></div><div class="checkin-modal-scroll"><h2 id="checkinModalTitle">Come ti senti?</h2><p class="muted">Puoi cambiare risposta qui prima di salvare. Se indichi “Non sto bene”, il medico associato riceverà una segnalazione nella dashboard. Per scrivergli, usa Messaggi.</p><div class="checkin-modal-moods" role="group" aria-label="Come ti senti"><button type="button" data-checkin-choice="green">🙂 Sto bene</button><button type="button" data-checkin-choice="yellow">😐 Così così</button><button type="button" data-checkin-choice="red">😟 Non sto bene</button></div><details id="checkinReasons" class="checkin-reasons"><summary><span><strong>Che cosa senti?</strong><small>Seleziona uno o più sintomi, se vuoi</small></span><span class="checkin-reasons-arrow" aria-hidden="true">⌄</span></summary><div id="reasonList" class="reason-grid"></div></details><div class="field"><label for="checkinNote">Raccontalo al medico <span class="muted">(facoltativo)</span></label><div class="checkin-voice-row"><button class="btn secondary" id="checkinMic" type="button">🎙️ Detta la risposta</button><span class="muted">Dopo la domanda vocale, tocca qui e rileggi la trascrizione prima di inviare.</span></div><textarea class="textarea" id="checkinNote" rows="3" maxlength="1000" placeholder="Scrivi o detta la tua risposta..."></textarea></div><p class="small muted checkin-emergency">Se è un’emergenza, chiama il 112.</p></div><div class="checkin-modal-actions"><div id="checkinMsg" role="status" aria-live="polite"></div><button class="btn full" id="saveCheckin" type="button">Salva aggiornamento</button></div></div></div>
 <div id="mediModal" class="medi-modal hidden"><div class="medi-modal-card medi-assistant-card medi-voice-card" role="dialog" aria-modal="true" aria-label="Parla con Medi">
  <div class="medi-assistant-head"><div class="medi-assistant-identity"><img src="medi-avatar.png" alt=""><div><h2>Medi</h2><span class="medi-online">Il tuo assistente sanitario · voce</span></div></div><button class="medi-close" id="closeMedi" type="button" aria-label="Chiudi Medi">×</button></div>
  <div class="medi-assistant-main"><span class="pill">Medi · il tuo assistente</span><div class="medi-intro-bubble"><strong>🔊 Medi ti parla</strong><p>Ciao ${firstName}. Posso cercare video di primo soccorso, spiegare linee guida, trovare la tua ASL, dirti i farmaci di oggi e preparare un messaggio al medico. Da cosa vuoi iniziare?</p></div>
   <div class="medi-capabilities"><span class="eyebrow dark">COSA PUOI CHIEDERMI</span><div>▶ &nbsp; «Mostrami un video sul soffocamento»</div><div>▤ &nbsp; «Spiegami le linee guida per il diabete»</div><div>⌖ &nbsp; «Trova i contatti della mia ASL»</div><div>◷ &nbsp; «Quali farmaci devo prendere oggi?»</div><div>✉ &nbsp; «Scrivi al mio medico che...»</div></div>
   <div id="mediAnswer" class="medi-answer" role="status" aria-live="polite"><div class="medi-dialogue"></div></div><p class="medi-safety-note">Il messaggio viene riletto a voce e inviato soltanto dopo la tua conferma. Per emergenze chiama il 112.</p>
  </div><div class="medi-voicebar"><button class="medi-mic" id="mediMic" type="button" aria-label="Parla con Medi">${uiIcon('microphone')}</button><div><strong id="mediVoiceStatus">Parlami quando vuoi</strong><small>Parla con Medi</small></div><button class="medi-speak small" id="mediSpeakModal" type="button" aria-label="Riascolta Medi">🔊</button><button class="medi-speak small" id="mediStopModal" type="button" aria-label="Ferma la voce">■</button></div>
  <textarea id="mediQuestion" hidden aria-hidden="true"></textarea><button id="mediCheckin" hidden type="button"></button></div></div>`;
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.go==='chat')state.selectedChatPeer=state.selectedCareDoctor;state.tab=b.dataset.go;patientView()});
 const pathToggle=document.getElementById('homePathToggle'),pathContent=document.getElementById('homePathContent');
 let pathExpanded=false;
 const showPath=()=>{pathToggle.setAttribute('aria-expanded',String(pathExpanded));pathToggle.setAttribute('aria-label',pathExpanded?'Riduci Il tuo percorso':'Apri Il tuo percorso');pathContent.hidden=!pathExpanded;};
 showPath();
 pathToggle.onclick=()=>{pathExpanded=!pathExpanded;showPath();};
 meditalyHomeExtras({province:aslArea?.province||residence?.residence_province||'',city:aslArea?.city||residence?.residence_city||''});
 document.getElementById('homeFindAsl')?.addEventListener('click',async e=>{
   const button=e.currentTarget,box=document.getElementById('homeLocationMsg');button.disabled=true;box.textContent='Cerco il comune della posizione attuale…';
   try{await currentAslLocation();if(state.tab==='home')await patientHome();}
   catch(error){box.textContent=error.message||'Posizione non disponibile. Inserisci il comune nella sezione Screening.';button.disabled=false;}
 });
 if((!residence?.residence_city||!residence?.residence_province)&&!localAsl&&state.locationAttemptedFor!==state.session.user.id){
   state.locationAttemptedFor=state.session.user.id;
   setTimeout(()=>{if(state.tab==='home'&&!state.greetingInFlight&&!patientWelcome?.active&&state.session?.user?.id===state.locationAttemptedFor)document.getElementById('homeFindAsl')?.click();},350);
 }
 document.getElementById('myDoctor').onclick=()=>{state.tab='doctor';patientView();};
 document.getElementById('settingsTile').onclick=()=>{state.tab='more';patientView();};
 document.getElementById('seeAllActivities').onclick=()=>{state.tab='more';patientView();};
 const modal=document.getElementById('mediModal');
 const activationGreeting=`Ciao ${firstNameRaw}. Sono Medi. Posso cercare video affidabili di primo soccorso, spiegarti linee guida, trovare i riferimenti della tua ASL, dirti i farmaci previsti oggi e preparare un messaggio per il tuo medico. Da cosa vuoi iniziare?`;
 const openMedi=()=>{cancelPatientWelcome();modal.classList.remove('hidden');mediVoiceActive=true;mediVoicePhase='question';mediVoiceDraft='';mediSetVoiceStatus('Medi sta parlando…');mediSpeakCloud(activationGreeting,mediListen);};
 const openMediButton=document.getElementById('openMedi');if(openMediButton)openMediButton.onclick=openMedi;
 const speakMedi=()=>mediSpeakCloud(activationGreeting,mediListen);
 const msm=document.getElementById('mediSpeakModal');if(msm)msm.onclick=speakMedi;
 const mst=document.getElementById('mediStopModal');if(mst)mst.onclick=()=>{mediStopCloud();mediSetVoiceStatus('Voce fermata. Tocca il microfono per parlare.');};
 const mic=document.getElementById('mediMic');if(mic)mic.onclick=()=>{mediStopCloud();mediListen();};
 document.getElementById('headerMedi')?.addEventListener('click',openMedi);
 document.getElementById('closeMedi').onclick=()=>{cancelPatientWelcome();mediVoiceActive=false;mediVoiceTarget=null;mediStopCloud();modal.classList.add('hidden');};
 modal.onclick=e=>{if(e.target===modal){cancelPatientWelcome();mediVoiceActive=false;mediVoiceTarget=null;mediStopCloud();modal.classList.add('hidden')}};
 const cmodal=document.getElementById('checkinModal'),checkinPatientId=state.session.user.id; let pendingMood=null,checkinSaved=false,greenCheckinSaving=false;
 const reasons=[...new Set([...(monitor?.reasons_catalog||[]),'Dolore o fastidio','Mal di testa','Febbre o brividi','Tosse','Fiato corto','Nausea o vomito','Disturbi intestinali','Capogiri','Stanchezza o debolezza','Difficoltà a dormire','Ansia o umore basso','Problemi con la terapia','Altro'])];
 const selectCheckinMood=mood=>{pendingMood=mood;document.getElementById('checkinModalTitle').textContent=mood==='green'?'Sto bene':mood==='yellow'?'Così così':'Non sto bene';document.getElementById('checkinReasons').hidden=mood==='green';document.querySelectorAll('[data-checkin-choice]').forEach(button=>{const selected=button.dataset.checkinChoice===mood;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});};
 const openCheckin=mood=>offerPatientQuestionnaire(mood);
 const saveGreenCheckin=()=>offerPatientQuestionnaire('green');
 window.onMeditalyCheckinVoiceInput=spoken=>handleWelcomeReply(spoken);
 document.querySelectorAll('[data-checkin-choice]').forEach(button=>button.onclick=()=>selectCheckinMood(button.dataset.checkinChoice));
 document.getElementById('checkinMic').onclick=()=>mediStartVoiceInput('checkinNote');
 document.querySelectorAll('.mood-btn').forEach(b=>b.onclick=()=>b.dataset.mood==='green'?void saveGreenCheckin():openCheckin(b.dataset.mood));
 if(notificationCheckinMood){const selected=notificationCheckinMood;notificationCheckinMood=null;requestAnimationFrame(()=>openCheckin(selected));}
 if(focusCheckinFromNotification){
   focusCheckinFromNotification=false;
   requestAnimationFrame(()=>{
     void startInteractiveCheckin();
     const section=document.querySelector('.daily-checkin-card');
     section?.scrollIntoView({behavior:'smooth',block:'center'});
     const heading=section?.querySelector('h2');
     if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
   });
 }
 document.getElementById('mediCheckin').onclick=()=>{mediVoiceActive=false;mediStopCloud();modal.classList.add('hidden');openCheckin(checkin?.status||'green')};
 document.getElementById('closeCheckin').onclick=()=>cmodal.classList.add('hidden'); cmodal.onclick=e=>{if(e.target===cmodal)cmodal.classList.add('hidden')};
 document.getElementById('saveCheckin').onclick=async()=>{const button=document.getElementById('saveCheckin');if(button.disabled)return;button.disabled=true;const status=pendingMood;const choices=[...document.querySelectorAll('[data-checkin-choice]')];choices.forEach(x=>x.disabled=true);const selected=status==='green'?[]:[...document.querySelectorAll('#reasonList input:checked')].map(x=>x.value);const note=document.getElementById('checkinNote').value.trim(),result=document.getElementById('checkinMsg');result.innerHTML=msg('Invio aggiornamento…');try{
   if(!checkinSaved){const {error}=await sb.rpc('submit_daily_checkin',{p_status:status,p_reasons:selected,p_note:note||null});if(error)throw error;checkinSaved=true;document.getElementById('checkinNote').readOnly=true;document.getElementById('checkinMic').disabled=true;document.querySelectorAll('#reasonList input').forEach(x=>x.disabled=true);}
   result.innerHTML=msg(status==='red'?'Check-in salvato. Se hai un medico associato, il tuo aggiornamento compare fra le situazioni da valutare.':'Check-in salvato nel tuo percorso.','success');setTimeout(()=>patientHome(),1100);
 }catch(error){result.innerHTML=msg(error.message||'Invio non riuscito. Riprova.','error');button.disabled=false;choices.forEach(x=>x.disabled=false);}};
 if(state.homeVoicePending)void startPatientWelcome(firstNameRaw);

 // Aggiorna la Home quando il medico modifica terapie, controlli o invia un messaggio.
 if(state.careChannel)await sb.removeChannel(state.careChannel);
 const refreshCareHome=()=>{clearTimeout(state.careRefreshTimer);state.careRefreshTimer=setTimeout(()=>{if(state.tab==='home')patientHome();},350);};
 state.careChannel=sb.channel(`patient-care-${state.session.user.id}`)
  .on('postgres_changes',{event:'*',schema:'public',table:'medications',filter:`patient_id=eq.${state.session.user.id}`},refreshCareHome)
  .on('postgres_changes',{event:'*',schema:'public',table:'followup_milestones',filter:`patient_id=eq.${state.session.user.id}`},refreshCareHome)
  .subscribe();
 organizeSimpleHome();
}
const PUBLIC_HELPLINES=[
 {label:'Malattie rare',number:'800896949',display:'800 89 69 49',body:'ISS · esenzioni, centri di riferimento e orientamento',hours:'lun–ven 9:00–13:00',url:'https://www.iss.it/rete-nazionale/-/asset_publisher/jxeCSHgBvt6E/content/telefono-verde-malattie-rare-4'},
 {label:'HIV e infezioni sessualmente trasmesse',number:'800861061',display:'800 861061',body:'ISS · informazioni riservate e prevenzione',hours:'lun–ven 13:00–18:00',url:'https://www.iss.it/numeri-verdi/-/asset_publisher/LXvuDqwiaG9G/content/telefono-verde-aids-e-infezioni-sessualmente-trasmesse'},
 {label:'Fumo e nicotina',number:'800554088',display:'800 554088',body:'ISS · supporto per smettere di fumare',hours:'lun–ven 10:00–16:00',url:'https://smettodifumare.iss.it/'},
 {label:'Alcol',number:'800632000',display:'800 632000',body:'ISS · informazioni e orientamento ai servizi',hours:'verifica orari sul sito',url:'https://www.iss.it/cndd-telefono-verde-dipendenze'},
 {label:'Gioco d’azzardo',number:'800558822',display:'800 55 88 22',body:'ISS · supporto e orientamento ai servizi',hours:'verifica orari sul sito',url:'https://www.iss.it/cndd-telefono-verde-dipendenze'},
 {label:'Droghe e dipendenze',number:'800186070',display:'800 186070',body:'ISS · ascolto e orientamento ai servizi',hours:'verifica orari sul sito',url:'https://www.iss.it/cndd-telefono-verde-dipendenze'}
];
const SCREENING_ISS_URL='https://www.epicentro.iss.it/screening/';
const SCREENING_WHO_URL='https://www.who.int/europe/news/item/02-02-2022-when-is-screening-for-cancer-the-right-course-of-action';
const SCREENING_ASL_NA3={name:'ASL Napoli 3 Sud',site:'https://www.aslnapoli3sud.it/',programs:'https://www.aslnapoli3sud.it/home/screeningepromozionedellasalute',campaigns:'https://www.aslnapoli3sud.it/campagne-di-prevenzione',vaccinations:'https://www.aslnapoli3sud.it/it/web/guest/servizi-al-cittadino/vaccinazioni',contacts:'https://www.aslnapoli3sud.it/reclami-/-encomi-/-info'};
const SCREENING_NA3_DS49=new Set(['nola','carbonara di nola','casamarciano','liveri','san paolo bel sito','san paolo belsito','saviano','scisciano','visciano','camposano','cicciano','cimitile','comiziano','roccarainola','tufino']);
function officialAslFor(city,province,municipio=null){
 const candidates=officialAslLookup(city,province);
 if(candidates.length===1){const x=candidates[0];return {...x,contacts:x.site,programs:x.site,campaigns:x.site,vaccinations:x.site};}
 if(candidates.length===3 && String(city||'').trim().toLocaleLowerCase('it')==='roma'){
  const n=Number(municipio);
  const name=n<=3||n>=13?'ROMA 1':n<=9?'ROMA 2':'ROMA 3';
  const x=n>=1&&n<=15?candidates.find(x=>x.name===name):null;
  return x?{...x,contacts:x.site,programs:x.site,campaigns:x.site,vaccinations:x.site}:null;
 }
 return null;
}
function screeningLocalAsl(city,province,municipio=null){const key=String(city||'').trim().toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(String(province||'').toUpperCase()==='NA'){if(SCREENING_NA3_DS49.has(key))return {...SCREENING_ASL_NA3,district:'Distretto 49',contactLabel:'URP Distretto 49',contactPhone:'08118437501'};if(key==='portici')return {...SCREENING_ASL_NA3,district:'Distretto 34',contactLabel:'Centro vaccinale Portici',contactPhone:'08118435244'};if(key==='ercolano')return {...SCREENING_ASL_NA3,district:'Distretto 55',contactLabel:'URP Distretto 55',contactPhone:'08118435141'};if(key==='torre del greco')return {...SCREENING_ASL_NA3,district:'Distretto 57',contactLabel:'URP Distretto 57',contactPhone:'08118434563'};}return officialAslFor(city,province,municipio);}
function screeningAge(birth){if(!/^\d{4}-\d{2}-\d{2}$/.test(birth||''))return null;const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));const today=`${parts.year}-${parts.month}-${parts.day}`;let age=Number(parts.year)-Number(birth.slice(0,4));if(today.slice(5)<birth.slice(5))age--;return age>=0&&age<130?age:null;}
async function patientScreening(){
 const {data:profile,error}=await sb.from('patient_screening_profiles').select('sex_for_screening,residence_city,residence_province,residence_municipio').eq('patient_id',state.session.user.id).maybeSingle();
 if(error){content.innerHTML=msg('Screening temporaneamente non disponibile: '+error.message,'error');return;}
 const age=screeningAge(state.profile?.date_of_birth),sex=profile?.sex_for_screening,aslArea=aslAreaFor(profile),asl=aslArea?.asl;
 const cards=[
  {title:'Colon-retto',range:'50–69 anni · donne e uomini',method:'Ricerca del sangue occulto nelle feci, di norma ogni 2 anni.',matches:age!==null&&age>=50&&age<=69},
  {title:'Cervice uterina',range:'25–64 anni · se è presente la cervice',method:'Pap test generalmente dai 25 ai 29 anni; test HPV generalmente dai 30 ai 64 anni, secondo il programma locale.',matches:sex==='female'&&age!==null&&age>=25&&age<=64,uncertain:sex==='undisclosed'},
  {title:'Mammella',range:'50–69 anni · screening mammografico',method:'Mammografia generalmente ogni 2 anni nel programma organizzato.',matches:sex==='female'&&age!==null&&age>=50&&age<=69,uncertain:sex==='undisclosed'}
 ];
 const sorted=[...cards].sort((a,b)=>Number(b.matches)-Number(a.matches));
 content.innerHTML=`<section class="page-title screening-heading"><div class="eyebrow dark">PREVENZIONE</div><h1>Screening</h1><p>Prenderti cura di te è un percorso fatto di piccoli passi. Informarti oggi ti aiuta a scegliere insieme al tuo medico quello più adatto.</p></section>
 <section class="card screening-intro"><h2>Programmi di prevenzione</h2><p>Le fasce di età indicano a chi sono rivolti i programmi organizzati in Italia. <strong>Non significa che devi eseguire subito un esame</strong>: invito della ASL, esami precedenti, sintomi, storia familiare e caratteristiche individuali possono cambiare il percorso.</p>${age===null?'<p class="notice">Aggiungi la data di nascita per vedere le fasce pertinenti.</p>':`<p class="screening-context">Età: ${age} anni ${profile?.residence_city?`· Residenza: ${esc(profile.residence_city)} (${esc(profile.residence_province)})`:aslArea?.source==='posizione'?`· Posizione attuale: ${esc(aslArea.city)} (${esc(aslArea.province)})`:''}</p>`}${age!==null&&age<18?'<p class="notice">I programmi oncologici organizzati elencati sotto sono rivolti agli adulti. Per la prevenzione adatta alla tua età parlane con il medico o il pediatra.</p>':''}<button class="btn secondary" id="goVaccinesFromScreening" type="button">Vedi il promemoria vaccini →</button></section>
 <section class="screening-cards" aria-label="Programmi di screening">${sorted.map(x=>`<article class="card screening-program ${x.matches?'screening-relevant':''}"><div class="screening-program-top"><h2>${x.title}</h2><span class="pill">${x.matches?'Nella fascia del programma':x.uncertain?'Da valutare con il medico':'Informazioni'}</span></div><p>${x.range}</p><p>${x.method}</p></article>`).join('')}</section>
 <section class="card screening-local"><h2>Programmi e campagne della tua ASL</h2>${asl?`<p>${aslArea.source==='posizione'?'Per la posizione attuale':'Per la residenza'} <strong>${esc(aslArea.city)} (${esc(aslArea.province)})</strong> abbiamo verificato l'attribuzione a <strong>${asl.name}</strong>. Cerca gli avvisi o apri il sito ufficiale per controllare le date pubblicate.</p><div class="screening-links">${asl.district?`<button class="btn" id="screeningSearchCampaigns" type="button">Cerca campagne pubblicate</button><a class="btn secondary" href="${asl.programs}" target="_blank" rel="noopener noreferrer">Programmi ASL ↗</a><a class="btn secondary" href="${asl.campaigns}" target="_blank" rel="noopener noreferrer">Campagne e Open Day ↗</a>`:`<a class="btn secondary" href="${asl.site}" target="_blank" rel="noopener noreferrer">Sito ufficiale ${esc(asl.name)} ↗</a>`}</div><div id="screeningCampaignResults" role="status" aria-live="polite"></div><small class="muted">Le campagne a tempo possono terminare: controlla sempre date, requisiti e prenotazioni sul sito ASL.</small>`:`<p>${profile?.residence_city?`Residenza: <strong>${esc(profile.residence_city)} (${esc(profile.residence_province)})</strong>. `:'La residenza non è stata indicata. '}Non abbiamo ancora un'associazione ASL verificata per questo comune: non vogliamo indicarti la ASL sbagliata. Puoi consultare intanto le informazioni nazionali e chiedere al tuo medico o alla ASL di residenza.</p>`}</section>
 ${!profile?.residence_city||!profile?.residence_province?'<button class="btn secondary" id="screeningFindAsl" type="button">Usa posizione attuale per i servizi vicini</button><div id="screeningLocationMsg" role="status" aria-live="polite"></div>':''}<section class="card screening-profile"><h2>I tuoi dati per lo screening</h2><p class="muted">Puoi correggerli se cambi residenza. Il sesso indicato da solo non stabilisce quali organi siano presenti né sostituisce una valutazione individuale.</p><form id="screeningProfileForm"><label class="field"><span>Data di nascita</span><input id="screeningBirth" class="input" type="date" required max="${new Date().toISOString().slice(0,10)}" value="${esc(state.profile?.date_of_birth||'')}"></label><label class="field"><span>Sesso per gli screening</span><select id="screeningSex" class="input" required><option value="">Seleziona</option><option value="female" ${sex==='female'?'selected':''}>Donna</option><option value="male" ${sex==='male'?'selected':''}>Uomo</option><option value="undisclosed" ${sex==='undisclosed'?'selected':''}>Preferisco non indicarlo</option></select></label><div class="intake-residence"><label class="field"><span>Comune di residenza</span><input id="screeningCity" class="input" value="${esc(profile?.residence_city||'')}" maxlength="100" required></label><label class="field"><span>Provincia</span><input id="screeningProvince" class="input" value="${esc(profile?.residence_province||'')}" maxlength="2" required></label></div>${romeMunicipioField("screeningMunicipio",profile?.residence_municipio)}<button class="btn" type="submit">Salva dati</button><div id="screeningSaveMsg" role="status" aria-live="polite"></div></form></section>
 <div class="screening-sources small muted">Fonti: <a href="${SCREENING_ISS_URL}" target="_blank" rel="noopener noreferrer">ISS · screening oncologici</a> · <a href="${SCREENING_WHO_URL}" target="_blank" rel="noopener noreferrer">OMS · programmi organizzati</a>. Informazioni aggiornate e verificate il 24/09/2026; per campagne locali fa fede il sito ASL. Se hai sintomi, contatta il medico senza aspettare un invito.</div>`;
 document.getElementById('screeningFindAsl')?.addEventListener('click',async e=>{const button=e.currentTarget,box=document.getElementById('screeningLocationMsg');button.disabled=true;box.textContent='Cerco il comune della posizione attuale…';try{await currentAslLocation();if(state.tab==='screening')await patientScreening();}catch(error){box.textContent=error.message||'Non riesco a trovare la ASL. Inserisci il comune di residenza.';button.disabled=false;}});
 document.getElementById('screeningSearchCampaigns')?.addEventListener('click',async e=>{const button=e.currentTarget,box=document.getElementById('screeningCampaignResults');button.disabled=true;box.innerHTML=msg('Cerco gli avvisi pubblicati dalla ASL…');try{const data=await mediAsk(`Cerca esclusivamente sul sito ufficiale ${asl.campaigns} campagne di screening per ${aslArea.city} (${aslArea.province}) pubblicate o valide alla data odierna. Se trovi solo eventi scaduti, dillo esplicitamente. Non inventare date o prenotazioni.`, 'screening');const trusted=(data.sources||[]).filter(s=>{try{return new URL(s.url).hostname==='aslnapoli3sud.it'||new URL(s.url).hostname.endsWith('.aslnapoli3sud.it');}catch{return false;}});if(!trusted.length){box.innerHTML=msg('Non ho trovato una campagna verificabile sul sito della ASL. Controlla gli avvisi ufficiali con il pulsante qui sopra.');}else{mediRenderAnswer(box,{answer:data.answer,sources:trusted});box.insertAdjacentHTML('beforeend','<p class="small muted">Risultati assistiti dalla ricerca: prima di partecipare verifica la data e i requisiti nella fonte ufficiale.</p>');}}catch(error){box.innerHTML=msg('Ricerca non disponibile: consulta direttamente il sito della ASL.','error');}finally{button.disabled=false;}});
 bindRomeMunicipio('screeningCity','screeningProvince','screeningMunicipio');
 document.getElementById('screeningProfileForm').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button[type="submit"]'),out=document.getElementById('screeningSaveMsg');const birth=document.getElementById('screeningBirth').value,sex=document.getElementById('screeningSex').value,city=document.getElementById('screeningCity').value.trim().replace(/\s+/g,' '),province=document.getElementById('screeningProvince').value.trim().toUpperCase(),municipio=Number(document.getElementById('screeningMunicipio').value)||null;if(!birth||new Date(birth+'T12:00:00Z')>new Date()||!['female','male','undisclosed'].includes(sex)||city.length<2||!/^[A-Z]{2}$/.test(province)||(city.toLocaleLowerCase('it')==='roma'&&province==='RM'&&!municipio)){out.innerHTML=msg('Controlla i dati e usa la sigla di due lettere per la provincia.','error');return;}if(!officialAslLookup(city,province).length){out.innerHTML=msg('Comune e provincia non corrispondono ai dati ufficiali: controlla la grafia e la sigla.','error');return;}button.disabled=true;const {error:birthError}=await sb.from('profiles').update({date_of_birth:birth}).eq('id',state.session.user.id);const {error:saveError}=birthError?{error:null}:await sb.from('patient_screening_profiles').upsert({patient_id:state.session.user.id,sex_for_screening:sex,residence_city:city,residence_province:province,residence_municipio:municipio,updated_at:new Date().toISOString()},{onConflict:'patient_id'});if(birthError||saveError){out.innerHTML=msg('Impossibile salvare: '+(birthError||saveError).message,'error');button.disabled=false;return;}state.profile.date_of_birth=birth;await patientScreening();};
 document.getElementById('goVaccinesFromScreening').onclick=()=>{state.tab='vaccines';patientView();};
}
const PATIENT_VACCINES=[
 ['polio','Poliomielite','child'],['diphtheria','Difterite','child'],['tetanus','Tetano','child'],['hepatitis_b','Epatite B','child'],['pertussis','Pertosse','child'],['hib','Haemophilus influenzae tipo b','child'],['measles','Morbillo','child'],['rubella','Rosolia','child'],['mumps','Parotite','child'],['varicella','Varicella','child'],
 ['influenza','Influenza stagionale','recommended'],['hpv','Papillomavirus (HPV)','recommended'],['pneumococcus','Pneumococco','recommended'],['shingles','Herpes zoster','recommended']
];
async function patientVaccines(){
 const [{data:records,error},{data:residence}]=await Promise.all([sb.from('patient_vaccine_declarations').select('vaccine_code,status,updated_at').eq('patient_id',state.session.user.id),sb.from('patient_screening_profiles').select('residence_city,residence_province,residence_municipio').eq('patient_id',state.session.user.id).maybeSingle()]);
 if(error){content.innerHTML=msg('Promemoria vaccini non disponibile: '+error.message,'error');return;}
 const asl=aslAreaFor(residence)?.asl,age=screeningAge(state.profile?.date_of_birth),saved=new Map((records||[]).map(r=>[r.vaccine_code,r.status]));
 const list=kind=>PATIENT_VACCINES.filter(x=>x[2]===kind).map(([code,label])=>`<label class="vaccine-row"><span>${esc(label)}</span><select class="input vaccine-select" data-vaccine="${code}" aria-label="Stato dichiarato: ${esc(label)}"><option value="unknown" ${!saved.has(code)||saved.get(code)==='unknown'?'selected':''}>Non indicato</option><option value="reported_done" ${saved.get(code)==='reported_done'?'selected':''}>✓ Fatto (dichiarato)</option><option value="reported_not_done" ${saved.get(code)==='reported_not_done'?'selected':''}>Non fatto (dichiarato)</option></select></label>`).join('');
 content.innerHTML=`<section class="page-title"><div class="eyebrow dark">PREVENZIONE</div><h1>Il mio promemoria vaccini</h1><p>Segna ciò che ricordi. Una spunta qui è <strong>una tua dichiarazione</strong>, non un certificato né una verifica del Fascicolo sanitario.</p></section><section class="card vaccine-card"><h2>Vaccinazioni obbligatorie per i minori</h2><p>La legge prevede obblighi per i minori da 0 a 16 anni, con differenze secondo l'anno di nascita (per esempio anti-varicella per i nati dal 2017). ${age!==null&&age>=17?'Non sono obblighi vaccinali per adulti.':''} Per dosi, richiami, esoneri e recuperi fa fede il servizio vaccinale.</p><details><summary>Consulta le 10 malattie incluse e aggiorna i tuoi ricordi</summary><div class="vaccine-list">${list('child')}</div></details><a href="https://www.salute.gov.it/new/it/tema/vaccinazioni/legge-vaccini/" target="_blank" rel="noopener noreferrer">Legge vaccini · Ministero della Salute ↗</a></section><section class="card vaccine-card"><h2>Vaccinazioni raccomandate</h2><p>Non tutte sono indicate per chiunque: età, gravidanza, condizioni croniche, precedenti dosi e calendario aggiornato fanno la differenza. Chiedi al medico o al centro vaccinale quali ti riguardano.</p><div class="vaccine-list">${list('recommended')}</div><a href="https://www.salute.gov.it/new/it/tema/vaccinazioni/calendario-vaccinale/" target="_blank" rel="noopener noreferrer">Calendario vaccinale · Ministero della Salute ↗</a>${asl?`<p><a href="${asl.vaccinations}" target="_blank" rel="noopener noreferrer">Vaccinazioni nella tua ASL ↗</a></p>`:''}</section><p class="small muted">“Non indicato” non significa “non vaccinato”. Per verificare la tua storia vaccinale consulta il FSE o richiedi il certificato al servizio vaccinale. Meditaly non importa automaticamente quei dati.</p><div id="vaccineSaveMsg" role="status" aria-live="polite"></div>`;
 document.querySelectorAll('.vaccine-select').forEach(select=>select.onchange=async()=>{const value=select.value;select.disabled=true;const out=document.getElementById('vaccineSaveMsg');out.innerHTML=msg('Salvataggio…');const {error:saveError}=await sb.from('patient_vaccine_declarations').upsert({patient_id:state.session.user.id,vaccine_code:select.dataset.vaccine,status:value,updated_at:new Date().toISOString()},{onConflict:'patient_id,vaccine_code'});select.disabled=false;out.innerHTML=saveError?msg('Salvataggio non riuscito: '+saveError.message,'error'):msg('Dichiarazione personale salvata. Non sostituisce il certificato vaccinale.','success');if(saveError)select.value=saved.get(select.dataset.vaccine)||'unknown';else saved.set(select.dataset.vaccine,value);});
}
async function patientMore(){
 const clinician=await getAssignedClinician();
 content.innerHTML=`<section class="page-title v6-page"><div class="eyebrow dark">MEDITALY</div><h1>Menu</h1><p class="muted">Le funzioni del tuo spazio personale.</p></section><section class="more-grid"><button class="quick-card" data-go="journal"><span class="quick-icon">${uiIcon('diary')}</span><div><strong>Il mio diario</strong><small>Testo, vocali e video privati</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><button class="quick-card" data-go="imports"><span class="quick-icon">${uiIcon('import')}</span><div><strong>Aggiungi prescrizione</strong><small>Terapia, controllo o ricetta da foto</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><button class="quick-card" data-go="reports"><span class="quick-icon">${uiIcon('report')}</span><div><strong>Referti</strong><small>Documenti e caricamenti</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><button class="quick-card" data-go="followup"><span class="quick-icon">${uiIcon('calendar')}</span><div><strong>Controlli</strong><small>Prossimi appuntamenti e storico</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><button class="quick-card" data-go="assignedQuestionnaires"><span class="quick-icon">${uiIcon('form')}</span><div><strong>Questionari del medico</strong><small>Solo quelli assegnati a te</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><button class="quick-card" data-go="notifications"><span class="quick-icon">${uiIcon('bell')}</span><div><strong>Notifiche</strong><small>Promemoria e comunicazioni</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><button class="quick-card" data-go="privacy"><span class="quick-icon">${uiIcon('shield')}</span><div><strong>Privacy e consensi</strong><small>Documenti e registro</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><a class="quick-card" href="https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/legal-docs?doc=security" target="_blank"><span class="quick-icon">${uiIcon('lock')}</span><div><strong>Sicurezza account</strong><small>Password, 2FA e protezione</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></a><button class="quick-card" id="moreDoctor"><span class="quick-icon">${uiIcon('doctor')}</span><div><strong>Il mio medico</strong><small>${esc(clinician?.profiles?.full_name||'Nessun medico assegnato')}</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button>${state.profile?.role==='Administrator'?`<button class="quick-card admin-entry" id="adminEntry"><span class="quick-icon">${uiIcon('settings')}</span><div><strong>Area amministratore</strong><small>Utenti, assegnazioni e audit</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button>`:''}</section><section class="card card-pad section"><strong>Suono promemoria terapia</strong><p class="muted">All’orario del farmaco, Meditaly usa una sirena fissa di 1,6 secondi. Il suono non si cambia nell’app.</p></section>`;
 document.querySelector('.more-grid')?.insertAdjacentHTML('afterbegin',`<button class="quick-card" data-go="inviteDoctor"><span class="quick-icon">${uiIcon('doctor')}</span><div><strong>Invita il tuo medico</strong><small>Invia un invito via email</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><button class="quick-card" data-go="screening"><span class="quick-icon">${uiIcon('search')}</span><div><strong>Screening</strong><small>Programmi di prevenzione e servizi della tua ASL</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button><button class="quick-card" data-go="vaccines"><span class="quick-icon">${uiIcon('vaccine')}</span><div><strong>Vaccini</strong><small>Calendario e promemoria personale</small></div><b class="quick-chevron">${uiIcon('chevron')}</b></button>`);
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.go==='chat')state.selectedChatPeer=null;state.tab=b.dataset.go;patientView()});
 document.getElementById('moreDoctor').onclick=()=>{state.tab='doctor';patientView();};
 const ae=document.getElementById('adminEntry'); if(ae)ae.onclick=()=>{state.adminArea=true;state.tab='users';render();};
}
async function patientInviteDoctor(){
 content.innerHTML=`<section class="page-title v6-page"><div class="eyebrow dark">COLLEGAMENTI</div><h1>Invita il tuo medico</h1><p>Segnala l'indirizzo email professionale del medico: gli invieremo un invito a registrarsi su Meditaly per il follow-up.</p></section><section class="card card-pad section"><form id="doctorInviteForm"><div class="field"><label for="doctorInviteEmail">Email del medico</label><input id="doctorInviteEmail" class="input" type="email" inputmode="email" autocomplete="off" maxlength="254" required placeholder="medico@studio.it"></div><label class="check-row"><input id="doctorInviteConsent" type="checkbox" required><span>Confermo di poter contattare questo medico all'indirizzo indicato.</span></label><p class="small muted">L'invito non contiene dati sanitari e non collega automaticamente il medico al tuo profilo: dovrà registrarsi ed essere verificato.</p><button class="btn full" id="doctorInviteSubmit" type="submit">Invia invito</button><div id="doctorInviteResult" role="status" aria-live="polite"></div></form></section>`;
 document.getElementById('doctorInviteForm').onsubmit=async e=>{
  e.preventDefault();const button=document.getElementById('doctorInviteSubmit'),out=document.getElementById('doctorInviteResult');
  const email=document.getElementById('doctorInviteEmail').value.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){out.innerHTML=msg('Inserisci un indirizzo email valido.','error');return;}
  button.disabled=true;out.innerHTML=msg('Invio in corso…');
  try{
   const {data,error}=await sb.functions.invoke('invite-doctor',{body:{email}});
   if(error||!data?.ok){const detail=data||await error?.context?.json?.().catch(()=>({}))||{};throw new Error(detail.error==='INVITE_LIMIT'?'Hai raggiunto il limite di inviti. Riprova più tardi.':detail.error==='INVITE_ALREADY_SENT'?'Hai già invitato questo indirizzo.':detail.error==='SERVICE_NOT_CONFIGURED'?'Il servizio inviti non è ancora configurato. Riprova più tardi.':'Impossibile inviare l’invito. Riprova più tardi.');}
   out.innerHTML=msg('Invito inviato. Il medico riceverà un’email per avviare la registrazione.','ok');document.getElementById('doctorInviteEmail').value='';
  }catch(err){out.innerHTML=msg(err.message||'Invio non riuscito.','error');}
  finally{button.disabled=false;}
 };
}
async function patientDoctorLink(){
 const [{data:dir,error:de},{data:reqs,error:re},{data:links,error:le},{data:contact,error:ce}]=await Promise.all([
  sb.rpc('list_verified_clinicians'),
  sb.from('patient_clinician_requests').select('clinician_id,status,created_at').eq('patient_id',state.session.user.id).order('created_at',{ascending:false}),
  sb.from('patient_clinicians').select('clinician_id,profiles!patient_clinicians_clinician_id_fkey(full_name)').eq('patient_id',state.session.user.id).eq('active',true),
  sb.from('patient_care_contacts').select('primary_clinician_id,initial_choice,test_support_admin_id').eq('patient_id',state.session.user.id).maybeSingle()
 ]);
 if(de||re||le||ce)return content.innerHTML=msg(de?.message||re?.message||le?.message||ce?.message,'error');
 const realLinks=(links||[]).filter(x=>x.clinician_id!==contact?.test_support_admin_id);
 const names=new Map((dir||[]).map(d=>[d.clinician_id,d.display_name]));
 content.innerHTML=`<section class="page-title"><div class="eyebrow dark">COLLEGAMENTI</div><h1>I miei medici</h1><p class="muted">Un medico principale per il percorso; puoi aggiungere altri medici verificati e decidere chi diventa il riferimento.</p></section><section class="card"><h2>Medici collegati</h2><div class="list">${realLinks.map(x=>`<div class="item"><strong>${esc(names.get(x.clinician_id)||x.profiles?.full_name||'Medico')}</strong> ${x.clinician_id===contact?.primary_clinician_id&&contact?.initial_choice!=='test'?'<span class="pill">Principale</span>':`<button class="btn secondary make-primary" data-id="${x.clinician_id}">Imposta principale</button>`}<button class="btn secondary disconnect-doctor" data-id="${x.clinician_id}" data-name="${esc(names.get(x.clinician_id)||x.profiles?.full_name||'Medico')}">Interrompi collegamento</button></div>`).join('')||'<p>Nessun medico ha ancora accettato il collegamento.</p>'}</div></section>${state.profile?.role==='Administrator'?`<section class="card"><h2>Test Medico</h2><p class="muted">Sei entrato come amministratore. Il tuo profilo personale non può scegliere Test Medico perché il contatto di prova sarebbe il tuo stesso account. Per provarlo accedi con un account Paziente distinto e scegli «Entra in modalità test» al primo accesso; nella dashboard apri l’area Test Medico.</p></section>`:`<section class="card"><h2>Ciro Maiello · Test Medico</h2><p class="muted">Contatto di prova dell’amministratore, distinto dai medici verificati. Non richiede accettazione e non rilascia prescrizioni.</p><span class="pill">${contact?.initial_choice==='test'?'Modalità test attiva':'Contatto test disponibile'}</span></section>`}<section class="card"><h2>Medici e contatti disponibili</h2><input class="input" id="doctorSearch" placeholder="Cerca nome, specializzazione o contatto test"><div id="doctorList" class="doctor-directory"></div></section><section class="card"><h3>Richieste inviate</h3><div class="list">${(reqs||[]).map(r=>`<div class="item"><strong>${esc(names.get(r.clinician_id)||'Medico')}</strong><div class="muted">${esc(r.status)} · ${fmt(r.created_at)}${r.procedure_label?` · Prestazione: ${esc(r.procedure_label)} (${esc(r.performed_on||"data non indicata")})`:""}</div></div>`).join('')||'<p class="muted">Nessuna richiesta.</p>'}</div></section>`;
 document.querySelectorAll('.disconnect-doctor').forEach(b=>b.onclick=()=>disconnectDoctor(b.dataset.id,b.dataset.name));
 document.querySelectorAll('.make-primary').forEach(b=>b.onclick=async()=>{const {error}=await sb.rpc('patient_set_primary_doctor',{p_clinician:b.dataset.id});if(error)alert(error.message);else {patientDoctorLink();mediVoiceNotice('Medico principale aggiornato.');}});
 const draw=()=>{const q=(document.getElementById('doctorSearch').value||'').toLocaleLowerCase('it'),pending=new Set((reqs||[]).filter(x=>x.status==='Pending').map(x=>x.clinician_id)),active=new Set(realLinks.map(x=>x.clinician_id));const test=state.profile?.role==='Patient'&&(q===''||'ciro maiello test medico'.includes(q))?`<article class="doctor-card test-contact-choice"><div class="doctor-avatar">T</div><div><strong>Ciro Maiello · Test Medico</strong><small>Contatto di prova · non medico verificato</small></div>${contact?.initial_choice==='test'?'<span class="pill">Attivo</span>':'<button class="btn secondary activate-test-contact">Seleziona test</button>'}</article>`:'';document.getElementById('doctorList').innerHTML=test+(dir||[]).filter(d=>[d.display_name,d.specialty,d.center_label].join(' ').toLocaleLowerCase('it').includes(q)).map(d=>`<article class="doctor-card"><div class="doctor-avatar">${uiIcon('doctor')}</div><div><strong>${esc(d.display_name)}</strong><small>${esc(d.specialty||'Medico')} ${d.center_label?'· '+esc(d.center_label):''}</small></div>${active.has(d.clinician_id)?'<span class="pill">Collegato</span>':pending.has(d.clinician_id)?'<span class="pill">Richiesta al medico in attesa</span>':`<button class="btn secondary request-doctor" data-id="${d.clinician_id}">Aggiungi</button>`}</article>`).join('')||'<div class="empty-state">Nessun medico verificato disponibile.</div>';document.querySelector('.activate-test-contact')?.addEventListener('click',async e=>{const button=e.currentTarget;button.disabled=true;const {error}=await sb.rpc('patient_choose_initial_doctor',{p_clinician:null});if(error){alert(error.message);button.disabled=false;return;}mediVoiceNotice('Ciro Maiello · Test Medico selezionato.');patientDoctorLink();});document.querySelectorAll('.request-doctor').forEach(b=>b.onclick=async()=>{b.disabled=true;const {error}=await sb.rpc('request_clinician_link',{p_clinician:b.dataset.id,p_note:'Medico aggiuntivo'});if(error){alert(error.message);b.disabled=false;}else {mediVoiceNotice('Richiesta inviata al medico.');patientDoctorLink();}});};
 document.getElementById('doctorSearch').oninput=draw;draw();
}
function parseOcrSuggestion(text){
 const clean=(text||'').replace(/\r/g,' ').replace(/\n+/g,' ').replace(/\s+/g,' ').trim();
 const times=[...clean.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)].map(m=>`${String(m[1]).padStart(2,'0')}:${m[2]}`);
 const date=clean.match(/\b([0-3]?\d)[\/.\-]([01]?\d)[\/.\-](20\d{2}|\d{2})\b/);
 const dose=clean.match(/\b(\d+(?:[,.]\d+)?\s*(?:mg|g|ml|mcg|µg|compress(?:a|e)|cp|capsul(?:a|e)))\b/i);
 return {raw:clean,times:[...new Set(times)],date:date?`${date[3].length===2?'20'+date[3]:date[3]}-${String(date[2]).padStart(2,'0')}-${String(date[1]).padStart(2,'0')}`:'',dose:dose?dose[1]:''};
}

function journalMime(file,kind){
 const mime=(file.type||'').toLowerCase().split(';')[0];
 const known=new Set(['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/wav','audio/3gpp','audio/amr','audio/x-m4a','audio/m4a','video/mp4','video/webm','video/3gpp','video/quicktime']);
 if(known.has(mime))return mime;
 const ext=(file.name||'').split('.').pop().toLowerCase();
 const byExt={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',oga:'audio/ogg',webm:kind==='video'?'video/webm':'audio/webm',wav:'audio/wav',amr:'audio/amr',mp4:kind==='video'?'video/mp4':'audio/mp4',mov:'video/quicktime','3gp':kind==='video'?'video/3gpp':'audio/3gpp'};
 return byExt[ext]||null;
}
async function uploadJournalMedia(path,file,mime){
 // Il bucket ammette 50 MB. Usa il client già caricato dall'app, anche offline
 // rispetto ai CDN, e passa sempre un MIME consentito per i content URI Android.
 const {error}=await sb.storage.from('patient-journal').upload(path,file,{contentType:mime,upsert:false,cacheControl:'3600'});
 if(error)throw error;
}

async function legacyPatientJournal(){
 const {data:entries,error}=await sb.from('patient_journal_entries').select('*').eq('patient_id',state.session.user.id).order('created_at',{ascending:false});
 if(error)return content.innerHTML=`${msg('Il Diario richiede l\'applicazione della migrazione Supabase inclusa nel pacchetto. '+error.message,'error')}<button class="btn secondary" id="journalBack">Torna alla Home</button>`,document.getElementById('journalBack').onclick=()=>{state.tab='home';patientView();};
 const moodMeta={great:['🤩','Molto bene'],good:['🙂','Bene'],neutral:['😐','Così così'],low:['☹️','Non bene']};
 const journalPages=(entries||[]).map(x=>{
  const mm=moodMeta[x.mood]||['●','Stato registrato'];
  const mediaButton=x.media_path?`<button class="btn secondary small journal-open-media" data-path="${esc(x.media_path)}">${uiIcon('play')} ${x.media_type==='video'?'Guarda video':'Ascolta vocale'}</button>`:'';
  return `<article class="journal-entry"><div class="journal-entry-head"><span class="journal-entry-mood">${mm[0]}</span><div><strong>${esc(mm[1])}</strong><small>${new Date(x.created_at).toLocaleString('it-IT')}</small></div><span class="spacer"></span><button class="icon-btn journal-share" data-id="${x.id}" aria-label="Condividi">${uiIcon('share')}</button><button class="icon-btn journal-delete" data-id="${x.id}" aria-label="Elimina">${uiIcon('trash')}</button></div>${x.text_content?`<p>${esc(x.text_content).replace(/\n/g,'<br>')}</p>`:''}${mediaButton}</article>`;
 }).join('')||`<div class="empty-state"><div class="journal-empty-icon">${uiIcon('diary')}</div><strong>Il diario è ancora vuoto</strong><span>La prima pagina può essere anche solo una faccina.</span></div>`;
 content.innerHTML=`<section class="page-title"><button class="back-link" id="journalBack">${uiIcon('back')} Home</button><div class="eyebrow dark">SPAZIO PERSONALE</div><h1>Il mio diario</h1><p class="muted">Registra come ti senti con testo, nota vocale o video. Le voci restano private finché non decidi tu di condividerle.</p></section>
 <section class="card journal-compose"><h2>Nuova pagina</h2><div class="journal-moods">${Object.entries(moodMeta).map(([k,v])=>`<button class="journal-mood" data-journal-mood="${k}" aria-pressed="false" type="button"><span>${v[0]}</span><strong>${v[1]}</strong></button>`).join('')}</div><div class="field"><label for="journalText">Cosa vuoi ricordare?</label><textarea id="journalText" class="textarea" rows="5" maxlength="5000" placeholder="Scrivi liberamente…"></textarea><small class="muted">Facoltativo se aggiungi un vocale o un video.</small></div><div class="journal-media-actions"><button class="btn secondary" id="journalAudioBtn">${uiIcon('microphone')}<span>Registra vocale</span></button><button class="btn secondary" id="journalVideoBtn">${uiIcon('video')}<span>Registra video</span></button><button class="text-link hidden" id="journalRemoveMedia">Rimuovi allegato</button></div><input class="hidden" id="journalAudio" type="file" accept="audio/*" capture><input class="hidden" id="journalVideo" type="file" accept="video/*" capture="user"><div id="journalMediaInfo" class="journal-media-info muted" role="status" aria-live="polite">Nessun allegato.</div><button class="btn full" id="journalSave">Salva nel diario</button><div id="journalMsg" role="status" aria-live="polite"></div><p class="small muted">Non usare il Diario per chiedere aiuto in un'emergenza. Audio e video: massimo 50 MB.</p></section>
 <section><div class="section-head"><h2 class="section-title">Le mie pagine</h2><span class="badge gray">${(entries||[]).length}</span></div><div class="journal-list">${journalPages}</div></section>`;
 let mood='',mediaFile=null,mediaType=null;
 const info=document.getElementById('journalMediaInfo'),remove=document.getElementById('journalRemoveMedia');
 const choose=(file,type)=>{if(!file)return;const out=document.getElementById('journalMsg');if(!file.size){out.innerHTML=msg('Registrazione vuota. Riprova oppure scegli un file già salvato.','error');return;}if(file.size>50*1024*1024){out.innerHTML=msg('Il file supera 50 MB. Registra un video più breve.','error');return;}if(!journalMime(file,type)){out.innerHTML=msg('Formato della registrazione non riconosciuto. Scegli MP4, M4A, MP3, 3GP, WAV o WebM.','error');return;}out.textContent='';mediaFile=file;mediaType=type;info.textContent=`${type==='video'?'Video':'Vocale'}: ${file.name||'registrazione'} · ${(file.size/1024/1024).toFixed(1)} MB`;remove.classList.remove('hidden');};
 document.querySelectorAll('[data-journal-mood]').forEach(b=>b.onclick=()=>{mood=b.dataset.journalMood;document.querySelectorAll('[data-journal-mood]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});});
 document.getElementById('journalAudioBtn').onclick=()=>document.getElementById('journalAudio').click();document.getElementById('journalVideoBtn').onclick=()=>document.getElementById('journalVideo').click();document.getElementById('journalAudio').onchange=e=>choose(e.target.files?.[0],'audio');document.getElementById('journalVideo').onchange=e=>choose(e.target.files?.[0],'video');
 remove.onclick=()=>{mediaFile=null;mediaType=null;info.textContent='Nessun allegato.';remove.classList.add('hidden');};
 document.getElementById('journalSave').onclick=async()=>{const textValue=document.getElementById('journalText').value.trim(),out=document.getElementById('journalMsg'),saveButton=document.getElementById('journalSave');if(saveButton.disabled)return;if(!mood)return out.innerHTML=msg('Scegli prima come ti senti.','error');if(!textValue&&!mediaFile)return out.innerHTML=msg('Scrivi un pensiero oppure aggiungi un vocale o un video.','error');saveButton.disabled=true;out.innerHTML=msg('Salvataggio in corso…');let media_path=null,uploaded=false;try{const mime=mediaFile?journalMime(mediaFile,mediaType):null;if(mediaFile){if(!mime)throw new Error('Formato audio o video non supportato.');const suffix=({'audio/mpeg':'mp3','audio/mp4':'m4a','audio/aac':'aac','audio/ogg':'ogg','audio/webm':'webm','audio/wav':'wav','audio/3gpp':'3gp','audio/amr':'amr','audio/x-m4a':'m4a','audio/m4a':'m4a','video/mp4':'mp4','video/webm':'webm','video/3gpp':'3gp','video/quicktime':'mov'})[mime];media_path=`${state.session.user.id}/${Date.now()}_${crypto.randomUUID()}.${suffix}`;out.innerHTML=msg('Caricamento della registrazione in corso…');await uploadJournalMedia(media_path,mediaFile,mime);uploaded=true;}const ins=await sb.from('patient_journal_entries').insert({patient_id:state.session.user.id,mood,text_content:textValue||null,media_path,media_type:mediaType,media_mime:mime});if(ins.error)throw ins.error;out.innerHTML=msg('Pagina salvata.','ok');await patientJournal();}catch(e){if(uploaded)void sb.storage.from('patient-journal').remove([media_path]);out.innerHTML=msg(e.message||'Salvataggio non riuscito.','error');saveButton.disabled=false;}};
 const signed=async path=>{const r=await sb.storage.from('patient-journal').createSignedUrl(path,900);if(r.error)throw r.error;return r.data.signedUrl;};
 document.querySelectorAll('.journal-open-media').forEach(b=>b.onclick=async()=>{try{const url=await signed(b.dataset.path);const video=b.textContent.includes('Guarda video');const overlay=document.createElement('div');overlay.className='journal-player-overlay';overlay.innerHTML=`<div class="journal-player-card" role="dialog" aria-modal="true" aria-label="Registrazione del diario"><button type="button" class="journal-player-close" aria-label="Chiudi">×</button><${video?'video':'audio'} controls playsinline preload="metadata" src="${esc(url)}"></${video?'video':'audio'}></div>`;document.body.append(overlay);const close=()=>{overlay.querySelector('video,audio')?.pause();overlay.remove();};overlay.querySelector('button').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};}catch(e){alert(e.message)}});
 document.querySelectorAll('.journal-share').forEach(b=>b.onclick=async()=>{const row=(entries||[]).find(x=>x.id===b.dataset.id);if(!row)return;try{let text=`Dal mio Diario Meditaly · ${new Date(row.created_at).toLocaleString('it-IT')}\nStato: ${(moodMeta[row.mood]||['',''])[1]}${row.text_content?`\n\n${row.text_content}`:''}`;if(row.media_path)text+=`\n\nAllegato privato (link valido 15 minuti): ${await signed(row.media_path)}`;if(window.AndroidBridge?.shareText)AndroidBridge.shareText('Il mio diario Meditaly',text);else if(navigator.share)await navigator.share({title:'Il mio diario Meditaly',text});else{await navigator.clipboard.writeText(text);alert('Contenuto copiato.');}}catch(e){if(e?.name!=='AbortError')alert(e.message)}});
 document.querySelectorAll('.journal-delete').forEach(b=>b.onclick=async()=>{const row=(entries||[]).find(x=>x.id===b.dataset.id);if(!row||!confirm('Eliminare definitivamente questa pagina del Diario?'))return;const del=await sb.from('patient_journal_entries').delete().eq('id',row.id);if(del.error)return alert(del.error.message);if(row.media_path)await sb.storage.from('patient-journal').remove([row.media_path]);patientJournal();});
 document.getElementById('journalBack').onclick=()=>{state.tab='home';patientView();};
}

async function prepareImageForOcr(file,maxSide=1600){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('Impossibile leggere la foto.'));
  reader.onload=()=>{
   const img=new Image();
   img.onerror=()=>reject(new Error('Immagine non valida.'));
   img.onload=()=>{
    let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    const scale=Math.min(1,maxSide/Math.max(w,h));
    w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(img,0,0,w,h);
    resolve(canvas.toDataURL('image/jpeg',0.86));
   };
   img.src=reader.result;
  };
  reader.readAsDataURL(file);
 });
}

async function patientCareImports(){
 const kind=state.importKind||'therapy';
 const {data:rows}=await sb.from('patient_care_imports').select('*').eq('patient_id',state.session.user.id).order('created_at',{ascending:false}).limit(20);
 content.innerHTML=`<section class="page-title"><div class="eyebrow dark">AGGIUNGI AL PERCORSO</div><h1>Prescrizioni e controlli</h1><p class="muted">Puoi inserire i dati manualmente oppure fotografare una prescrizione. Prima di diventare una terapia o un controllo confermato, il medico può verificarla.</p></section>
 <section class="import-choice"><button class="choice-card ${kind==='therapy'?'active':''}" data-kind="therapy">${uiIcon('pill')}<strong>Terapia</strong></button><button class="choice-card ${kind==='control'?'active':''}" data-kind="control">${uiIcon('calendar')}<strong>Controllo</strong></button><button class="choice-card ${kind==='document'?'active':''}" data-kind="document">${uiIcon('report')}<strong>Ricetta / documento</strong></button></section>
 <section class="card"><div class="tabs"><button id="manualMode" class="on">Inserisci manualmente</button><button id="photoMode">Da foto</button></div><div id="importForm"></div></section>
 <section class="card"><h3>Invii al medico</h3><div class="list">${(rows||[]).map(x=>`<div class="item"><strong>${esc(x.title)}</strong><div class="muted">${esc(x.item_type)} · ${esc(x.source_type)} · ${esc(x.status)} · ${fmt(x.created_at)}</div></div>`).join('')||'<p class="muted">Nessun elemento inviato.</p>'}</div></section>`;
 let mode='manual',currentKind=kind,photoFile=null,ocr='';
 const renderForm=()=>{const box=document.getElementById('importForm');if(mode==='manual'){
   if(currentKind==='therapy')box.innerHTML=`<div class="field"><label>Farmaco</label><input id="impName" class="input"></div><div class="grid-2"><div class="field"><label>Dose</label><input id="impDose" class="input"></div><div class="field"><label>Via</label><input id="impRoute" class="input" value="Orale"></div></div><div class="field"><label>Orari</label><input id="impTimes" class="input" placeholder="08:00, 20:00"></div><div class="grid-2"><div class="field"><label>Inizio</label><input id="impStart" type="date" class="input"></div><div class="field"><label>Fine</label><input id="impEnd" type="date" class="input"></div></div><div class="field"><label>Note / istruzioni</label><textarea id="impNotes" class="textarea"></textarea></div><button class="btn full" id="submitImport">Invia al medico per conferma</button><div id="impMsg"></div>`;
   else if(currentKind==='control')box.innerHTML=`<div class="field"><label>Nome controllo</label><input id="impLabel" class="input" placeholder="Es. Visita cardiologica"></div><div class="grid-2"><div class="field"><label>Tipo</label><input id="impType" class="input" value="visita"></div><div class="field"><label>Data</label><input id="impDate" type="date" class="input"></div></div><div class="field"><label>Note</label><textarea id="impNotes" class="textarea"></textarea></div><button class="btn full" id="submitImport">Invia al medico per conferma</button><div id="impMsg"></div>`;
   else box.innerHTML=`<div class="field"><label>Titolo documento</label><input id="impTitle" class="input" placeholder="Es. Ricetta del 21/09/2026"></div><div class="field"><label>Note</label><textarea id="impNotes" class="textarea"></textarea></div><button class="btn full" id="submitImport">Archivia richiesta</button><div id="impMsg"></div>`;
   document.getElementById('submitImport').onclick=submitManual;
 } else {box.innerHTML=`<div class="photo-import"><div class="upload-icon">${uiIcon('camera')}</div><h3>Fotografa o carica il documento</h3><p class="muted small">Meditaly prova a leggere il testo della foto. Controlla sempre i dati proposti prima di inviarli.</p><div class="row wrap"><button class="btn secondary" id="takeImportPhoto" type="button">📷 Scatta foto</button><button class="btn secondary" id="chooseImportPhoto" type="button">🖼️ Galleria</button><button class="btn secondary" id="chooseImportPdf" type="button">PDF Carica PDF</button></div><input id="photoImportCamera" class="hidden" type="file" accept="image/*" capture="environment"><input id="photoImportGallery" class="hidden" type="file" accept="image/*"><input id="photoImportPdf" class="hidden" type="file" accept="application/pdf"><div id="photoChosen" class="small muted"></div><div class="field"><label>Titolo</label><input id="photoTitle" class="input" placeholder="Es. Ricetta / prescrizione"></div><button class="btn secondary full" id="ocrBtn">Interpreta foto</button><div id="ocrStatus"></div><div class="field"><label>Testo riconosciuto / da correggere</label><textarea id="ocrText" class="textarea" rows="7"></textarea></div><div id="ocrSuggestions"></div><button class="btn full" id="savePhotoImport">Salva e invia al medico</button><div id="photoMsg"></div></div>`;
   const cam=document.getElementById('photoImportCamera'),gal=document.getElementById('photoImportGallery'),pdfInput=document.getElementById('photoImportPdf');const setPhoto=f=>{photoFile=f||null;document.getElementById('photoChosen').textContent=photoFile?`Selezionato: ${photoFile.name||'documento'} · ${(photoFile.size/1024/1024).toFixed(1)} MB`:'';};cam.onchange=e=>setPhoto(e.target.files?.[0]);gal.onchange=e=>setPhoto(e.target.files?.[0]);pdfInput.onchange=e=>setPhoto(e.target.files?.[0]);document.getElementById('takeImportPhoto').onclick=()=>{cam.value='';cam.click();};document.getElementById('chooseImportPhoto').onclick=()=>{gal.value='';gal.click();};document.getElementById('chooseImportPdf').onclick=()=>{pdfInput.value='';pdfInput.click();};
   document.getElementById('ocrBtn').onclick=runOcr;document.getElementById('savePhotoImport').onclick=savePhoto;
 }};
 const submitManual=async()=>{let title='',data={},note='';if(currentKind==='therapy'){title=document.getElementById('impName').value.trim();data={name:title,dose:document.getElementById('impDose').value.trim(),route:document.getElementById('impRoute').value.trim(),times:document.getElementById('impTimes').value.split(',').map(x=>x.trim()).filter(Boolean),starts_on:document.getElementById('impStart').value||null,ends_on:document.getElementById('impEnd').value||null,instructions:document.getElementById('impNotes').value.trim()};note=data.instructions;}else if(currentKind==='control'){title=document.getElementById('impLabel').value.trim();data={label:title,type:document.getElementById('impType').value.trim()||'visita',due_date:document.getElementById('impDate').value||null,notes:document.getElementById('impNotes').value.trim()};note=data.notes;}else{title=document.getElementById('impTitle').value.trim();note=document.getElementById('impNotes').value.trim();data={};}if(!title)return alert('Inserisci un titolo.');const {error}=await sb.rpc('submit_patient_care_import',{p_item_type:currentKind,p_source_type:'manual',p_title:title,p_storage_path:null,p_mime_type:null,p_ocr_text:null,p_structured_data:data,p_note:note||null});if(error)return document.getElementById('impMsg').innerHTML=msg(error.message,'error');document.getElementById('impMsg').innerHTML=msg('Inviato al medico per verifica.','success');setTimeout(()=>patientCareImports(),600);};
 const runOcr=async()=>{if(!photoFile)return alert('Seleziona una foto.');if(photoFile.type==='application/pdf')return alert('L’OCR in questa versione lavora sulle immagini. Per il PDF puoi comunque salvarlo e inviarlo al medico.');if(photoFile.size>15*1024*1024)return alert('La foto supera il limite di 15 MB.');const stat=document.getElementById('ocrStatus');stat.innerHTML=msg('Lettura della foto…');try{const dataUrl=await prepareImageForOcr(photoFile);if(window.AndroidBridge?.ocrImage){window.onMeditalyOcrResult=(text)=>{ocr=text||'';document.getElementById('ocrText').value=ocr;const sug=parseOcrSuggestion(ocr);document.getElementById('ocrSuggestions').innerHTML=`<div class="notice"><strong>Dati riconosciuti</strong><div>${sug.dose?'Dose: '+esc(sug.dose)+' · ':''}${sug.times.length?'Orari: '+esc(sug.times.join(', '))+' · ':''}${sug.date?'Data: '+esc(sug.date):''}</div></div>`;stat.innerHTML=msg('Lettura completata. Controlla il testo.','success');};window.onMeditalyOcrError=(e)=>{stat.innerHTML=msg(e||'Testo non riconosciuto','error');};AndroidBridge.ocrImage(dataUrl);}else{stat.innerHTML=msg('OCR disponibile nella versione Android dell’app. Puoi comunque archiviare la foto.','error');}}catch(e){stat.innerHTML=msg(e.message||'Impossibile preparare la foto per OCR.','error');}};
const savePhoto=async()=>{if(!photoFile)return alert('Seleziona una foto.');const title=document.getElementById('photoTitle').value.trim()||'Documento sanitario';const text=document.getElementById('ocrText').value.trim();const sug=parseOcrSuggestion(text);let structured={};if(currentKind==='therapy')structured={name:title,dose:sug.dose||'',route:'',times:sug.times,instructions:text};else if(currentKind==='control')structured={label:title,type:'visita',due_date:sug.date||null,notes:text};const ext=(photoFile.name.split('.').pop()||'jpg').toLowerCase();const path=`${state.session.user.id}/imports/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;document.getElementById('photoMsg').innerHTML=msg('Caricamento…');const up=await sb.storage.from('medical-reports').upload(path,photoFile,{contentType:photoFile.type||'image/jpeg',upsert:false});if(up.error)return document.getElementById('photoMsg').innerHTML=msg(up.error.message,'error');const {error}=await sb.rpc('submit_patient_care_import',{p_item_type:currentKind,p_source_type:(photoFile.type==='application/pdf'?'pdf':'photo'),p_title:title,p_storage_path:path,p_mime_type:photoFile.type||'application/octet-stream',p_ocr_text:text||null,p_structured_data:structured,p_note:null});if(error){await sb.storage.from('medical-reports').remove([path]);return document.getElementById('photoMsg').innerHTML=msg(error.message,'error');}document.getElementById('photoMsg').innerHTML=msg('Documento inviato al medico per verifica.','success');setTimeout(()=>patientCareImports(),700);};
 document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{currentKind=b.dataset.kind;state.importKind=currentKind;document.querySelectorAll('[data-kind]').forEach(x=>x.classList.toggle('active',x===b));renderForm();});document.getElementById('manualMode').onclick=()=>{mode='manual';document.getElementById('manualMode').classList.add('on');document.getElementById('photoMode').classList.remove('on');renderForm();};document.getElementById('photoMode').onclick=()=>{mode='photo';document.getElementById('photoMode').classList.add('on');document.getElementById('manualMode').classList.remove('on');renderForm();};renderForm();
}

async function patientReports(){
 const {data,error}=await sb.from('medical_reports').select('*,medical_report_files(*)').order('report_date',{ascending:false}).order('uploaded_at',{ascending:false});
 if(error)return content.innerHTML=msg(error.message,'error');
 content.innerHTML=`
 <section class="page-title"><div class="eyebrow dark">DOCUMENTI SANITARI</div><h1>Referti e documenti</h1><p class="muted">Scatta una foto, scegli immagini dalla galleria oppure carica un PDF. Fotocamera, galleria e PDF restano azioni separate.</p></section>
 <section id="receivedDocuments" class="card"><h2>Ricevuti dal medico</h2><p>Caricamento…</p></section>
 <section class="upload-card card"><div class="upload-icon">${uiIcon('report')}</div><div><h2 class="section-title">Nuovo referto</h2><p class="small muted">Immagini e PDF fino a 15 MB per file · documenti conservati in storage privato</p></div><div class="field"><label>Titolo</label><input class="input" id="reportTitle" placeholder="Es. Esami del sangue"></div><div class="grid-2"><div class="field"><label>Tipo</label><select class="select" id="reportType"><option>Referto laboratorio</option><option>Visita specialistica</option><option>ECG</option><option>Ecografia</option><option>Radiologia</option><option>Altro</option></select></div><div class="field"><label>Data referto</label><input class="input" id="reportDate" type="date"></div></div>
 <div class="report-source-grid"><button class="report-source-btn camera" id="capturePage" type="button"><span>${uiIcon('camera')}</span><strong>Scatta foto</strong><small>Fotocamera</small></button><button class="report-source-btn" id="galleryPage" type="button"><span>${uiIcon('image')}</span><strong>Galleria</strong><small>Una o più immagini</small></button><button class="report-source-btn" id="pdfPage" type="button"><span>PDF</span><strong>Carica PDF</strong><small>Documento</small></button></div>
 <input class="hidden" id="reportCamera" type="file" accept="image/*" capture="environment"><input class="hidden" id="reportGallery" type="file" accept="image/*" multiple><input class="hidden" id="reportPdf" type="file" accept="application/pdf"><div id="pagePreview" class="page-preview-list"></div><button class="btn full" id="uploadReport">Salva referto</button><div id="reportMsg"></div></section>
 <section><div class="section-head"><div><div class="eyebrow dark">ARCHIVIO</div><h2 class="section-title">Archivio completo</h2></div><span class="badge gray">${(data||[]).length}</span></div><div class="report-list">${(data||[]).map(x=>{const files=(x.medical_report_files||[]).sort((a,b)=>a.page_number-b.page_number);return `<article class="report-card"><div class="report-file-icon">${files.some(f=>f.mime_type==='application/pdf')?'PDF':(files.length||1)+'P'}</div><div class="report-body"><strong>${esc(x.title)}</strong><small>${esc(x.report_type||'Referto')} · ${fmt(x.report_date||x.uploaded_at)} · ${files.length||1} file</small></div><div class="report-actions"><button class="icon-btn report-open" data-report-id="${x.id}" aria-label="Apri referto">↗</button><button class="btn secondary report-send-doctor" data-report-id="${x.id}" data-report-title="${esc(x.title)}" type="button">Invia al medico</button><button class="icon-btn report-share" data-report-id="${x.id}" data-report-title="${esc(x.title)}" aria-label="Condividi referto">↗︎</button></div></article>`}).join('')||'<div class="empty-state"><div>▤</div><strong>Nessun referto caricato</strong><span>Usa i pulsanti qui sopra per aggiungere il primo documento.</span></div>'}</div></section>`;
 void showReceivedDocuments();
 const camera=document.getElementById('reportCamera'),gallery=document.getElementById('reportGallery'),pdf=document.getElementById('reportPdf'),reportMsg=document.getElementById('reportMsg');
 const pages=[]; let replaceIndex=null; let saving=false;
 const validateFile=(file)=>{const image=['image/jpeg','image/png','image/webp'].includes(file.type),isPdf=file.type==='application/pdf';if(!image&&!isPdf)return 'Formato non supportato. Usa JPG, PNG, WEBP o PDF.';const max=15;if(file.size>max*1024*1024)return `Il file supera il limite di ${max} MB.`;return '';};
 const addFiles=(files)=>{for(const file of files||[]){const err=validateFile(file);if(err){reportMsg.innerHTML=msg(err,'error');continue;}if(replaceIndex===null)pages.push(file);else{pages[replaceIndex]=file;replaceIndex=null;}}reportMsg.innerHTML='';drawPages();};
 const drawPages=()=>{const box=document.getElementById('pagePreview');box.innerHTML=pages.map((f,i)=>{const isPdf=f.type==='application/pdf';return `<div class="captured-page"><div class="page-thumb">${isPdf?'PDF':i+1}</div><div class="page-meta"><strong>${isPdf?'Documento PDF':'Pagina '+(i+1)}</strong><small>${esc(f.name||'referto')} · ${(f.size/1024/1024).toFixed(1)} MB</small></div>${!isPdf?`<button class="text-link replace-page" data-i="${i}" type="button">Rifai</button>`:''}<button class="icon-btn remove-page" data-i="${i}" type="button">×</button></div>`}).join('')||'<div class="small muted center">Nessun file aggiunto.</div>';document.querySelectorAll('.replace-page').forEach(b=>b.onclick=()=>{replaceIndex=Number(b.dataset.i);camera.value='';camera.click();});document.querySelectorAll('.remove-page').forEach(b=>b.onclick=()=>{pages.splice(Number(b.dataset.i),1);drawPages();});};
 document.getElementById('capturePage').onclick=()=>{replaceIndex=null;camera.value='';camera.click();};
 document.getElementById('galleryPage').onclick=()=>{replaceIndex=null;gallery.value='';gallery.click();};
 document.getElementById('pdfPage').onclick=()=>{replaceIndex=null;pdf.value='';pdf.click();};
 camera.onchange=()=>addFiles(camera.files);gallery.onchange=()=>addFiles(gallery.files);pdf.onchange=()=>addFiles(pdf.files);drawPages();
 document.getElementById('uploadReport').onclick=async()=>{
  const title=document.getElementById('reportTitle').value.trim();
  if(!title)return reportMsg.innerHTML=msg('Inserisci un titolo per il referto.','error');
  if(!pages.length)return reportMsg.innerHTML=msg('Aggiungi almeno una foto o un PDF.','error');
  if(saving)return; saving=true; const saveButton=document.getElementById('uploadReport');saveButton.disabled=true;
  reportMsg.innerHTML=msg(`Caricamento di ${pages.length} file…`);
  const base=`${state.session.user.id}/${Date.now()}`; const uploaded=[]; let reportId=null;
  try{
    for(let i=0;i<pages.length;i++){
      const file=pages[i]; let ext=(file.name?.split('.').pop()||file.type.split('/')[1]||'bin').toLowerCase().replace('jpeg','jpg'); const path=`${base}/file_${String(i+1).padStart(2,'0')}.${ext}`;
      const up=await sb.storage.from('medical-reports').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false}); if(up.error)throw up.error; uploaded.push({path,file,page_number:i+1});
    }
    const first=uploaded[0];
    const ins=await sb.from('medical_reports').insert({patient_id:state.session.user.id,title,report_type:document.getElementById('reportType').value,report_date:document.getElementById('reportDate').value||null,storage_path:first.path,mime_type:first.file.type,file_size_bytes:uploaded.reduce((n,x)=>n+x.file.size,0)}).select('id').single();
    if(ins.error)throw ins.error; reportId=ins.data.id;
    const rows=uploaded.map(x=>({report_id:ins.data.id,patient_id:state.session.user.id,page_number:x.page_number,storage_path:x.path,mime_type:x.file.type,file_size_bytes:x.file.size}));
    const fi=await sb.from('medical_report_files').insert(rows); if(fi.error)throw fi.error;
    reportMsg.innerHTML=msg('Referto salvato. Puoi inviarne l’avviso al medico dalla scheda qui sotto.','ok'); setTimeout(()=>patientReports(),700);
  }catch(e){if(reportId)await sb.from('medical_reports').delete().eq('id',reportId);if(uploaded.length)await sb.storage.from('medical-reports').remove(uploaded.map(x=>x.path));reportMsg.innerHTML=msg('Referto non salvato: '+(e.message||'caricamento non riuscito'),'error');}
  finally{saving=false;saveButton.disabled=false}
 };
 document.querySelectorAll('.report-open').forEach(b=>b.onclick=()=>openReportPages(b.dataset.reportId));
 document.querySelectorAll('.report-share').forEach(b=>b.onclick=()=>shareReportSecure(b.dataset.reportId,b.dataset.reportTitle));
 document.querySelectorAll('.report-send-doctor').forEach(b=>b.onclick=async()=>{
  if(b.disabled)return; b.disabled=true;
  try{const doctor=await getAssignedClinician();if(!doctor||doctor.isTest)throw new Error('Collega un medico verificato per condividere il referto nell’app.');
   const {data:report,error:readError}=await sb.from('medical_reports').select('id,title').eq('id',b.dataset.reportId).eq('patient_id',state.session.user.id).single();if(readError||!report)throw new Error('Referto non disponibile.');
   if(!confirm('Inviare al medico collegato un avviso per consultare questo referto nella dashboard protetta?'))return;
   const {error}=await sb.from('chat_messages').insert({sender_id:state.session.user.id,recipient_id:doctor.clinician_id,body:'Ho caricato il referto «'+report.title+'». Puoi aprirlo dalla sezione Referti del mio profilo.'});if(error)throw error;
   alert('Avviso inviato al medico. Il documento resta nello spazio protetto Meditaly.');
  }catch(e){alert(e.message||'Impossibile inviare l’avviso al medico.');}finally{b.disabled=false}
 });
}
async function shareReportSecure(reportId,title){
 const ok=confirm('Stai per condividere un referto sanitario tramite un’app esterna. Il link sarà temporaneo. Continuare?');
 if(!ok)return;
 const {data:files,error}=await sb.from('medical_report_files').select('*').eq('report_id',reportId).order('page_number');
 if(error)return alert(error.message);
 if(!files?.length)return alert('Nessuna pagina disponibile.');
 const links=[];
 for(const f of files){
   const signed=await sb.storage.from('medical-reports').createSignedUrl(f.storage_path,900);
   if(signed.error)return alert(signed.error.message);
   links.push(`Pagina ${f.page_number}: ${signed.data.signedUrl}`);
 }
 const text=`Referto Meditaly: ${title||'Referto'}\n\n${links.join('\n')}\n\nLink temporanei validi per 15 minuti. Condividi solo con persone autorizzate.`;
 if(window.AndroidBridge?.shareText){AndroidBridge.shareText(`Referto Meditaly - ${title||'Referto'}`,text);return;}
 if(navigator.share){try{await navigator.share({title:`Referto Meditaly - ${title||'Referto'}`,text});return;}catch(e){if(e?.name==='AbortError')return;}}
 await navigator.clipboard?.writeText(text); alert('Link temporanei copiati.');
}

async function openReportPages(reportId){
 const {data:files,error}=await sb.from('medical_report_files').select('*').eq('report_id',reportId).order('page_number');
 if(error)return alert(error.message);
 if(!files?.length)return alert('Nessuna pagina disponibile.');
 for(const f of files){const {data,error}=await sb.storage.from('medical-reports').createSignedUrl(f.storage_path,120);if(error)return alert(error.message);window.open(data.signedUrl,'_blank');}
}
async function patientConditions(){
 const {data,error}=await sb.from('patient_chronic_conditions').select('condition_codes,other_details').eq('patient_id',state.session.user.id).maybeSingle();
 if(error)return content.innerHTML=msg('Impossibile caricare le informazioni: '+error.message,'error');
 const codes=data?.condition_codes||[];
 content.innerHTML=`<section class="page-title"><div class="eyebrow dark">IL MIO PERCORSO</div><h1>Condizioni già note</h1><p class="muted">Queste informazioni sono dichiarate da te e visibili al medico associato. Puoi correggerle quando vuoi.</p></section><div class="card"><h2>Le mie condizioni</h2><p class="muted">Seleziona soltanto condizioni già confermate da un professionista. La selezione non equivale a una diagnosi.</p>${conditionsEditor('editConditions',codes)}<button class="btn" id="saveConditions">Salva le mie informazioni</button><div id="conditionsMsg" role="status"></div></div><div class="card section"><h2>Informazioni per capire meglio</h2><p class="muted">Sintesi generale delle fonti istituzionali, non un piano di cura personale. Le indicazioni del tuo medico e il protocollo concordato restano il riferimento per farmaci e controlli.</p>${codes.length?codes.map(code=>{const row=chronicTopics.find(x=>x[0]===code);return row?`<article class="item"><h3>${esc(row[1])}</h3><p>${esc(row[2])}</p><a href="${row[3]}" target="_blank" rel="noopener noreferrer">Apri la fonte: ${esc(row[4])}</a><div><button class="btn secondary guideline-topic" type="button" data-code="${code}">Cerca le linee guida più recenti</button><div id="guideline-${code}" class="medi-answer" aria-live="polite"></div></div></article>`:''}).join(''):'<p>Se vuoi, aggiungi una condizione qui sopra per vedere una spiegazione semplice con la fonte.</p>'}<p class="small muted">Le fonti sono consultate alla data di pubblicazione di questa versione. Prima di prendere decisioni cliniche, verifica con il tuo medico la versione più recente.</p></div>`;
 document.querySelectorAll('.guideline-topic').forEach(button=>button.onclick=async()=>{const row=chronicTopics.find(x=>x[0]===button.dataset.code),box=document.getElementById('guideline-'+button.dataset.code);if(!row||!box)return;button.disabled=true;box.innerHTML=msg('Cerco fonti sanitarie pubblicate…');try{const data=await mediAsk('Spiega in italiano semplice le più recenti linee guida per '+row[1]+'. Distingui raccomandazioni generali, esami da discutere con il curante e aspetti che richiedono una scelta personale. Indica ente, anno e link verificabili. Non suggerire dosi né cambiare terapie.','guidelines');const trusted=(data.sources||[]).filter(x=>{try{return ['iss.it','who.int','salute.gov.it','aifa.gov.it'].some(d=>new URL(x.url).hostname===d||new URL(x.url).hostname.endsWith('.'+d));}catch{return false;}});if(!trusted.length){box.innerHTML=msg('Non ho trovato una fonte istituzionale verificabile per questa sintesi. Apri la fonte indicata sopra o chiedi al medico.');return;}mediRenderAnswer(box,{...data,sources:trusted});}catch(e){box.innerHTML=msg('Ricerca non disponibile: '+(e.message||'riprova più tardi'),'error');}finally{button.disabled=false;}});
 document.getElementById('editConditionsOther').value=data?.other_details||'';bindConditionOther('editConditions');
 document.getElementById('saveConditions').onclick=async()=>{const button=document.getElementById('saveConditions');button.disabled=true;const values=[...document.querySelectorAll('#editConditions input:checked')].map(x=>x.value);const other=values.includes('other')?document.getElementById('editConditionsOther').value.trim():'';const {error:e}=await sb.from('patient_chronic_conditions').upsert({patient_id:state.session.user.id,condition_codes:values,other_details:other||null,updated_at:new Date().toISOString()},{onConflict:'patient_id'});button.disabled=false;if(e)document.getElementById('conditionsMsg').innerHTML=msg('Non salvato: '+e.message,'error');else patientConditions();};
}
async function patientTherapy(){
 const {data,error}=await sb.from('medications').select('*,medication_schedules(*)').eq('active',true).order('created_at',{ascending:false}); if(error)return content.innerHTML=msg(error.message,'error');
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'}),weekday=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'Europe/Rome'}).format(new Date()));
 const due=(data||[]).filter(x=>x.active&&(!x.starts_on||x.starts_on<=today)&&(!x.ends_on||x.ends_on>=today)).flatMap(x=>(x.medication_schedules||[]).filter(s=>s.time_of_day&&(!s.weekdays?.length||s.weekdays.includes(weekday))).map(s=>({med:x,schedule:s})));
 if(pendingTherapySpeechSlot){
  const slot=pendingTherapySpeechSlot;pendingTherapySpeechSlot='';
  const names=[...new Set(due.filter(x=>x.schedule.time_of_day.slice(0,5)===slot).map(x=>x.med.name).filter(Boolean))];
  const phrase=names.length
   ? 'Promemoria terapia. Alle ore '+slot.replace(':',' e ')+' prendi '+names.join(' e ')+'. Verifica la dose nella schermata Terapie.'
   : 'Promemoria terapia delle ore '+slot.replace(':',' e ')+'. Verifica il farmaco nella schermata Terapie.';
  if(window.AndroidBridge?.speak)window.AndroidBridge.speak(phrase);
  else if(window.speechSynthesis){const utterance=new SpeechSynthesisUtterance(phrase);utterance.lang='it-IT';speechSynthesis.speak(utterance);}
 }
 const selectedDoctor=chosenCareDoctor();const visible=(data||[]).filter(x=>!selectedDoctor||x.prescribed_by===selectedDoctor.clinician_id||!x.prescribed_by);const visibleDue=due.filter(x=>!selectedDoctor||x.med.prescribed_by===selectedDoctor.clinician_id||!x.med.prescribed_by);
 const {data:intakes,error:intakeError}=await sb.from('medication_intakes').select('medication_schedule_id,status').eq('patient_id',state.session.user.id).eq('intake_date',today);
 const recorded=new Map((intakes||[]).map(x=>[x.medication_schedule_id,x.status]));
 const taken=visibleDue.filter(x=>recorded.get(x.schedule.id)==='taken').length;
 content.innerHTML=`<section class="page-title"><div class="eyebrow dark">TERAPIE CONDIVISE</div><h1>Le tue terapie</h1><p class="muted">Le indicazioni inserite dal medico sono sincronizzate con il tuo percorso.</p></section><div class="care-page-actions"><button class="btn" id="messageDoctorTherapy">Scrivi al medico</button><button class="btn secondary" id="addTherapy">Proponi o importa</button></div><div class="card"><h2>Assunzioni di oggi · ${taken}/${visibleDue.length}</h2><p class="muted">Conferma soltanto i farmaci effettivamente assunti. Se hai dubbi sulla terapia, contatta il medico.</p>${intakeError?msg('Registro assunzioni non disponibile: '+intakeError.message,'error'):visibleDue.length?`<div class="list">${visibleDue.sort((a,b)=>a.schedule.time_of_day.localeCompare(b.schedule.time_of_day)).map(({med,schedule})=>`<div class="item"><strong>${esc(schedule.time_of_day.slice(0,5))} · ${esc(med.name)} ${esc(med.dose||'')}</strong><div class="muted">${recorded.get(schedule.id)==='taken'?'Assunto':recorded.get(schedule.id)==='skipped'?'Non assunto':recorded.get(schedule.id)==='unknown'?'Non ricordo':'Da confermare'}</div><div class="row"><button class="btn secondary intake-choice" data-schedule="${schedule.id}" data-status="taken">Ho assunto</button><button class="btn secondary intake-choice" data-schedule="${schedule.id}" data-status="skipped">Non assunto</button><button class="btn secondary intake-choice" data-schedule="${schedule.id}" data-status="unknown">Non ricordo</button></div></div>`).join('')}</div>`:'Nessun farmaco previsto oggi.'}</div><div id="intakeReasonBox" class="card section hidden"><h2>Perché non l’hai assunto?</h2><p class="muted">Facoltativo. Una difficoltà o un effetto indesiderato verrà segnalato al medico solo quando è rilevante.</p><select class="input" id="intakeReason"><option value="prefer_not_to_say">Preferisco non indicarlo</option><option value="forgot">L’ho dimenticato</option><option value="unavailable">Non avevo il farmaco</option><option value="side_effect">Ho avuto un effetto indesiderato</option><option value="other">Altro motivo</option></select><div class="row"><button class="btn" id="confirmSkip">Conferma non assunto</button><button class="btn secondary" id="cancelSkip">Annulla</button></div></div><div class="card section"><h2>Piano terapeutico</h2><div class="list">${visible.map(x=>`<div class="item care-shared-item"><div class="shared-source">${x.prescribed_by?'DAL MEDICO':'INSERIMENTO PAZIENTE'}</div><strong>${esc(x.name)} ${esc(x.dose||'')}</strong><div>${esc(x.instructions||'')}</div><div class="muted">${x.starts_on?fmt(x.starts_on):''} ${x.ends_on?'→ '+fmt(x.ends_on):''}</div>${(x.medication_schedules||[]).map(s=>`<span class="pill">${esc(s.time_of_day||'intervallo')} ${s.interval_hours?`ogni ${s.interval_hours}h`:''}</span>`).join(' ')}</div>`).join('')||'<p>Nessuna terapia.</p>'}</div></div>`;
 const saveIntake=async(button,reason=null)=>{button.disabled=true;const status=button.dataset.status,schedule=button.dataset.schedule;if(recorded.get(schedule)===status&&status!=='skipped'){button.disabled=false;return;}const {error:e}=await sb.from('medication_intakes').upsert({patient_id:state.session.user.id,medication_schedule_id:schedule,intake_date:today,status,skip_reason:status==='skipped'?reason:null,confirmed_at:new Date().toISOString()},{onConflict:'medication_schedule_id,intake_date'});if(e){alert('Impossibile salvare la tua risposta: '+e.message);button.disabled=false;}else {mediVoiceNotice('Risposta salvata nel tuo percorso.');patientTherapy();}};
 document.querySelectorAll('.intake-choice').forEach(b=>b.onclick=()=>{if(b.dataset.status==='skipped'){document.getElementById('intakeReasonBox').classList.remove('hidden');document.getElementById('confirmSkip').dataset.schedule=b.dataset.schedule;document.getElementById('confirmSkip').dataset.status='skipped';document.getElementById('intakeReasonBox').scrollIntoView({block:'nearest'});}else saveIntake(b);});
 document.getElementById('confirmSkip').onclick=e=>saveIntake(e.currentTarget,document.getElementById('intakeReason').value);
 document.getElementById('cancelSkip').onclick=()=>document.getElementById('intakeReasonBox').classList.add('hidden');
 document.getElementById('addTherapy').onclick=()=>{state.tab='imports';state.importKind='therapy';patientView();};document.getElementById('messageDoctorTherapy').onclick=()=>{state.tab='chat';patientView();};
}
async function patientFollowups(){
 const {data,error}=await sb.from('followup_milestones').select('*').order('due_date'); if(error)return content.innerHTML=msg(error.message,'error');
 const selectedDoctor=chosenCareDoctor();const visible=(data||[]).filter(x=>!selectedDoctor||x.created_by===selectedDoctor.clinician_id||!x.created_by||x.created_by===state.session.user.id);
 let appointmentsQuery=sb.from('appointments').select('id,reason,proposed_start,status,location_label,booked_slot').eq('patient_id',state.session.user.id);if(selectedDoctor)appointmentsQuery=appointmentsQuery.eq('clinician_id',selectedDoctor.clinician_id);const {data:appointments,error:appointmentsError}=await appointmentsQuery.order('created_at',{ascending:false}).limit(30);
 content.innerHTML=`<section class="page-title"><div class="eyebrow dark">CONTROLLI CONDIVISI</div><h1>Controlli</h1><p class="muted">Programmazione aggiornata dal medico e visibile in tempo reale.</p></section><div class="care-page-actions"><button class="btn" id="messageDoctorControl">Scrivi al medico</button><button class="btn secondary" id="addControl">Proponi o importa</button></div><div class="card" id="patientVisitSlots"></div><div class="card"><h2>Appuntamenti</h2>${appointmentsError?msg(appointmentsError.message,'error'):(appointments||[]).map(x=>`<div class="item"><strong>${esc(x.reason||'Controllo')}</strong><div>${fmt(x.proposed_start)} · ${esc(x.status)}</div><div class="muted">${esc(x.location_label||'')}</div>${x.booked_slot&&x.status==='Confirmed'?`<button class="btn secondary cancel-slot-booking" data-id="${x.id}">Annulla prenotazione</button>`:''}${/proposed|pending/i.test(x.status)?`<button class="btn secondary respond-appointment" data-id="${x.id}" data-accept="true">Conferma</button> <button class="btn secondary respond-appointment" data-id="${x.id}" data-accept="false">Rifiuta</button>`:''}</div>`).join('')||'Nessun appuntamento.'}</div><div class="card section"><h2>Follow-up</h2><div class="list">${visible.map(x=>`<div class="item care-shared-item"><div class="shared-source">${x.created_by?'PROGRAMMATO DAL MEDICO':'PROPOSTA PAZIENTE'}</div><strong>${esc(x.milestone_label)} · ${esc(x.milestone_type.replaceAll('_',' '))}</strong><div>Data: ${fmt(x.due_date)} · ${x.completed?'Completato':'Da effettuare'}</div>${x.notes?`<div class="muted">${esc(x.notes)}</div>`:''}</div>`).join('')||'<p>Nessun controllo.</p>'}</div></div>`;
 MeditalyVisits.patientPanel({root:document.getElementById('patientVisitSlots'),sb,getContext:()=>({userId:state.session?.user.id,clinicianId:chosenCareDoctor()?.clinician_id}),onBooked:async()=>{await patientFollowups();}});
 document.querySelectorAll('.cancel-slot-booking').forEach(b=>b.onclick=async()=>{if(!confirm('Annullare questa prenotazione?'))return;b.disabled=true;const {error}=await sb.rpc('change_visit_booking',{p_appointment:b.dataset.id,p_action:'cancel'});if(error){alert(error.message);b.disabled=false;}else patientFollowups();});
 document.querySelectorAll('.respond-appointment').forEach(b=>b.onclick=async()=>{const {error}=await sb.rpc('respond_appointment',{p_appointment:b.dataset.id,p_accept:b.dataset.accept==='true',p_note:null});if(error)alert(error.message);else patientFollowups();});
 document.getElementById('addControl').onclick=()=>{state.tab='imports';state.importKind='control';patientView();};document.getElementById('messageDoctorControl').onclick=()=>{state.tab='chat';patientView();};
}
async function patientQuestionnaire(){state.tab='assignedQuestionnaires';return patientAssignedQuestionnaires();}

async function patientNotifications(){const {data,error}=await sb.from('notifications').select('*').order('created_at',{ascending:false}); if(error)return content.innerHTML=msg(error.message,'error'); content.innerHTML=`<div class="notice" role="status">${esc(state.pushStatus||"Stato delle notifiche del dispositivo da verificare")}. Le notifiche a app chiusa richiedono Firebase configurato nella build e il permesso Android.</div><div class="card"><h2>Notifiche</h2><div class="list">${(data||[]).map(x=>`<div class="item"><strong>${esc(x.title)}</strong><div>${esc(x.message)}</div><div class="muted">${fmt(x.created_at)}</div>${!x.is_read?`<button class="btn secondary" data-read="${x.id}">Segna letta</button>`:''}</div>`).join('')||'Nessuna notifica'}</div></div>`; document.querySelectorAll('[data-read]').forEach(b=>b.onclick=async()=>{await sb.from('notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('id',b.dataset.read);patientNotifications();});}
async function getAssignedClinician(){
 const [{data:links},{data:contact}]=await Promise.all([
  sb.from('patient_clinicians').select('clinician_id,profiles!patient_clinicians_clinician_id_fkey(full_name)').eq('patient_id',state.session.user.id).eq('active',true).order('assigned_at',{ascending:false}),
  sb.from('patient_care_contacts').select('primary_clinician_id,initial_choice,test_support_admin_id').eq('patient_id',state.session.user.id).maybeSingle()
 ]);
 const chosen=(links||[]).find(x=>x.clinician_id===state.selectedCareDoctor);if(chosen)return chosen;
 if(contact?.initial_choice==='test' && contact.test_support_admin_id)
   return {clinician_id:contact.test_support_admin_id,profiles:{full_name:'Ciro Maiello · Test Medico'},isTest:true};
 const primary=(links||[]).find(x=>x.clinician_id===contact?.primary_clinician_id);
 if(primary)return primary;
 return (links||[]).find(x=>x.clinician_id!==contact?.test_support_admin_id)||null;
}
async function patientChat(){
 const chatShell=document.querySelector('.patient-shell');
 if(chatShell){chatShell.classList.remove('chat-mode');chatShell.style.height='';}
 const uid=state.session.user.id;
 const [{data:links,error:linksError},{data:contact,error:contactError},{data:messages,error:messagesError}]=await Promise.all([
  sb.from('patient_clinicians').select('clinician_id,profiles!patient_clinicians_clinician_id_fkey(full_name)').eq('patient_id',uid).eq('active',true),
  sb.from('patient_care_contacts').select('primary_clinician_id,initial_choice,test_support_admin_id').eq('patient_id',uid).maybeSingle(),
  sb.from('chat_messages').select('id,sender_id,recipient_id,body,sent_at,is_read,audio_path,audio_mime,audio_duration_seconds').or(`sender_id.eq.${uid},recipient_id.eq.${uid}`).order('sent_at',{ascending:false})
 ]);
 if(linksError||contactError||messagesError){content.innerHTML=msg('Impossibile caricare le conversazioni: '+(linksError||contactError||messagesError).message,'error');return;}
 const rows=(messages||[]).filter(m=>m.sender_id===uid||m.recipient_id===uid);
 const peers=new Map();
 for(const link of links||[])peers.set(link.clinician_id,{id:link.clinician_id,name:link.profiles?.full_name||'Medico collegato',canSend:true,isTest:false});
 if(contact?.test_support_admin_id && (contact.initial_choice==='test'||rows.some(m=>m.sender_id===contact.test_support_admin_id||m.recipient_id===contact.test_support_admin_id)))
  peers.set(contact.test_support_admin_id,{id:contact.test_support_admin_id,name:'Ciro Maiello · Test Medico',canSend:contact.initial_choice==='test',isTest:true});
 for(const m of rows){const id=m.sender_id===uid?m.recipient_id:m.sender_id;if(!peers.has(id))peers.set(id,{id,name:'Contatto precedente',canSend:false,isTest:false});}
 const conversations=[...peers.values()].map(peer=>{
  const messages=rows.filter(m=>(m.sender_id===uid&&m.recipient_id===peer.id)||(m.sender_id===peer.id&&m.recipient_id===uid));
  return {...peer,messages,last:messages[0],unread:messages.filter(m=>m.sender_id===peer.id&&!m.is_read).length};
 }).sort((a,b)=>new Date(b.last?.sent_at||0)-new Date(a.last?.sent_at||0));
 const selected=conversations.find(p=>p.id===state.selectedChatPeer);
 if(!selected){
  content.innerHTML=`<section class="page-title"><div class="eyebrow dark">COMUNICAZIONI</div><h1>Messaggi</h1><p class="muted">Le tue conversazioni con i medici collegati e con il contatto di prova, se scelto.</p></section><section class="card patient-conversation-list">${conversations.map(peer=>`<button class="conversation-row" data-chat-peer="${peer.id}"><span class="conversation-avatar">${esc(peer.name.slice(0,1))}</span><span class="conversation-copy"><strong>${esc(peer.name)}</strong><small>${esc(peer.last?.body||'Nessun messaggio ancora')}</small></span><span class="conversation-side">${peer.last?`<time>${new Date(peer.last.sent_at).toLocaleDateString('it-IT',{day:'2-digit',month:'short'})}</time>`:''}${peer.unread?`<b>${peer.unread}</b>`:''}</span></button>`).join('')||'<div class="chat-empty"><strong>Nessuna conversazione</strong><span>Collega un medico dal Menu per iniziare a scrivergli.</span></div>'}</section>`;
  document.querySelectorAll('[data-chat-peer]').forEach(button=>button.onclick=()=>{state.selectedChatPeer=button.dataset.chatPeer;patientChat();});
  return;
 }
 const {data:receivedDocs}=await sb.from('medical_reports').select('id,title,uploaded_at').eq('patient_id',uid).eq('uploaded_by',selected.id).order('uploaded_at');
 const chronological=[...selected.messages,...(receivedDocs||[]).map(d=>({document:d,sent_at:d.uploaded_at,sender_id:selected.id}))].sort((a,b)=>new Date(a.sent_at)-new Date(b.sent_at));let lastDay='';
 const bubbles=chronological.map(m=>{if(m.document)return `<article class="chat-document"><span>▤</span><div><strong>${esc(m.document.title)}</strong><small>Documento dal medico · ${fmt(m.sent_at)}</small></div><button class="btn secondary" data-chat-document="${m.document.id}">Apri</button></article>`;const day=new Date(m.sent_at).toLocaleDateString('it-IT',{day:'numeric',month:'long'}),sep=day!==lastDay?`<div class="chat-day"><span>${esc(day)}</span></div>`:'';lastDay=day;const mine=m.sender_id===uid;return `${sep}<div class="chat-line ${mine?'mine':'theirs'}">${!mine?`<div class="chat-avatar">${esc(selected.name.slice(0,1))}</div>`:''}<div class="chat-bubble"><div class="chat-text">${m.audio_path?MeditalyAudio.html(m):esc(m.body)}</div><div class="chat-meta">${new Date(m.sent_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}${mine?` <span>${m.is_read?'✓✓':'✓'}</span>`:''}</div></div></div>`}).join('');
 content.innerHTML=`<section class="chat-screen ${selected.canSend?'':'chat-history-only'}"><header class="chat-header"><button class="chat-back" id="chatBack" aria-label="Tutte le conversazioni">‹</button><div class="chat-doctor-avatar">${esc(selected.name.slice(0,1))}</div><div><strong>${esc(selected.name)}</strong><small>${selected.isTest?'Contatto di prova · amministratore':selected.canSend?'Conversazione protetta Meditaly':'Conversazione precedente'}</small></div></header><div class="chat-notice">${selected.isTest?'Il contatto di prova non è il tuo medico curante e non invia prescrizioni. ':''}Per urgenze utilizza i canali sanitari appropriati.</div><div id="voiceCallHistory" class="chat-notice" hidden></div><div class="chat-thread" id="chatThread">${bubbles||'<div class="chat-empty-inline">Inizia la conversazione.</div>'}</div>${selected.canSend?'<div class="chat-compose"><button id="chatAttach" class="icon-btn" aria-label="Apri referti e documenti">＋</button><textarea id="chatBody" aria-label="Scrivi un messaggio" rows="1" placeholder="Scrivi un messaggio…"></textarea><button id="chatVoice" class="icon-btn voice-record-button" aria-label="Registra messaggio vocale">🎙</button><button id="chatDictate" class="icon-btn" aria-label="Detta testo del messaggio">Aa</button><button id="send" class="chat-send" aria-label="Invia messaggio">➤</button></div>':'<div class="chat-notice">Questa conversazione è consultabile. Per inviare nuovi messaggi collega il medico dal Menu.</div>'}</section>`;
 document.getElementById('chatBack').onclick=()=>{state.selectedChatPeer=null;patientChat();};
 document.querySelectorAll('[data-chat-document]').forEach(b=>b.onclick=()=>openReportPages(b.dataset.chatDocument));
 MeditalyAudio.mountPlayers(content,sb);
 const callHistory=document.getElementById('voiceCallHistory');MeditalyCalls.history(callHistory,selected.id).then(()=>{if(callHistory?.querySelector('details'))callHistory.hidden=false;}).catch(()=>{});
 fitPatientChat();
 const thread=document.getElementById('chatThread');setTimeout(()=>{if(thread.isConnected&&thread.dataset.keepScroll!=='true')thread.scrollTop=thread.scrollHeight},50);
 if(selected.canSend){
  document.getElementById('chatAttach').onclick=()=>{state.tab='reports';patientView();};
  document.getElementById('chatVoice').onclick=()=>MeditalyAudio.record({sb,recipient:selected.id,getUserId:()=>state.session?.user.id,notify:result=>dispatchChatPush(result.message_id),onSent:async(_,ok)=>{if(state.tab==='chat'&&state.selectedChatPeer===selected.id)await patientChat();if(!ok)alert('Vocale salvato. Notifica non confermata.');}});
  document.getElementById('chatDictate').onclick=()=>mediStartVoiceInput('chatBody');
  const body=document.getElementById('chatBody');body.addEventListener('input',()=>{body.style.height='auto';body.style.height=Math.min(body.scrollHeight,120)+'px'});
  body.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('send')?.click();}});
  document.getElementById('send').onclick=async()=>{const text=body.value.trim();if(!text)return;const button=document.getElementById('send');button.disabled=true;
   const {data:sent,error}=await sb.from('chat_messages').insert({sender_id:uid,recipient_id:selected.id,body:text}).select('id').single();
   if(error){button.disabled=false;body.setCustomValidity('Invio non riuscito: '+error.message);body.reportValidity();body.setCustomValidity('');return;}
   await patientChat();
   const notified=await dispatchChatPush(sent.id);
   if(!notified)alert('Messaggio salvato. La notifica push al destinatario non è stata confermata.');};
 }
 if(selected.unread)await sb.from('chat_messages').update({is_read:true,read_at:new Date().toISOString()}).eq('sender_id',selected.id).eq('recipient_id',uid).eq('is_read',false);
}
async function patientPrivacy(){const {data}=await sb.from('privacy_consents').select('*').order('created_at',{ascending:false}); content.innerHTML=`<section class="page-title"><button class="back-link" id="backHome">${uiIcon('back')} Home</button><div class="eyebrow dark">DOCUMENTI E CONSENSI</div><h1>Privacy</h1><p class="muted">Consulta i documenti in vigore e verifica le registrazioni associate al tuo account.</p></section><section class="doc-grid"><a class="doc-card" target="_blank" href="https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/legal-docs?doc=privacy"><span>${uiIcon('report')}</span><div><strong>Informativa privacy</strong><small>Versione 2.2</small></div></a><a class="doc-card" target="_blank" href="https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/legal-docs?doc=terms"><span>${uiIcon('shield')}</span><div><strong>Termini di utilizzo</strong><small>Versione 2.2</small></div></a><a class="doc-card" target="_blank" href="https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/legal-docs?doc=security"><span>${uiIcon('lock')}</span><div><strong>Sicurezza account</strong><small>Versione 2.2</small></div></a></section><section class="card card-pad"><h2 class="section-title">Registro consensi</h2><div class="list legal-history">${(data||[]).map(x=>`<div class="list-item"><div class="row"><strong>${esc(x.consent_type.replaceAll('_',' '))}</strong><span class="spacer"></span><span class="badge ${x.withdrawn_at?'gray':'success'}">${x.withdrawn_at?'Revocato':'Attivo'}</span></div><div class="small muted">Documento ${esc(x.document_version)} · ${fmt(x.granted_at)}</div></div>`).join('')||'<p class="muted">Nessuna registrazione disponibile.</p>'}</div></section>`; document.getElementById('backHome').onclick=()=>{state.tab='home';patientView();};}
async function clinicianView(){
 const nav=[['dashboard','⌂','Dashboard'],['patients','♙','Pazienti'],['agenda','◷','Agenda'],['messages','✉','Messaggi'],['templates','▤','Modelli']];
 app.innerHTML=`<div class="clinician-shell"><aside class="clinician-side"><div class="brand clinician-brand"><div class="brand-mark meditaly-heart-mark"><img src="brand-heart.png" alt="" aria-hidden="true"></div><div><div class="brand-name">Meditaly</div><div class="tiny">Area Clinica</div></div></div><div class="clinician-user"><div class="avatar large">${esc((state.profile.full_name||'M').slice(0,1))}</div><div><strong>${esc(state.profile.full_name||'Clinico')}</strong><small>Accesso clinico protetto</small></div></div><nav class="clinician-nav">${nav.map(([id,ic,label])=>`<button class="clinician-nav-btn ${state.tab===id?'active':''}" data-tab="${id}"><span>${ic}</span>${label}</button>`).join('')}</nav><div class="side-foot"><button class="clinician-nav-btn" id="auditBtn"><span>✓</span>Audit personale</button><button class="clinician-nav-btn" id="logout"><span>↪</span>Esci</button></div></aside><main class="clinician-main"><header class="clinician-top"><div><div class="eyebrow dark">MEDITALY CLINICAL</div><h1 id="clinicianPageTitle">Area clinica</h1></div><div class="secure-chip">🔐 Sessione autenticata</div></header><div id="content" class="clinician-content"></div><nav class="clinician-bottom-nav">${nav.slice(0,4).map(([id,ic,label])=>`<button class="nav-btn ${state.tab===id?'active':''}" data-tab="${id}"><span class="nav-icon">${ic}</span><span>${label}</span></button>`).join('')}</nav></main></div>`;
 content=document.getElementById('content');
 document.getElementById('logout').onclick=()=>safeSignOut(); document.getElementById('auditBtn').onclick=()=>{state.tab='audit';clinicianView();}; bindNav();
 if(state.tab==='home'||!['dashboard','patients','agenda','messages','templates','audit'].includes(state.tab))state.tab='dashboard';
 if(state.tab==='dashboard')await clinicianDashboard(); if(state.tab==='patients')await clinicianPatients(); if(state.tab==='agenda')await clinicianAgenda(); if(state.tab==='messages')await clinicianMessages(); if(state.tab==='templates')await clinicianTemplates(); if(state.tab==='audit')await myAudit();
}
async function clinicianDashboard(){
 document.getElementById('clinicianPageTitle').textContent='Dashboard clinica';
 const [{data:a},{data:f},{data:q},{data:r},{data:ch},{data:signals},{data:checkins,error:checkinError}]=await Promise.all([
  sb.from('patient_clinicians').select('patient_id,profiles!patient_clinicians_patient_id_fkey(id,full_name)').eq('clinician_id',state.session.user.id).eq('active',true),
  sb.from('followup_milestones').select('id,patient_id,milestone_label,milestone_type,due_date,completed').eq('completed',false).order('due_date').limit(12),
  sb.from('questionnaire_submissions').select('id,patient_id,status,submitted_at,risk_class_result').eq('status','Submitted').order('submitted_at',{ascending:false}).limit(8),
  sb.from('medical_reports').select('id,patient_id,title,report_type,report_date,uploaded_at').order('uploaded_at',{ascending:false}).limit(8),
  sb.from('chat_messages').select('id,sender_id,recipient_id,body,sent_at,is_read').eq('recipient_id',state.session.user.id).eq('is_read',false).order('sent_at',{ascending:false}).limit(8),
  sb.from('care_signals').select('id,patient_id,kind,created_at').eq('status','open').eq('clinician_id',state.session.user.id).order('created_at',{ascending:false}).limit(15),
  sb.from('patient_daily_checkins').select('*').order('checkin_date',{ascending:false}).limit(40)
 ]);
 const pts=(a||[]).map(x=>x.profiles).filter(Boolean); const map=Object.fromEntries(pts.map(p=>[p.id,p.full_name||'Paziente'])); const overdue=(f||[]).filter(x=>new Date(x.due_date)<new Date());
 const checkinReasons=x=>Array.isArray(x.reasons)?x.reasons:Array.isArray(x.reason_codes)?x.reason_codes:[];
 const recentCheckins=(checkins||[]).filter(x=>map[x.patient_id]&&(x.note?.trim()||checkinReasons(x).length)).slice(0,10);
 const checkinStatus={green:'Bene',yellow:'Così così',red:'Non sto bene'};
 const checkinDetails=x=>`${checkinReasons(x).length?`<span class="care-checkin-reasons">${esc(checkinReasons(x).join(', '))}</span>`:''}${x.note?.trim()?`<p class="care-checkin-note">${esc(x.note)}</p>`:''}`;
 content.innerHTML=`<section class="clinician-hero"><div><div class="eyebrow">PANORAMICA</div><h2>Buon lavoro, ${esc((state.profile.full_name||'').split(' ')[0]||'Dottore')}</h2><p>Hai ${pts.length} pazienti assegnati e ${overdue.length} controlli scaduti da verificare.</p></div><button class="btn hero-primary" id="openPatients">Apri pazienti</button></section><section class="card care-signal-list"><div class="row between"><div><div class="eyebrow dark">DA VALUTARE</div><h2>Situazioni rilevanti · ${(signals||[]).length}</h2></div></div><p class="muted">Solo segnalazioni dichiarate: malessere, possibili effetti indesiderati o più dosi non assunte. La mancata risposta non è una dose saltata.</p>${(signals||[]).map(x=>`<div class="item row between"><button class="text-link" data-patient="${x.patient_id}">${esc(map[x.patient_id]||'Paziente')} · ${esc(({red_checkin:'Non sto bene',side_effect:'Effetto indesiderato riferito',repeated_skips:'Più dosi non assunte'})[x.kind]||'Da valutare')}</button><button class="btn secondary review-care-signal" data-signal="${x.id}">Segna visto</button></div>`).join('')||'<p>Nessuna situazione da valutare.</p>'}</section><section class="card clinical-card care-checkin-dashboard"><div class="section-head"><div><div class="eyebrow dark">DAL PAZIENTE</div><h2 class="section-title">Raccontalo al medico</h2></div><button class="text-link" id="refreshClinicianCheckins" type="button">Aggiorna</button></div><p class="muted">Motivi e note inviati con il check-in quotidiano.</p>${checkinError?msg('Check-in non disponibili: '+checkinError.message,'error'):recentCheckins.map(x=>`<article class="care-checkin-entry"><button class="text-link" data-patient="${x.patient_id}">${esc(map[x.patient_id])} · ${esc(checkinStatus[x.status]||x.status||'Aggiornamento')}</button><small>${fmt(x.checkin_date)}</small>${checkinDetails(x)}</article>`).join('')||'<p class="muted">Nessun motivo o messaggio recente.</p>'}</section><section class="clinical-kpis"><div class="clinical-kpi"><span>Pazienti</span><b>${pts.length}</b><small>assegnati</small></div><div class="clinical-kpi warn"><span>Controlli</span><b>${(f||[]).length}</b><small>${overdue.length} scaduti</small></div><div class="clinical-kpi"><span>Questionari</span><b>${(q||[]).length}</b><small>da rivedere</small></div><div class="clinical-kpi"><span>Messaggi</span><b>${(ch||[]).length}</b><small>non letti</small></div></section><section class="clinical-grid"><div class="card clinical-card"><div class="section-head"><div><div class="eyebrow dark">PRIORITÀ</div><h2 class="section-title">Prossimi controlli</h2></div><button class="text-link" id="openAgenda">Vedi agenda</button></div>${(f||[]).slice(0,6).map(x=>`<button class="clinical-row" data-patient="${x.patient_id}"><div class="date-tile"><b>${new Date(x.due_date).getDate()}</b><span>${new Date(x.due_date).toLocaleDateString('it-IT',{month:'short'})}</span></div><div><strong>${esc(map[x.patient_id]||'Paziente')}</strong><small>${esc(x.milestone_type.replaceAll('_',' '))} · ${esc(x.milestone_label)}</small></div><span class="spacer"></span><b>›</b></button>`).join('')||'<div class="empty-state"><strong>Nessun controllo aperto</strong></div>'}</div><div class="card clinical-card"><div class="section-head"><div><div class="eyebrow dark">NOVITÀ</div><h2 class="section-title">Attività recente</h2></div></div>${(r||[]).slice(0,4).map(x=>`<button class="clinical-row" data-patient="${x.patient_id}"><div class="activity-icon">▤</div><div><strong>${esc(map[x.patient_id]||'Paziente')}</strong><small>Nuovo referto: ${esc(x.title)}</small></div><span class="spacer"></span><b>›</b></button>`).join('')}${(q||[]).slice(0,3).map(x=>`<button class="clinical-row" data-patient="${x.patient_id}"><div class="activity-icon">✓</div><div><strong>${esc(map[x.patient_id]||'Paziente')}</strong><small>Questionario da rivedere</small></div><span class="spacer"></span><b>›</b></button>`).join('')||''}</div></section>`;
 document.querySelectorAll('.review-care-signal').forEach(b=>b.onclick=async()=>{b.disabled=true;const {data,error}=await sb.rpc('review_care_signal',{p_signal_id:b.dataset.signal});if(error||!data){mediVoiceNotice('Presa visione non registrata.');b.disabled=false;}else clinicianDashboard();});
 document.getElementById('refreshClinicianCheckins').onclick=()=>clinicianDashboard(); document.getElementById('openPatients').onclick=()=>{state.tab='patients';clinicianView();}; document.getElementById('openAgenda').onclick=()=>{state.tab='agenda';clinicianView();}; document.querySelectorAll('[data-patient]').forEach(b=>b.onclick=()=>{state.selectedPatient=b.dataset.patient;state.tab='patients';clinicianView();});
}
async function clinicianPatients(){
 document.getElementById('clinicianPageTitle').textContent='Pazienti';
 const {data,error}=await sb.from('patient_clinicians').select('patient_id,profiles!patient_clinicians_patient_id_fkey(id,full_name,date_of_birth)').eq('active',true); if(error)return content.innerHTML=msg(error.message,'error'); const pts=(data||[]).map(x=>x.profiles).filter(Boolean);
 content.innerHTML=`<div class="clinician-workspace"><aside class="patient-list-panel card"><div class="section-head"><div><div class="eyebrow dark">ASSISTITI</div><h2 class="section-title">${pts.length} pazienti</h2></div></div><input class="input" id="patientSearch" placeholder="Cerca paziente"><div class="patient-list" id="patientList">${pts.map(p=>`<button class="patient-row ${state.selectedPatient===p.id?'active':''}" data-patient="${p.id}"><span class="avatar">${esc((p.full_name||'P').slice(0,1))}</span><span><strong>${esc(p.full_name||p.id)}</strong><small>${p.date_of_birth?fmt(p.date_of_birth):'Data nascita non indicata'}</small></span></button>`).join('')||'<div class="empty-state"><strong>Nessun paziente assegnato</strong></div>'}</div></aside><section id="patientPanel" class="patient-detail-panel"><div class="card empty-patient"><div class="activity-icon big">♙</div><h2>Seleziona un paziente</h2><p class="muted">Visualizza terapia, referti, follow-up, questionari e comunicazioni.</p></div></section></div>`;
 const bindRows=()=>document.querySelectorAll('[data-patient]').forEach(b=>b.onclick=()=>clinicianPatientPanel(b.dataset.patient)); bindRows();
 document.getElementById('patientSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.patient-row').forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'':'none');};
 if(state.selectedPatient && pts.some(p=>p.id===state.selectedPatient))await clinicianPatientPanel(state.selectedPatient);
}
async function clinicianAgenda(){
 document.getElementById('clinicianPageTitle').textContent='Agenda clinica';
 const {data,error}=await sb.from('followup_milestones').select('*,profiles!followup_milestones_patient_id_fkey(full_name)').eq('completed',false).order('due_date'); if(error)return content.innerHTML=msg(error.message,'error');
 content.innerHTML=`<div class="card clinical-card"><div class="section-head"><div><div class="eyebrow dark">AGENDA</div><h2 class="section-title">Controlli programmati</h2></div><span class="badge gray">${(data||[]).length}</span></div><div class="agenda-list">${(data||[]).map(x=>`<button class="clinical-row" data-patient="${x.patient_id}"><div class="date-tile"><b>${new Date(x.due_date).getDate()}</b><span>${new Date(x.due_date).toLocaleDateString('it-IT',{month:'short'})}</span></div><div><strong>${esc(x.profiles?.full_name||'Paziente')}</strong><small>${esc(x.milestone_type.replaceAll('_',' '))} · ${esc(x.milestone_label)}</small></div><span class="spacer"></span><span class="badge ${new Date(x.due_date)<new Date()?'danger':'gray'}">${new Date(x.due_date)<new Date()?'Scaduto':'Programmato'}</span></button>`).join('')||'<div class="empty-state"><strong>Nessun controllo programmato</strong></div>'}</div></div>`;document.querySelectorAll('[data-patient]').forEach(b=>b.onclick=()=>{state.selectedPatient=b.dataset.patient;state.tab='patients';clinicianView();});
}
async function clinicianMessages(){
 document.getElementById('clinicianPageTitle').textContent='Messaggi';
 const [{data:a,error:linksError},{data:recent,error:messagesError}]=await Promise.all([
  sb.from('patient_clinicians').select('patient_id,profiles!patient_clinicians_patient_id_fkey(id,full_name)').eq('active',true),
  sb.from('chat_messages').select('*').or(`sender_id.eq.${state.session.user.id},recipient_id.eq.${state.session.user.id}`).order('sent_at',{ascending:false})
 ]);
 if(linksError||messagesError){content.innerHTML=msg('Impossibile caricare le conversazioni: '+(linksError||messagesError).message,'error');return;}
 const pts=(a||[]).map(x=>x.profiles).filter(Boolean); const rec=recent||[];
 const preview=p=>{const x=rec.find(m=>(m.sender_id===p.id&&m.recipient_id===state.session.user.id)||(m.sender_id===state.session.user.id&&m.recipient_id===p.id));return x};
 content.innerHTML=`<div class="messages-workspace"><section class="conversation-list card"><div class="section-head"><div><div class="eyebrow dark">COMUNICAZIONI</div><h2 class="section-title">Conversazioni</h2></div></div><div class="conversation-search"><input id="conversationSearch" class="input" placeholder="Cerca paziente"></div><div id="conversationRows">${pts.map(p=>{const x=preview(p),unread=rec.filter(m=>m.sender_id===p.id&&m.recipient_id===state.session.user.id&&!m.is_read).length;return `<button class="conversation-row" data-message-patient="${p.id}"><span class="conversation-avatar">${esc((p.full_name||'P').slice(0,1))}</span><span class="conversation-copy"><strong>${esc(p.full_name||'Paziente')}</strong><small>${esc(x?.body||'Nessun messaggio ancora')}</small></span><span class="conversation-side"><time>${x?new Date(x.sent_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}):''}</time>${unread?`<b>${unread}</b>`:''}</span></button>`}).join('')||'<div class="empty-state"><strong>Nessun paziente assegnato</strong></div>'}</div></section><section id="messagePanel" class="message-thread-panel"><div class="card empty-patient"><div class="activity-icon big">💬</div><h2>Seleziona una conversazione</h2><p class="muted">Invia messaggi protetti ai pazienti assegnati.</p></div></section></div>`;
 const bind=()=>document.querySelectorAll('[data-message-patient]').forEach(b=>b.onclick=()=>clinicianMessageThread(b.dataset.messagePatient,pts.find(p=>p.id===b.dataset.messagePatient)?.full_name)); bind();
 const search=document.getElementById('conversationSearch'); search.oninput=()=>{const q=search.value.toLowerCase();document.querySelectorAll('.conversation-row').forEach(r=>r.classList.toggle('hidden',!r.innerText.toLowerCase().includes(q)));};
 const selected=pts.find(p=>p.id===state.selectedClinicianChat);
 if(selected)await clinicianMessageThread(selected.id,selected.full_name||'Paziente');
}
async function clinicianMessageThread(pid,name){
 state.selectedClinicianChat=pid;
 const {data,error}=await sb.from('chat_messages').select('*').or(`and(sender_id.eq.${state.session.user.id},recipient_id.eq.${pid}),and(sender_id.eq.${pid},recipient_id.eq.${state.session.user.id})`).order('sent_at');
 if(error)return alert(error.message);
 const rows=data||[]; let lastDay=''; const dayLabel=d=>{const dt=new Date(d),today=new Date(),y=new Date(Date.now()-86400000);if(dt.toDateString()===today.toDateString())return'Oggi';if(dt.toDateString()===y.toDateString())return'Ieri';return dt.toLocaleDateString('it-IT',{day:'numeric',month:'long'});};
 const html=rows.map(x=>{const d=dayLabel(x.sent_at);const sep=d!==lastDay?`<div class="chat-day"><span>${esc(d)}</span></div>`:'';lastDay=d;const mine=x.sender_id===state.session.user.id;return `${sep}<div class="chat-line ${mine?'mine':'theirs'}">${!mine?`<div class="chat-avatar">${esc((name||'P').slice(0,1))}</div>`:''}<div class="chat-bubble"><div class="chat-text">${x.audio_path?MeditalyAudio.html(x):esc(x.body)}</div><div class="chat-meta">${new Date(x.sent_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}${mine?` <span>${x.is_read?'✓✓':'✓'}</span>`:''}</div></div></div>`}).join('');
 messagePanel.innerHTML=`<div class="card premium-thread"><header class="thread-head"><div class="conversation-avatar">${esc((name||'P').slice(0,1))}</div><div><strong>${esc(name||'Paziente')}</strong><small>Canale protetto · contenuto visibile solo agli utenti autorizzati</small></div></header><div class="chat-thread clinician-thread" id="clinicianThread">${html||'<div class="chat-empty-inline">Nessun messaggio. Scrivi il primo messaggio.</div>'}</div><div class="chat-compose"><textarea id="clinicianChatBody" rows="1" placeholder="Scrivi un messaggio al paziente…"></textarea><button class="icon-btn" id="clinicianVoice" aria-label="Registra messaggio vocale">🎙</button><button class="chat-send" id="clinicianSend" aria-label="Invia messaggio">➤</button></div></div>`;
 MeditalyAudio.mountPlayers(messagePanel,sb);document.getElementById('clinicianVoice').onclick=()=>MeditalyAudio.record({sb,recipient:pid,getUserId:()=>state.session?.user.id,notify:result=>result.outbox_id?dispatchPush(result.outbox_id):dispatchChatPush(result.message_id),onSent:async()=>{if(state.selectedClinicianChat===pid)await clinicianMessageThread(pid,name);}});
 const th=document.getElementById('clinicianThread');setTimeout(()=>th.scrollTop=th.scrollHeight,50);const ta=document.getElementById('clinicianChatBody');ta.oninput=()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,120)+'px'};
 clinicianSend.onclick=async()=>{const body=clinicianChatBody.value.trim();if(!body)return;clinicianSend.disabled=true;const {data:outboxId,error}=await sb.rpc('clinician_send_message_push',{p_patient:pid,p_body:body});if(error){alert(error.message);clinicianSend.disabled=false;}else{await clinicianMessages();const pushRequested=await dispatchPush(outboxId);if(!pushRequested)alert('Messaggio salvato, ma la richiesta di notifica push non è stata confermata.');}};
 await sb.from('chat_messages').update({is_read:true,read_at:new Date().toISOString()}).eq('sender_id',pid).eq('recipient_id',state.session.user.id).eq('is_read',false);
}
async function clinicianPatientPanel(pid){state.selectedPatient=pid; const [{data:p},{data:q},{data:m},{data:f},{data:n},{data:c},{data:r},{data:checkins,error:checkinError}]=await Promise.all([sb.from('profiles').select('*').eq('id',pid).single(),sb.from('questionnaire_submissions').select('*').eq('patient_id',pid).order('created_at',{ascending:false}).limit(1),sb.from('medications').select('*,medication_schedules(*)').eq('patient_id',pid).order('created_at',{ascending:false}),sb.from('followup_milestones').select('*').eq('patient_id',pid).order('due_date'),sb.from('notifications').select('*').eq('patient_id',pid).order('created_at',{ascending:false}).limit(10),sb.from('privacy_consents').select('*').eq('patient_id',pid).order('created_at',{ascending:false}),sb.from('medical_reports').select('*,medical_report_files(*)').eq('patient_id',pid).order('report_date',{ascending:false}),sb.from('patient_daily_checkins').select('*').eq('patient_id',pid).order('checkin_date',{ascending:false}).limit(10)]); const last=q?.[0]; const checkinReasons=x=>Array.isArray(x.reasons)?x.reasons:Array.isArray(x.reason_codes)?x.reason_codes:[]; const panel=document.getElementById('patientPanel'); panel.innerHTML=`<div class="card"><h2>${esc(p.full_name)}</h2><div class="row"><span class="pill">Consensi: ${c?.filter(x=>!x.withdrawn_at).length||0}</span><span class="pill">Terapie: ${m?.filter(x=>x.active).length||0}</span><span class="pill">Controlli: ${f?.length||0}</span></div></div><div class="card"><h3>Ultimo questionario</h3>${last?`<p>PCI: ${fmt(last.pci_date)} · FE: ${esc(last.ejection_fraction??'—')} · Stato: ${esc(last.status)}</p><div class="row"><select id="risk">${['Basso','Moderato','Moderato-alto','Alto','Molto alto'].map(r=>`<option ${last.risk_class_result===r?'selected':''}>${r}</option>`).join('')}</select><button class="btn" id="review">Conferma rischio</button><button class="btn secondary" id="gen">Genera follow-up</button></div><div id="qact"></div>`:'<p>Nessun questionario.</p>'}</div><div class="card"><h3>Raccontalo al medico</h3><p class="muted">Motivi e note dei check-in del paziente.</p>${checkinError?msg(checkinError.message,'error'):(checkins||[]).filter(x=>x.note?.trim()||checkinReasons(x).length).map(x=>`<article class="care-checkin-entry"><strong>${esc(({green:'Bene',yellow:'Così così',red:'Non sto bene'})[x.status]||x.status||'Aggiornamento')}</strong><small>${fmt(x.checkin_date)}</small>${checkinReasons(x).length?`<span class="care-checkin-reasons">${esc(checkinReasons(x).join(', '))}</span>`:''}${x.note?.trim()?`<p class="care-checkin-note">${esc(x.note)}</p>`:''}</article>`).join('')||'<p>Non sono stati inviati motivi o note.</p>'}</div><div class="card"><h3>Nuova terapia</h3><div class="grid"><input id="medName" placeholder="Farmaco"><input id="medDose" placeholder="Dose"><input id="medTime" type="time"></div><textarea id="medInstr" placeholder="Istruzioni"></textarea><button class="btn" id="addMed">Aggiungi</button></div><div class="card"><h3>Terapie</h3>${(m||[]).map(x=>`<div class="item"><strong>${esc(x.name)} ${esc(x.dose)}</strong> · ${x.active?'attiva':'chiusa'}<div>${esc(x.instructions||'')}</div>${x.active?`<button type="button" class="btn secondary small clinician-remove-med" data-medication="${x.id}">Rimuovi farmaco</button>`:''}</div>`).join('')||'Nessuna'}</div><div class="card"><h3>Follow-up</h3>${(f||[]).map(x=>`<div class="item"><strong>${esc(x.milestone_label)} · ${esc(x.milestone_type.replaceAll('_',' '))}</strong> · ${fmt(x.due_date)} · ${x.completed?'completato':'aperto'}<div class="row"><button class="btn secondary" data-complete="${x.id}">Segna completato</button>${!x.completed?`<button type="button" class="btn secondary small clinician-remove-followup" data-followup="${x.id}">Rimuovi controllo</button>`:''}</div></div>`).join('')||'Nessuno'}</div><div class="card"><h3>Referti del paziente</h3>${(r||[]).map(x=>`<div class="item row"><div><strong>${esc(x.title)}</strong><div class="muted">${esc(x.report_type||'Referto')} · ${fmt(x.report_date||x.uploaded_at)} · ${(x.medical_report_files||[]).length||1} pag.</div></div><span class="spacer"></span><button class="btn secondary small clinician-report-open" data-report-id="${x.id}">Apri</button></div>`).join('')||'Nessun referto'}</div><div class="card"><h3>Notifica rapida</h3><input id="nTitle" placeholder="Titolo"><textarea id="nBody" placeholder="Messaggio"></textarea><button class="btn" id="sendN">Invia</button></div><div class="card"><h3>Ultime notifiche</h3>${(n||[]).map(x=>`<div class="item"><strong>${esc(x.title)}</strong><div>${esc(x.message)}</div></div>`).join('')||'Nessuna'}</div>`;
 await clinicianSharedJournal(pid,panel);
 if(last){review.onclick=async()=>{const {error}=await sb.from('questionnaire_submissions').update({risk_class_result:risk.value,status:'Reviewed',reviewed_at:new Date().toISOString(),reviewed_by:state.session.user.id}).eq('id',last.id); qact.innerHTML=error?msg(error.message,'error'):msg('Rischio confermato dal clinico.','ok');}; gen.onclick=async()=>{const {data,error}=await sb.rpc('generate_followup_schedule',{p_submission:last.id}); qact.innerHTML=error?msg(error.message,'error'):msg(`Piano generato: ${data} milestone totali.`, 'ok'); if(!error)setTimeout(()=>clinicianPatientPanel(pid),500);};}
 document.getElementById('addMed').onclick=async()=>{const {data,error}=await sb.from('medications').insert({patient_id:pid,prescribed_by:state.session.user.id,name:medName.value.trim(),dose:medDose.value.trim(),instructions:medInstr.value.trim()}).select().single(); if(error)return alert(error.message); if(medTime.value){const s=await sb.from('medication_schedules').insert({medication_id:data.id,time_of_day:medTime.value}); if(s.error)return alert(s.error.message)} clinicianPatientPanel(pid);};
 const removeCareItem=async(button,kind,item,label)=>{
  if(!confirm(`Rimuovere ${label} dal piano di questo paziente? Il paziente riceverà una notifica.`))return;
  button.disabled=true;
  const {data:outboxId,error}=await sb.rpc('clinician_remove_care_item',{p_patient:pid,p_kind:kind,p_item:item});
  if(error){button.disabled=false;alert('Rimozione non riuscita: '+error.message);return;}
  await clinicianPatientPanel(pid);
  if(!(await dispatchPush(outboxId)))alert('Piano aggiornato e notifica salvata nell’app. La consegna della notifica push non è stata confermata.');
 };
 document.querySelectorAll('.clinician-remove-med').forEach(button=>button.onclick=()=>{const med=(m||[]).find(x=>x.id===button.dataset.medication);if(med)void removeCareItem(button,'medication',med.id,`il farmaco «${med.name}»`);});
 document.querySelectorAll('.clinician-remove-followup').forEach(button=>button.onclick=()=>{const followup=(f||[]).find(x=>x.id===button.dataset.followup);if(followup)void removeCareItem(button,'followup',followup.id,`il controllo «${followup.milestone_label}»`);});
 document.querySelectorAll('[data-complete]').forEach(b=>b.onclick=async()=>{const {error}=await sb.from('followup_milestones').update({completed:true,completed_at:new Date().toISOString()}).eq('id',b.dataset.complete); if(error)alert(error.message);else clinicianPatientPanel(pid);});
 document.querySelectorAll('.clinician-report-open').forEach(b=>b.onclick=()=>openReportPages(b.dataset.reportId));
 document.getElementById('sendN').onclick=async()=>{
  const button=document.getElementById('sendN');if(button.disabled)return;
  const title=nTitle.value.trim()||'Meditaly',body=nBody.value.trim();
  if(!body)return alert('Scrivi il testo della notifica.');
  button.disabled=true;
  const {data:outboxId,error}=await sb.rpc('clinician_send_custom_notification_push',{
   p_patient:pid,p_title:title,p_message:body
  });
  if(error){button.disabled=false;alert('Notifica non salvata: '+error.message);return;}
  await clinicianPatientPanel(pid);
  if(!(await dispatchPush(outboxId)))alert('Notifica salvata nell’app. La consegna push non è stata confermata.');
 };}
async function clinicianTemplates(){const {data}=await sb.from('notification_templates').select('*').order('created_at',{ascending:false}); content.innerHTML=`<div class="card"><h2>Modelli di notifica</h2><div class="grid"><input id="tt" placeholder="Titolo"><select id="tn"><option>Custom Message</option><option>Appointment Alert</option><option>Medication Reminder</option><option>Guideline Update</option></select><input id="td" type="number" placeholder="Offset giorni"></div><textarea id="tm" placeholder="Messaggio"></textarea><button class="btn" id="saveT">Salva</button></div><div class="card">${(data||[]).map(x=>`<div class="item"><strong>${esc(x.title)}</strong><div>${esc(x.message)}</div></div>`).join('')||'Nessun modello'}</div>`; document.getElementById('saveT').onclick=async()=>{const {error}=await sb.from('notification_templates').insert({title:tt.value.trim(),message:tm.value.trim(),notification_type:tn.value,due_offset_days:td.value?Number(td.value):null,created_by:state.session.user.id}); if(error)alert(error.message);else clinicianTemplates();};}
async function myAudit(){const {data,error}=await sb.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(100); content.innerHTML=`<div class="card"><h2>Audit personale</h2>${error?msg(error.message,'error'):(data||[]).map(x=>`<div class="item">${fmt(x.created_at)} · ${esc(x.action)} · ${esc(x.entity_table||'')}</div>`).join('')}</div>`;}
async function adminTestMessages(){
 const uid=state.session.user.id;
 const {data:contacts,error:contactsError}=await sb.from('patient_care_contacts')
  .select('patient_id,choice_completed_at').eq('test_support_admin_id',uid).eq('initial_choice','test').not('choice_completed_at','is',null);
 if(contactsError){content.innerHTML=msg('Impossibile caricare i contatti di prova: '+contactsError.message,'error');return;}
 const ids=(contacts||[]).map(c=>c.patient_id);
 if(!ids.length){content.innerHTML='<div class="card"><h2>Test Medico · Messaggi</h2><p class="muted">Nessun paziente ha scelto il contatto di prova.</p></div>';return;}
 const [{data:profiles,error:profilesError},{data:messages,error:messagesError}]=await Promise.all([
  sb.from('profiles').select('id,full_name').in('id',ids),
  sb.from('chat_messages').select('id,sender_id,recipient_id,body,sent_at,is_read,audio_path,audio_mime,audio_duration_seconds')
   .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`).order('sent_at',{ascending:false})
 ]);
 if(profilesError||messagesError){content.innerHTML=msg('Impossibile caricare i messaggi di prova: '+(profilesError||messagesError).message,'error');return;}
 const names=new Map((profiles||[]).map(p=>[p.id,p.full_name||'Paziente']));
 const rows=(messages||[]).filter(m=>ids.some(id=>(m.sender_id===id&&m.recipient_id===uid)||(m.sender_id===uid&&m.recipient_id===id)));
 content.innerHTML=`<section class="page-title"><div class="eyebrow dark">CONTATTO DI PROVA</div><h1>Test Medico · Messaggi</h1><p class="muted">Conversazioni con i pazienti che hanno scelto espressamente il contatto test. Questa area non consente prescrizioni.</p></section><div class="messages-workspace"><section class="conversation-list card"><h2 class="section-title">Conversazioni</h2><div id="adminTestRows">${ids.map(id=>{const last=rows.find(m=>m.sender_id===id||m.recipient_id===id);return `<button class="conversation-row" data-test-patient="${id}"><span class="conversation-avatar">${esc((names.get(id)||'P').slice(0,1))}</span><span class="conversation-copy"><strong>${esc(names.get(id)||'Paziente')}</strong><small>${esc(last?.body||'Nessun messaggio ancora')}</small></span></button>`}).join('')}</div></section><section id="adminTestPanel" class="message-thread-panel"><div class="card empty-patient"><h2>Seleziona una conversazione</h2></div></section></div>`;
 document.querySelectorAll('[data-test-patient]').forEach(button=>button.onclick=()=>{state.selectedTestPatient=button.dataset.testPatient;adminTestThread(button.dataset.testPatient,names.get(button.dataset.testPatient)||'Paziente');});
 if(ids.includes(state.selectedTestPatient))await adminTestThread(state.selectedTestPatient,names.get(state.selectedTestPatient)||'Paziente');
}
async function adminTestThread(pid,name){
 const uid=state.session.user.id;
 const {data,error}=await sb.from('chat_messages').select('id,sender_id,recipient_id,body,sent_at,is_read,audio_path,audio_mime,audio_duration_seconds')
  .or(`and(sender_id.eq.${uid},recipient_id.eq.${pid}),and(sender_id.eq.${pid},recipient_id.eq.${uid})`).order('sent_at');
 const panel=document.getElementById('adminTestPanel');if(!panel)return;
 if(error){panel.innerHTML=msg('Impossibile aprire la conversazione: '+error.message,'error');return;}
 panel.innerHTML=`<div class="card premium-thread"><header class="thread-head"><div class="conversation-avatar">${esc(name.slice(0,1))}</div><div><strong>${esc(name)}</strong><small>Contatto di prova · nessuna prescrizione</small></div></header><div class="chat-thread clinician-thread" id="adminTestThread">${(data||[]).map(m=>`<div class="chat-line ${m.sender_id===uid?'mine':'theirs'}"><div class="chat-bubble"><div class="chat-text">${m.audio_path?MeditalyAudio.html(m):esc(m.body)}</div><div class="chat-meta">${new Date(m.sent_at).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})}</div></div></div>`).join('')||'<div class="chat-empty-inline">Nessun messaggio.</div>'}</div><div class="chat-compose"><textarea id="adminTestBody" rows="1" placeholder="Rispondi al paziente…"></textarea><button class="chat-send" id="adminTestSend" aria-label="Invia risposta">➤</button></div><div id="adminTestStatus" role="status" aria-live="polite"></div></div>`;
 const thread=document.getElementById('adminTestThread');thread.scrollTop=thread.scrollHeight;
 document.getElementById('adminTestSend').onclick=async()=>{
  const button=document.getElementById('adminTestSend'),body=document.getElementById('adminTestBody').value.trim();if(!body)return;
  button.disabled=true;
  const {data:sent,error:sendError}=await sb.from('chat_messages').insert({sender_id:uid,recipient_id:pid,body}).select('id').single();
  if(sendError){document.getElementById('adminTestStatus').innerHTML=msg('Invio non riuscito: '+sendError.message,'error');button.disabled=false;return;}
  const notified=await dispatchChatPush(sent.id);
  await adminTestMessages();
  if(!notified)alert('Messaggio salvato. La notifica push al paziente non è stata confermata.');
 };
}
async function adminView(){state.adminArea=true;const h=await header(); app.innerHTML=shell(`${h}<div class="admin-context-banner"><div><strong>Area amministratore</strong><span>Gestione utenti e assegnazioni. La tua area personale paziente resta separata.</span></div><button class="btn secondary" id="backPatientArea">La mia area paziente</button></div><div class="nav">${navButton('users','Utenti')}${navButton('assign','Assegnazioni')}${navButton('test_messages','Test Medico · Messaggi')}${navButton('audit','Audit')}</div><div id="content"></div>`); content=document.getElementById('content'); document.getElementById('logout').onclick=()=>safeSignOut();const sw=document.getElementById('adminSwitch');if(sw)sw.onclick=()=>{state.adminArea=false;state.tab='home';render();};document.getElementById('backPatientArea').onclick=()=>{state.adminArea=false;state.tab='home';render();};bindNav();if(state.tab==='home'||!['users','assign','test_messages','audit'].includes(state.tab))state.tab='users';if(state.tab==='users')await adminUsers();if(state.tab==='assign')await adminAssignments();if(state.tab==='test_messages')await adminTestMessages();if(state.tab==='audit')await adminAudit();}
async function adminUsers(){const {data,error}=await sb.from('profiles').select('*').order('created_at',{ascending:false}); content.innerHTML=`<div class="card"><h2>Utenti</h2>${error?msg(error.message,'error'):(data||[]).map(x=>`<div class="item"><strong>${esc(x.full_name||x.id)}</strong> · ${esc(x.role)} · ${x.account_active?'attivo':'bloccato'}</div>`).join('')}</div><div class="notice">La creazione di account clinico/admin va fatta tramite un flusso server-side privilegiato; non viene esposta nel browser.</div>`;}
async function adminAssignments(){const [{data:pts},{data:cls},{data:as}]=await Promise.all([sb.from('profiles').select('id,full_name,role').in('role',['Patient','Administrator']),sb.from('profiles').select('id,full_name,role').eq('role','Clinician'),sb.from('patient_clinicians').select('*')]); content.innerHTML=`<div class="card"><h2>Assegna paziente a clinico</h2><div class="grid"><select id="ap">${(pts||[]).map(x=>`<option value="${x.id}">${esc(x.full_name||x.id)}</option>`).join('')}</select><select id="ac">${(cls||[]).map(x=>`<option value="${x.id}">${esc(x.full_name||x.id)}</option>`).join('')}</select></div><button class="btn" id="assignBtn">Assegna</button><div id="amsg"></div></div><div class="card"><h3>Assegnazioni attive</h3>${(as||[]).map(x=>`<div class="item">${esc(x.patient_id)} → ${esc(x.clinician_id)}</div>`).join('')}</div>`; document.getElementById('assignBtn').onclick=async()=>{const {error}=await sb.from('patient_clinicians').upsert({patient_id:ap.value,clinician_id:ac.value,active:true}); amsg.innerHTML=error?msg(error.message,'error'):msg('Assegnazione salvata.','ok');};}
async function adminAudit(){const {data,error}=await sb.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(200); content.innerHTML=`<div class="card"><h2>Audit</h2>${error?msg(error.message,'error'):(data||[]).map(x=>`<div class="item">${new Date(x.created_at).toLocaleString('it-IT')} · ${esc(x.action)} · ${esc(x.entity_table||'')} · ${esc(x.patient_id||'')}</div>`).join('')}</div>`;}
async function clinicianSharedJournal(patientId,panel){
 const result=await sb.from('patient_journal_entries')
  .select('id,mood,text_content,media_path,media_type,created_at')
  .eq('patient_id',patientId).eq('shared_with',state.session.user.id)
  .order('created_at',{ascending:false});
 if(!panel.isConnected || state.selectedPatient!==patientId)return;
 const section=document.createElement('section');section.className='card section';
 section.innerHTML='<h3>Diario condiviso dal paziente</h3><p class="muted">Solo le pagine inviate volontariamente dal paziente.</p>'+
  (result.error?msg(result.error.message,'error'):
   (result.data||[]).map(entry=>`<article class="item"><strong>${esc(({great:'Molto bene',good:'Bene',neutral:'Così così',low:'Non bene'})[entry.mood]||'Pagina')}</strong> · ${fmt(entry.created_at)}
   ${entry.text_content?`<p>${esc(entry.text_content)}</p>`:''}
   ${entry.media_path?`<button type="button" class="btn secondary small clinician-journal-media" data-path="${esc(entry.media_path)}">${entry.media_type==='video'?'Guarda video':'Ascolta vocale'}</button>`:''}</article>`).join('')||'<p>Nessuna pagina condivisa.</p>');
 panel.append(section);
 section.querySelectorAll('.clinician-journal-media').forEach(button=>button.onclick=async()=>{
  const signed=await sb.storage.from('patient-journal').createSignedUrl(button.dataset.path,900);
  if(signed.error)alert(signed.error.message);else window.open(signed.data.signedUrl,'_blank');
 });
}
function showBootError(error){
 console.warn('Avvio non completato; sessione locale conservata',error);
 app.innerHTML=shell(`<section class="card card-pad"><h1>Connessione non disponibile</h1><p>Non è stato possibile caricare il tuo profilo. La sessione sul dispositivo resta salvata: riprova quando la connessione è disponibile.</p><button class="btn" id="retryMeditalyBoot">Riprova</button></section>`);
 document.getElementById('retryMeditalyBoot').onclick=()=>boot().catch(showBootError);
}
boot().catch(showBootError);
