/* BETA52: guided self-report; no diagnosis or autonomous clinical score. */
const CheckinFlow = (()=>{
 const fields=[
  {id:'mood',label:'Come stai oggi?',choices:['Bene','Così così','Non sto bene']},
  {id:'trend',label:'Rispetto a ieri come stai?',choices:['Meglio','Come ieri','Peggio','Non so']},
  {id:'symptoms',label:'Hai disturbi nuovi o diversi dal solito?',choices:['Nessun disturbo nuovo','Sì, voglio descriverli'],text:true},
  {id:'onset',label:'Da quando hai questi disturbi?',text:true,detail:true},
  {id:'severity',label:'Quanto sono intensi e come stanno cambiando?',choices:['Lievi','Moderati','Forti'],text:true,detail:true},
  {id:'therapy',label:'Come è andata con i farmaci previsti?',choices:['Assunti come previsto','Ho avuto difficoltà','Non ricordo','Non ho farmaci previsti'],text:true},
  {id:'daily',label:'Come sono andati sonno, appetito, idratazione e attività quotidiane?',choices:['Come al solito','Ho notato cambiamenti'],text:true},
  {id:'measurements',label:'Hai misurato qualche valore? Indica anche unità e orario.',text:true},
  {id:'note',label:'C’è altro che vuoi riferire al medico?',text:true}
 ];
 const detail=a=>a.mood!=='Bene'||(a.symptoms&&a.symptoms!=='Nessun disturbo nuovo'&&a.symptoms!=='Non indicato');
 const steps=a=>fields.filter(f=>!f.detail||detail(a));
 const summary=a=>[...(a.opening?['Risposta libera al saluto di Medi\n'+a.opening]:[]),...fields.filter(f=>a[f.id]).map(f=>f.label+'\n'+a[f.id])].join('\n\n');
 const mood=a=>({'Bene':'green','Così così':'yellow','Non sto bene':'red'})[a.mood];
 return {fields,steps,summary,mood};
})();
async function patientGemini(payload){
 const uid=state.session?.user?.id;if(!uid)throw new Error('Accedi per usare Medi.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),28000);
 try{
  const {data:sessionData}=await sb.auth.getSession();
  let session=sessionData?.session||state.session;
  if(session?.user?.id!==uid)throw new Error('Sessione cambiata. Riapri Medi.');
  const send=token=>fetch(window.MEDITALY_SUPABASE.url+'/functions/v1/medi-patient-gemini',{method:'POST',headers:{'Content-Type':'application/json',apikey:window.MEDITALY_SUPABASE.publishableKey,Authorization:'Bearer '+token},body:JSON.stringify(payload),signal:controller.signal});
  let response=await send(session.access_token);
  if(response.status===401){
   const refreshed=await sb.auth.refreshSession();session=refreshed.data?.session;
   if(refreshed.error||session?.user?.id!==uid)throw new Error('Sessione scaduta: accedi nuovamente per usare Medi.');
   response=await send(session.access_token);
  }
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(String(data.error||data.message||'Medi non disponibile.').replace(/Gemini|Google/g,'Medi')+' [HTTP '+response.status+']');
  if(state.session?.user?.id!==uid)throw new Error('Sessione cambiata.');
  if(data.provider!=='gemini')throw new Error('Risposta del servizio non riconosciuta.');
  return data;
 }catch(e){if(e.name==='AbortError')throw new Error('Medi non risponde in tempo. Le funzioni guidate restano disponibili.');if(e instanceof TypeError)throw new Error('Connessione a Medi non riuscita. Controlla Internet e riprova.');throw e;}finally{clearTimeout(timer);}
}
let activeCheckin=null;
async function startInteractiveCheckin(initialMood,opening={}){
 if(typeof cancelPatientWelcome==='function'&&patientWelcome)cancelPatientWelcome();
 mediVoiceActive=false;mediStopCloud();document.getElementById('mediModal')?.classList.add('hidden');
 const uid=state.session?.user?.id;if(!uid)return;
 if(activeCheckin?.uid===uid&&document.getElementById('interactiveCheckin'))return;
 if(navigator.onLine!==false)await loadCareDoctors();if(state.session?.user?.id!==uid)return;
 const date=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
 const pendingKey='meditaly-checkin-pending-'+uid;
 let pending=null;try{pending=JSON.parse(localStorage.getItem(pendingKey)||'null');}catch{}
 const answers=pending?.uid===uid?pending.answers:{};if(!pending&&['green','yellow','red'].includes(initialMood))answers.mood=({green:'Bene',yellow:'Così così',red:'Non sto bene'})[initialMood];
 if(!pending&&opening.transcript)answers.opening=String(opening.transcript).slice(0,1600);
 const flow={uid,date:pending?.date||date,answers,index:pending?99:(answers.mood?1:0),request:pending?.request||crypto.randomUUID(),recipient:pending?.recipient||state.selectedCareDoctor||'',ai:pending?.ai||false,revision:0};activeCheckin=flow;
 const overlay=document.createElement('div');overlay.id='interactiveCheckin';overlay.className='checkin52-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.innerHTML='<section class="checkin52-card"><header><div><span class="eyebrow dark">IL TUO CHECK-IN</span><h2>Un momento per te</h2></div><button id="ciClose" class="icon-btn" aria-label="Chiudi check-in">×</button></header><div id="ciStep"></div></section>';document.body.append(overlay);
 overlay.addEventListener('pointerdown',()=>MediTurn.stop());
 const close=()=>{MediTurn.stop();flow.revision++;activeCheckin=null;mediSpeechOnDone=null;window.AndroidBridge?.stopSpeaking?.();overlay.remove();};
 overlay.querySelector('#ciClose').onclick=()=>{if(flow.sending)return;if(confirm('Chiudere il check-in? Un invio in attesa resterà disponibile sul dispositivo; le altre risposte verranno scartate.'))close();};
 let openingPrompt=opening.followup||'';
 const render=()=>{
  MediTurn.stop();
  if(activeCheckin!==flow||state.session?.user?.id!==uid){close();return;}
  const steps=CheckinFlow.steps(answers),field=steps[flow.index],box=overlay.querySelector('#ciStep');
  if(openingPrompt){
   const question=openingPrompt;
   box.innerHTML=`<span class="eyebrow dark">MEDI · APPROFONDIMENTO</span><h3>${esc(question)}</h3><p>Risposta iniziale: ${esc(answers.opening||'')}</p><textarea id="ciOpeningAnswer" class="textarea" rows="3" maxlength="600" placeholder="Scrivi o detta la risposta"></textarea><div class="ci-nav"><button id="ciOpeningMic" class="btn secondary">Detta</button><button id="ciOpeningNext" class="btn">Continua</button><button id="ciOpeningSkip" class="text-link">Salta</button></div>`;
   const accept=answer=>{if(!answer?.trim())return;answers.opening+='\n'+question+'\n'+answer.trim().slice(0,600);openingPrompt='';flow.ai=true;flow.revision++;render();};
   const revision=flow.revision,valid=()=>activeCheckin===flow&&flow.revision===revision&&state.session?.user?.id===uid&&overlay.isConnected;
   const speak=()=>MediTurn.ask(question,{valid,answer:text=>{if(text)accept(text);},seconds:12});
   box.querySelector('#ciOpeningMic').onclick=speak;
   box.querySelector('#ciOpeningNext').onclick=()=>accept(box.querySelector('#ciOpeningAnswer').value);
   box.querySelector('#ciOpeningSkip').onclick=()=>{openingPrompt='';render();};
   speak();return;
  }
  if(!field){review();return;}
  box.innerHTML=`<div class="ci-progress"><span style="width:${Math.round(flow.index/steps.length*100)}%"></span></div><p class="small muted">Domanda ${flow.index+1} di ${steps.length} · Puoi saltare le domande facoltative</p><h3 tabindex="-1">${esc(field.label)}</h3><div class="ci-choices">${(field.choices||[]).map(x=>`<button type="button" class="btn secondary" data-answer="${esc(x)}">${esc(x)}</button>`).join('')}</div>${field.text?`<label class="field"><span>La tua risposta</span><textarea id="ciAnswer" maxlength="600" rows="3" placeholder="Scrivi o detta…">${esc(answers[field.id]||'')}</textarea></label><button class="btn secondary" id="ciDictate">🎙 Detta</button>`:''}<div id="ciHelp" role="status"></div><div class="ci-nav">${flow.index?'<button class="btn secondary" id="ciBack">Indietro</button>':''}${field.text?'<button class="btn" id="ciNext">Continua</button>':''}${field.id!=='mood'?'<button class="text-link" id="ciSkip">Non indicare</button>':''}<button class="text-link" id="ciSpeak">Ascolta domanda</button></div><p class="ci-emergency">Il check-in non esclude un’urgenza. Se pensi sia un’emergenza, chiama il 112 senza aspettare la chat.</p>`;
  box.querySelector('h3').focus();
  const next=value=>{if(!value?.trim())return;answers[field.id]=value.trim();if(field.id==='symptoms'&&!CheckinFlow.steps(answers).some(x=>x.id==='onset')){delete answers.onset;delete answers.severity;}flow.revision++;flow.index++;render();};
  box.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(field.text&& !['Nessun disturbo nuovo','Assunti come previsto','Non ho farmaci previsti','Come al solito'].includes(b.dataset.answer)){box.querySelector('#ciAnswer').value=b.dataset.answer+': ';box.querySelector('#ciAnswer').focus();}else next(b.dataset.answer);});
  box.querySelector('#ciNext')?.addEventListener('click',()=>next(box.querySelector('#ciAnswer').value));
  box.querySelector('#ciSkip')?.addEventListener('click',()=>next('Non indicato'));
  box.querySelector('#ciBack')?.addEventListener('click',()=>{flow.revision++;flow.index--;render();});
  const revision=flow.revision,valid=()=>activeCheckin===flow&&flow.revision===revision&&state.session?.user?.id===uid&&overlay.isConnected;
  const status=text=>{const help=box.querySelector('#ciHelp');if(help&&valid())help.textContent=text;};
  let retries=0;
  const acceptVoice=text=>{
   if(!valid())return;
   if(!text){status('Non ho sentito la risposta. Tocca Ascolta domanda per riprovare oppure usa i pulsanti.');return;}
   const value=checkinVoiceValue(field,text);
   if(value==='__describe__'){MediTurn.ask('Quali disturbi nuovi o diversi hai notato?',{valid,status,seconds:12,answer:description=>{if(description?.trim())next(description.slice(0,600));else status('Puoi descriverli qui o riascoltare la domanda.');}});return;}
   if(value===null){if(retries++<1)MediTurn.ask('Puoi rispondere: '+field.choices.join(', ')+'.',{valid,status,answer:acceptVoice,seconds:8});else status('Non ho capito la scelta. Seleziona una delle risposte.');return;}
   next(value);
  };
  const speak=()=>MediTurn.ask(field.label+(field.choices&&!field.text?' Puoi rispondere: '+field.choices.join(', ')+'.':''),{valid,status,answer:acceptVoice,seconds:field.text?12:8});
  box.querySelector('#ciDictate')?.addEventListener('click',speak);
  box.querySelector('#ciSpeak').onclick=speak;
  speak();
 };
 const review=()=>{
  MediTurn.stop();
  const box=overlay.querySelector('#ciStep');
  box.innerHTML=`<span class="eyebrow dark">RILEGGI E CONFERMA</span><h3>Il tuo aggiornamento</h3>${pending?'<p class="notice">Riprendi l’invio già confermato. Se era arrivato, non verrà duplicato.</p><button class="text-link" id="ciDiscard">Abbandona questo invio in attesa</button>':''}<p>Verranno inviate le risposte qui sotto, senza diagnosi o punteggi automatici.</p><pre class="ci-summary">${esc(CheckinFlow.summary(answers))}</pre><label class="field"><span>Invia al medico</span><select id="ciDoctor"><option value="">Salva solo nel percorso</option>${state.careDoctors.map(x=>`<option value="${x.clinician_id}" ${x.clinician_id===flow.recipient?'selected':''}>${esc(x.profiles.full_name)}</option>`).join('')}</select></label><p class="small muted">Il messaggio viene inviato solo al destinatario scelto. Il check-in nel percorso resta visibile ai medici autorizzati.</p><div id="ciResult" role="status"></div><div class="ci-nav"><button class="btn secondary" id="ciEdit">Modifica risposte</button><button class="btn" id="ciSend">Conferma e salva${flow.recipient?' e invia':''}</button></div>`;
  if(pending)box.querySelector('#ciDoctor').disabled=true;
  box.querySelector('#ciDiscard')?.addEventListener('click',()=>{if(confirm('Rimuovere la copia in attesa dal dispositivo? Un messaggio eventualmente già ricevuto dal medico non verrà cancellato.')){localStorage.removeItem(pendingKey);close();}});
  box.querySelector('#ciDoctor').onchange=e=>{flow.recipient=e.target.value;box.querySelector('#ciSend').textContent=flow.recipient?'Conferma e invia al medico':'Conferma e salva nel percorso';};
  box.querySelector('#ciEdit').onclick=()=>{if(pending){alert('Prima verifica o riprova l’invio in attesa: potrebbe essere già stato ricevuto.');return;}flow.revision++;flow.index=0;render();};
  mediSpeakCloud('Abbiamo finito. Rileggi il riepilogo e scegli se confermare e inviare al medico.');
  box.querySelector('#ciSend').onclick=async()=>{
   if(flow.sending)return;flow.sending=true;flow.revision++;
   box.querySelectorAll('button,select,input').forEach(x=>x.disabled=true);
   const result=box.querySelector('#ciResult');result.textContent='Salvataggio in corso…';
   try{
    localStorage.setItem(pendingKey,JSON.stringify({uid,date:flow.date,answers,request:flow.request,recipient:flow.recipient,ai:flow.ai}));
    if(state.session?.user?.id!==uid)throw new Error('Sessione cambiata. Accedi di nuovo.');
    const {data,error}=await sb.rpc('submit_interactive_checkin',{p_request:flow.request,p_status:CheckinFlow.mood(answers),p_note:CheckinFlow.summary(answers)+(flow.ai?'\n\nApprofondimento assistito da Medi; risposte confermate dal paziente.':''),p_clinician:flow.recipient||null,p_date:flow.date});if(error)throw error;
    localStorage.removeItem(pendingKey);window.AndroidBridge?.completeCheckin?.(uid);if(data?.message_id)void dispatchChatPush(data.message_id);
    result.textContent=data?.message_id?'Check-in salvato e messaggio inviato.':'Check-in salvato nel percorso. Nessun messaggio inviato.';
    box.querySelector('#ciSend').textContent='Fatto';box.querySelector('#ciSend').disabled=false;box.querySelector('#ciSend').onclick=()=>{flow.sending=false;close();if(state.tab==='home')patientHome();};
   }catch(error){flow.sending=false;result.textContent='In attesa di invio. Le risposte sono salvate su questo dispositivo: riapri il check-in per riprovare. '+(error.message||'');box.querySelector('#ciSend').disabled=false;}
  };
 };
 render();
}
async function disconnectDoctor(id,name){
 if(!confirm(`Interrompere il collegamento con ${name}? Non riceverà nuovi aggiornamenti e non potrete scambiare nuovi messaggi. Lo storico già ricevuto e i tuoi promemoria restano disponibili.`))return;
 const {error}=await sb.rpc('disconnect_my_clinician',{p_clinician:id});if(error){alert('Collegamento non interrotto: '+error.message);return;}
 state.selectedCareDoctor=null;state.selectedChatPeer=null;await loadCareDoctors();localStorage.removeItem('meditaly-care-doctor-'+state.session.user.id);await patientView();mediVoiceNotice('Collegamento interrotto.');
}
function fitPatientChat(){
 const chat=document.querySelector('.chat-screen');if(!chat)return;
 const shell=chat.closest('.patient-shell');if(!shell)return;
 shell.classList.add('chat-mode');
 const viewport=window.visualViewport;
 shell.style.height=(viewport?.height||innerHeight)+'px';
 chat.style.height='100%';

}
window.visualViewport?.addEventListener('resize',fitPatientChat);window.addEventListener('resize',fitPatientChat);
async function showReceivedDocuments(){
 const host=document.getElementById('receivedDocuments');if(!host)return;
 const uid=state.session.user.id;
 const {data,error}=await sb.from('medical_reports').select('id,title,report_type,uploaded_at,uploaded_by').eq('patient_id',uid).not('uploaded_by','is',null).neq('uploaded_by',uid).order('uploaded_at',{ascending:false});
 if(!host.isConnected)return;
 host.innerHTML='<h2>Ricevuti dal medico</h2>'+(error?msg('Archivio non disponibile. Riprova.','error'):(data||[]).map(x=>`<article class="report-card"><div class="report-file-icon">▤</div><div class="report-body"><strong>${esc(x.title)}</strong><small>${esc(state.careDoctors.find(d=>d.clinician_id===x.uploaded_by)?.profiles.full_name||'Medico mittente')} · ${fmt(x.uploaded_at)}</small></div><button class="btn secondary" data-received="${x.id}">Apri</button></article>`).join('')||'<p class="muted">Nessun nuovo documento ricevuto. I documenti precedenti restano nell’archivio completo qui sotto.</p>');
 host.querySelectorAll('[data-received]').forEach(b=>b.onclick=()=>openReportPages(b.dataset.received));
}
async function executePatientAction(data){
 const allowed=['home','therapy','followup','chat','reports','doctor','notifications','journal'];
 if(data.action==='open'&&allowed.includes(data.target)){
  mediVoiceActive=false;mediStopCloud();state.tab=data.target;
  if(data.target==='chat')state.selectedChatPeer=state.selectedCareDoctor||null;
  await patientView();return true;
 }
 if(data.action==='checkin'){await startInteractiveCheckin();return true;}
 if(data.action==='snooze'&&[30,60].includes(data.minutes)){
  const ok=window.AndroidBridge?.snoozeCheckin?.(state.session.user.id,data.minutes);mediVoiceNotice(ok?'Promemoria rinviato.':'Il rinvio richiede le notifiche configurate nell’app Android.');return true;
 }
 if(data.action==='draft'&&typeof data.draft==='string'&&data.draft.trim()){
  state.tab='chat';state.selectedChatPeer=state.selectedCareDoctor||null;mediVoiceActive=false;mediStopCloud();await patientView();const input=document.getElementById('chatBody');if(input){input.value=data.draft.slice(0,2000);input.dispatchEvent(new Event('input'));input.focus();}else mediVoiceNotice('Seleziona prima un medico collegato.');return true;
 }
 return false;
}
function localPatientAction(text){
 const q=String(text).trim().toLocaleLowerCase('it').replace(/[.!?]+$/,'');
 if(/^(home|torna (alla |in )?home|apri home)$/.test(q))return {action:'open',target:'home'};
 const routes={'terapie':'therapy','terapia':'therapy','messaggi':'chat','chat':'chat','referti':'reports','documenti':'reports','controlli':'followup','medici':'doctor','notifiche':'notifications','diario':'journal'};
 const m=q.match(/^(?:apri|mostra|mostrami) (?:i |le |la |il |i miei |le mie )?([a-z]+)$/);if(m&&routes[m[1]])return {action:'open',target:routes[m[1]]};
 if(/^(inizia|apri|facciamo) (il )?check[ -]?in$/.test(q))return {action:'checkin'};
 if(/^(rimanda|posticipa) (il )?check[ -]?in (di |tra )?(30 minuti|un'ora|un ora|1 ora)$/.test(q))return {action:'snooze',minutes:q.includes('30')?30:60};
 return null;
}
