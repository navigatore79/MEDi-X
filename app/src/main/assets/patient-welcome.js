/* Medi: invisible home entry, explicit questionnaire invitation, automatic voice turns. */
let patientWelcome=null;
const welcomeQuestions={duration:'Da quando hai notato questo cambiamento?',impact:'Quanto incide sulle tue attività quotidiane?',therapy:'Hai avuto difficoltà con la terapia prevista?',changes:'Che cosa è cambiato rispetto a ieri?'};
function voiceText(text){return String(text||'').toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!?,;:]/g,' ').replace(/\s+/g,' ').trim();}
function welcomeMood(text){const q=voiceText(text);
 if(/^(non sto bene|non mi sento bene|sto male|mi sento male|malissimo)\b/.test(q))return 'red';
 if(/^(cosi cosi|insomma|non tanto bene|non molto bene)\b/.test(q))return 'yellow';
 if(/^(sto bene|mi sento bene|tutto bene|bene)\b/.test(q)&&!(/\b(ma|pero|non|male)\b/.test(q)))return 'green';return null;
}
function invitationChoice(text){const q=voiceText(text);if(/^(no|non ora|non mi va|preferisco di no|piu tardi|annulla|torna in home)(\b|$)/.test(q))return false;if(/^(si|certo|va bene|volentieri|d accordo|ok|okay)(\b|$)/.test(q)&&!(/\b(non|no|ma|pero)\b/.test(q)))return true;return null;}
const MediTurn=(()=>{let active=null,serial=0;
 const stop=()=>{const old=active;active=null;serial++;if(old?.timer)clearTimeout(old.timer);try{old?.recognizer?.abort();window.AndroidBridge?.cancelMediTurn?.();}catch{}mediStopCloud();};
 const receive=(id,text)=>{const turn=active;if(!turn||String(id)!==turn.id||!turn.valid())return;active=null;if(turn.timer)clearTimeout(turn.timer);try{Promise.resolve(turn.answer(String(text||'').trim())).catch(()=>turn.status('Non riesco a proseguire. Puoi usare i pulsanti.'));}catch{turn.status('Puoi rispondere con i pulsanti.');}};
 const ask=(text,{valid,answer,status=()=>{},seconds=8})=>{
  stop();const turn={id:'medi-'+(++serial),valid,answer,status};active=turn;
  status('Medi sta parlando…');
  mediSpeakCloud(text,()=>{if(active!==turn||!valid())return;status('Ti ascolto…');
   if(window.AndroidBridge?.listenForMediTurn){window.AndroidBridge.listenForMediTurn(turn.id,seconds*1000);return;}
   const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
   if(!SR){active=null;status('Microfono non disponibile: usa i pulsanti o scrivi.');return;}
   const rec=new SR();turn.recognizer=rec;rec.lang='it-IT';rec.interimResults=true;let partial='';
   rec.onresult=e=>{partial=Array.from(e.results||[]).map(x=>x[0]?.transcript||'').join(' ');};
   rec.onend=()=>receive(turn.id,partial);rec.onerror=()=>receive(turn.id,partial);
   rec.onstart=()=>{turn.timer=setTimeout(()=>{try{rec.stop();}catch{}},seconds*1000);};try{rec.start();}catch{receive(turn.id,'');}
  });
 };
 return {ask,stop,receive};
})();
window.onMeditalyMediTurnInput=(id,text)=>MediTurn.receive(id,text);
function welcomeStatus(text){const label=document.getElementById('mediVoiceStatus');if(label)label.textContent=String(text).replace(/Gemini/g,'Medi');}
function cancelPatientWelcome(){if(patientWelcome)patientWelcome.active=false;patientWelcome=null;state.greetingInFlight=false;MediTurn.stop();}
window.onMeditalyAppPause=()=>{if(patientWelcome){cancelPatientWelcome();state.homeVoicePending=true;}else MediTurn.stop();};
function welcomeCurrent(run){return patientWelcome===run&&run.active&&state.session?.user?.id===run.uid&&state.tab==='home'&&!activeCheckin&&!mediVoiceActive;}
async function startPatientWelcome(firstName,force=false){
 if(!state.session||!['Patient','Administrator'].includes(state.profile?.role)||state.adminArea||state.tab!=='home'||activeCheckin||mediVoiceActive||state.greetingInFlight)return;
 if(!force&&Date.now()-state.lastGreetingAt<30000)return;
 const run={uid:state.session.user.id,active:true,phase:'mood',transcript:'',mood:null};patientWelcome=run;
 state.homeVoicePending=false;state.greetingInFlight=true;state.lastGreetingAt=Date.now();
 void patientGemini({mode:'welcome',question:'Avvia il check-in quotidiano generale.'}).catch(()=>{});
 MediTurn.ask(`Ciao${firstName?' '+firstName:''}, come stai oggi?`,{valid:()=>welcomeCurrent(run),seconds:2.5,status:welcomeStatus,answer:handleWelcomeReply});
}
function offerPatientQuestionnaire(mood){
 cancelPatientWelcome();
 const uid=state.session?.user?.id;if(!uid||activeCheckin)return;
 const run={uid,active:true,phase:'invitation',mood,transcript:({green:'Bene',yellow:'Così così',red:'Non sto bene'})[mood]||''};
 patientWelcome=run;state.greetingInFlight=true;state.lastGreetingAt=Date.now();state.homeVoicePending=false;
 showWelcomeInvitation(run);
}
function showWelcomeInvitation(run){
 const modal=document.getElementById('mediModal'),box=document.getElementById('mediAnswer');
 if(modal&&box){box.innerHTML='<p>Ti va di rispondere a qualche domanda?</p><div class="medi-actions"><button id="mediAcceptCheckin" class="btn">Sì, iniziamo</button><button id="mediDeclineCheckin" class="btn secondary">Non ora</button></div>';modal.classList.remove('hidden');box.querySelector('#mediAcceptCheckin').onclick=()=>handleWelcomeReply('sì');box.querySelector('#mediDeclineCheckin').onclick=()=>handleWelcomeReply('no');}
 MediTurn.ask('Ti va di rispondere a qualche domanda?',{valid:()=>welcomeCurrent(run),answer:handleWelcomeReply,status:welcomeStatus,seconds:5});
}
async function handleWelcomeReply(spoken){
 const run=patientWelcome;if(!run||!welcomeCurrent(run)||run.phase==='processing')return;
 const text=String(spoken||'').trim().slice(0,1600);
 if(!text){state.greetingInFlight=false;welcomeStatus('Non ho sentito la risposta. Puoi usare i pulsanti.');return;}
 if(run.phase==='mood'){
  const mood=welcomeMood(text);
  if(!mood){run.transcript=text;MediTurn.ask('Come ti senti: bene, così così oppure non sto bene?',{valid:()=>welcomeCurrent(run),answer:handleWelcomeReply,status:welcomeStatus,seconds:5});return;}
  run.mood=mood;run.transcript=run.transcript?run.transcript+'\n'+text:text;run.phase='invitation';showWelcomeInvitation(run);return;
 }
 const choice=invitationChoice(text);
 if(choice===null){MediTurn.ask('Vuoi rispondere al questionario? Puoi dire sì oppure no.',{valid:()=>welcomeCurrent(run),answer:handleWelcomeReply,status:welcomeStatus,seconds:5});return;}
 MediTurn.stop();
 if(!choice){cancelPatientWelcome();document.getElementById('mediModal')?.classList.add('hidden');state.homeVoicePending=false;return;}
 run.phase='processing';state.greetingInFlight=true;welcomeStatus('Medi prepara le domande…');
 let followup='';
 try{const data=await patientGemini({mode:'checkin',question:'Risposta del paziente a Come stai oggi: '+run.transcript});followup=welcomeQuestions[data.followup]||'';}catch{welcomeStatus('Procediamo con le domande generali.');}
 if(!welcomeCurrent(run))return;
 run.active=false;patientWelcome=null;state.greetingInFlight=false;
 await startInteractiveCheckin(run.mood,{transcript:run.transcript,followup});
}
function checkinVoiceValue(field,text){
 const q=voiceText(text);if(!q)return null;
 if(field.id==='mood'){const m=welcomeMood(text);return ({green:'Bene',yellow:'Così così',red:'Non sto bene'})[m]||null;}
 if(field.id==='trend'){
  if(/^(meglio|sto meglio|mi sento meglio)$/.test(q))return 'Meglio';
  if(/^(peggio|sto peggio|mi sento peggio)$/.test(q))return 'Peggio';
  if(/^(come ieri|uguale|lo stesso|come prima)$/.test(q))return 'Come ieri';
  if(/^(non so|non lo so|non saprei)$/.test(q))return 'Non so';return null;
 }
 if(field.id==='symptoms'&&/^(no|nessuno|nessun disturbo|nessun disturbo nuovo)$/.test(q))return 'Nessun disturbo nuovo';
 if(field.id==='symptoms'&&/^(si|si voglio descriverli)$/.test(q))return '__describe__';
 if(field.id==='note'&&/^(no|nient altro|nulla|niente)$/.test(q))return 'Nulla da aggiungere';
 if(field.id==='measurements'&&/^(no|nessuno|non ho misurato nulla)$/.test(q))return 'Nessun valore misurato';
 if(field.id!=='mood'&&/^(salta|preferisco non rispondere|non indicare)$/.test(q))return 'Non indicato';
 return text.trim().slice(0,600);
}
