/* Patient questionnaires exist only after a clinician assignment. */
window.MeditalyOffline?.register('questionnaire',async(payload,uid)=>{
 if(state.session?.user.id!==uid)throw new Error('Account cambiato');
 const result=await sb.rpc('submit_care_questionnaire_offline',{p_assignment:payload.assignment,p_answers:payload.answers,p_response_date:payload.date});
 if(result.error)throw result.error;return result.data;
});
window.MeditalyOffline?.register('intake',async(payload,uid)=>{
 if(state.session?.user.id!==uid||payload.patient_id!==uid)throw new Error('Account cambiato');
 const result=await sb.from('medication_intakes').upsert(payload,{onConflict:'medication_schedule_id,intake_date'});if(result.error)throw result.error;return payload;
});
async function savePatientIntake(row){
 const offline=window.MeditalyOffline;
 if(!offline)return sb.from('medication_intakes').upsert(row,{onConflict:'medication_schedule_id,intake_date'});
 try{const id='intake:'+row.medication_schedule_id+':'+row.intake_date;await offline.enqueue('intake',id,row);await offline.pump();const pending=await offline.get('job:'+id);return {error:null,pending:!!pending,detail:pending?.error};}catch(error){return {error};}
}
function addCareMenuEntries(){
 const grid=document.querySelector('.more-grid');if(!grid)return;
 for(const [label,tab] of [['Dispositivi Bluetooth','devices'],['Terapie','therapy']]){
  const b=document.createElement('button');b.className='quick-card';b.type='button';b.textContent=label;b.onclick=()=>{state.tab=tab;patientView();};grid.prepend(b);
 }
}
window.openMeditalyIntakeAction=action=>{
 if(!state.session||!state.profile)return false;
 void saveNotificationIntake(action);return true;
};
async function saveNotificationIntake(a){
 const uid=state.session.user.id,today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
 if(a.patient!==uid){alert('Questo promemoria appartiene a un altro account.');return;}
 state.tab='therapy';await patientView();
 if(a.date!==today){alert('Promemoria scaduto: verifica le assunzioni della giornata nella terapia.');return;}
 if(!['taken','skipped'].includes(a.status))return;
 const {error}=await savePatientIntake({patient_id:uid,medication_schedule_id:a.schedule,intake_date:a.date,status:a.status,skip_reason:a.status==='skipped'?'Dichiarato dalla notifica':null,confirmed_at:new Date().toISOString()});
 if(error){alert('Risposta non salvata. Conferma l’assunzione dalla pagina Terapie.');return;}
 await patientTherapy();mediVoiceNotice(a.status==='taken'?'Assunzione dichiarata salvata.':'Mancata assunzione dichiarata salvata.');
}
async function patientAssignedQuestionnaires(){
 stopAssignedQuestionnaireVoice();
 const uid=state.session.user.id,doctor=state.selectedCareDoctor;
 const current=()=>state.tab==='assignedQuestionnaires'&&state.session?.user.id===uid&&state.selectedCareDoctor===doctor;
 const {data,error}=await sb.from('care_questionnaire_assignments').select('*').eq('patient_id',uid).eq('active',true).order('created_at',{ascending:false});
 if(!current())return;
 content.innerHTML='<section class="page-title"><button class="back-link" id="careBack">‹ Home</button><h1>Questionari del medico</h1><p>Compila le risposte e premi <strong>Invia al medico</strong>. La compilazione da sola non invia nulla. Senza rete, l’invio confermato resta sul telefono e riparte alla connessione.</p><p>Il questionario non sostituisce i canali di emergenza.</p></section><div id="assignedForms"></div>';
 document.getElementById('careBack').onclick=()=>{stopAssignedQuestionnaireVoice();state.tab='home';patientView();};
 const host=document.getElementById('assignedForms');
 if(error){host.innerHTML=msg('Questionari non disponibili: '+error.message,'error');return;}
 const selected=(data||[]).filter(a=>a.patient_id===uid&&a.active===true&&(!doctor||a.clinician_id===doctor));
 if(!selected.length){host.innerHTML='<p>Nessun questionario assegnato dal medico selezionato. Sarà disponibile qui quando il medico lo assegnerà dalla dashboard.</p>';return;}
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
 for(const a of selected){
  const card=document.createElement('section');card.className='card card-pad';
  const done=await sb.from('care_questionnaire_responses').select('id').eq('assignment_id',a.id).eq('response_date',today).maybeSingle();
  if(!current())return;
  const offline=window.MeditalyOffline,jobId='questionnaire:'+a.id+':'+today,draftKey='draft:'+jobId;
  const queued=await offline?.get('job:'+jobId),receipt=await offline?.get('receipt:'+jobId),draft=await offline?.get(draftKey);
  if(done.error&&navigator.onLine!==false&&!queued&&!draft&&!receipt){card.textContent='Impossibile verificare la compilazione. Riprova.';host.append(card);continue;}
  const name=state.careDoctors.find(d=>d.clinician_id===a.clinician_id)?.profiles?.full_name||'Medico assegnante';
  const date=a.created_at?new Date(a.created_at).toLocaleDateString('it-IT'):'';
  card.innerHTML=`<h2>${esc(a.title)}</h2><p class="small muted">Assegnato da ${esc(name)}${date?' · '+esc(date):''} · Versione ${esc(a.version_label)}</p>`;
  if(done.data||receipt){card.insertAdjacentHTML('beforeend','<p class="notice ok" role="status">✓ Questionario di oggi inviato al medico. Disponibile nella sua scheda e in chat.</p>');host.append(card);continue;}
  const form=document.createElement('form');
  for(const q of a.questions){
   const label=document.createElement('label');label.className='field';const title=document.createElement('span');title.textContent=q.label;label.append(title);
   const field=document.createElement(q.type==='choice'?'select':'textarea');field.className='input';field.name=q.id;field.required=!!q.required;
   if(q.type==='choice'){field.add(new Option('Seleziona una risposta',''));q.options.forEach(o=>field.add(new Option(o,o)));}
   else field.maxLength=1000;
   field.value=queued?.payload.answers[q.id]??draft?.answers[q.id]??'';
   field.addEventListener('change',()=>{const urgent=a.questions.some(x=>(x.alert_values||[]).includes(form.elements.namedItem(x.id)?.value));alarm.hidden=!urgent;});
   label.append(field);form.append(label);
  }
  const alarm=document.createElement('p');alarm.hidden=true;alarm.className='notice error';alarm.textContent='Se hai dolore al petto in corso, grave affanno, svenimento o sanguinamento importante, chiama subito il 112. Non aspettare la risposta in chat.';form.append(alarm);
  const send=document.createElement('button');send.type='submit';send.className='btn full';send.textContent='Invia al medico';form.append(send);
  const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent=queued?'In attesa di connessione: il medico non ha ancora ricevuto queste risposte.':draft?'Bozza salvata sul telefono · da inviare.':'Da compilare · nessun invio effettuato.';form.append(status);
  let draftSave=Promise.resolve();
  const saveDraft=()=>{const answers=Object.fromEntries(new FormData(form));draftSave=draftSave.catch(()=>{}).then(()=>offline?.put(draftKey,{answers,date:today}));draftSave.catch(()=>{status.textContent='Salvataggio sul telefono non riuscito. Mantieni aperto il questionario e riprova.';});return draftSave;};
  form.addEventListener('input',()=>{void saveDraft();});form.addEventListener('change',()=>{void saveDraft();});
  if(queued){form.querySelectorAll('input,select,textarea,button').forEach(f=>f.disabled=true);send.disabled=true;}
  const sent=event=>{if(event.detail.id===jobId&&current()){status.textContent='✓ Inviato al medico. Risposte disponibili nella sua scheda e in chat.';send.textContent='Inviato al medico';}};
  window.addEventListener('meditaly-offline-sent',sent);const cleanup=new MutationObserver(()=>{if(!form.isConnected){window.removeEventListener('meditaly-offline-sent',sent);cleanup.disconnect();}});cleanup.observe(document.body,{childList:true,subtree:true});

  form.onsubmit=async e=>{e.preventDefault();if(!current()||send.disabled||!form.reportValidity())return;stopAssignedQuestionnaireVoice();send.disabled=true;const answers=Object.fromEntries(new FormData(form));
   status.textContent='Invio in corso…';send.textContent='Invio in corso…';
   try{
    await saveDraft();
    if(offline){await offline.enqueue('questionnaire',jobId,{assignment:a.id,answers,date:today});await offline.remove(draftKey);await offline.pump();
     const receipt=await offline.get('receipt:'+jobId),pending=await offline.get('job:'+jobId);
     if(!current())return;
     status.textContent=receipt?'✓ Inviato al medico. Risposte disponibili nella sua scheda e in chat.':pending?.error?'Invio da completare: '+pending.error+'. Le risposte sono conservate sul telefono. Premi Sincronizza per riprovare.':'In attesa di connessione. Risposte salvate sul telefono, ancora non ricevute dal medico.';
     send.textContent=receipt?'Inviato al medico':'Invio in attesa';
    }else{const {error}=await sb.rpc('submit_care_questionnaire',{p_assignment:a.id,p_answers:answers});if(error)throw error;status.textContent='✓ Risposte salvate e inviate al medico.';}
    form.querySelectorAll('input,select,textarea,button').forEach(f=>f.disabled=true);
   }catch(error){if(!current())return;send.disabled=false;send.textContent='Riprova invio al medico';status.textContent='Invio non riuscito: '+error.message;}

  };
  attachAssignedQuestionnaireVoice(a,form,status,current,send,alarm);
  if(queued)form.querySelectorAll('input,select,textarea,button').forEach(f=>f.disabled=true);
  card.append(form);host.append(card);
 }
}

let activeAssignedQuestionnaireVoice=null;
function stopAssignedQuestionnaireVoice(){
 const run=activeAssignedQuestionnaireVoice;if(!run)return;
 run.active=false;run.revision++;activeAssignedQuestionnaireVoice=null;MediTurn.stop();
 run.button.textContent='Compila con la voce';run.navigation.hidden=true;
}
function assignedQuestionnaireVoiceAnswer(question,spoken){
 const raw=String(spoken||'').trim();if(!raw)return null;
 if(question.type==='text')return raw.slice(0,1000);
 const text=voiceText(raw),options=question.options||[];
 const exact=options.filter(option=>voiceText(option)===text);if(exact.length===1)return exact[0];
 const words=['uno','due','tre','quattro','cinque','sei','sette','otto','nove','dieci'];
 const ordinal=text.replace(/^(risposta|opzione|numero) /,'');
 const index=/^\d+$/.test(ordinal)?Number(ordinal)-1:words.indexOf(ordinal);
 return index>=0&&index<options.length?options[index]:null;
}
function attachAssignedQuestionnaireVoice(assignment,form,status,current,send,alarm){
 const controls=document.createElement('section');controls.className='card';
 controls.innerHTML='<button type="button" class="btn full cqVoiceStart">Compila con la voce</button><p class="small">Medi legge una domanda alla volta. Puoi rispondere a voce o usare i campi e correggere prima dell’invio.</p><div class="cqVoiceNavigation" hidden><p class="cqVoiceProgress" aria-live="polite"></p><button type="button" class="btn secondary cqVoicePrevious">Indietro</button> <button type="button" class="btn secondary cqVoiceNext">Continua</button> <button type="button" class="btn secondary cqVoiceSkip">Salta facoltativa</button> <button type="button" class="btn secondary cqVoiceStop">Ferma la voce</button></div>';
 form.prepend(controls);
 const button=controls.querySelector('.cqVoiceStart'),navigation=controls.querySelector('.cqVoiceNavigation'),progress=controls.querySelector('.cqVoiceProgress'),skip=controls.querySelector('.cqVoiceSkip');
 const questions=assignment.questions;
 const field=q=>form.elements.namedItem(q.id);
 const valid=run=>!!run&&activeAssignedQuestionnaireVoice===run&&run.active&&current()&&form.isConnected&&!send.disabled;
 const speak=(run,prompt,answer)=>{
  const revision=++run.revision;
  MediTurn.ask(prompt,{valid:()=>valid(run)&&run.revision===revision,answer:spoken=>{if(valid(run)&&run.revision===revision)answer(spoken);},status:text=>{if(valid(run)&&run.revision===revision)status.textContent=text;},seconds:run.index<questions.length&&questions[run.index].type==='text'?15:10});
 };
 const ask=run=>{
  if(!valid(run))return;
  if(run.index>=questions.length){
   progress.textContent='Rileggi e conferma le risposte';skip.hidden=true;button.textContent='Riascolta la conferma';
   speak(run,'Hai completato il questionario. Le risposte sono visibili qui sotto e puoi correggerle. Per inviarle al medico dì: confermo invio. Per modificarle dì: modifica.',spoken=>{
    const text=voiceText(spoken);
    if(text==='confermo invio'){
     if(!form.reportValidity()){status.textContent='Completa le risposte obbligatorie prima di inviare.';return;}
     stopAssignedQuestionnaireVoice();form.requestSubmit(send);
    }else if(text==='modifica'){run.index=0;ask(run);}
    else status.textContent='Nessun invio effettuato. Dì “confermo invio” oppure correggi i campi e premi Invia al medico.';
   });return;
  }
  const q=questions[run.index];skip.hidden=!!q.required;button.textContent='Riascolta domanda';
  progress.textContent=`Domanda ${run.index+1} di ${questions.length}`;
  field(q).closest('label')?.scrollIntoView?.({block:'center',behavior:'smooth'});
  const choices=q.type==='choice'?' Puoi rispondere: '+q.options.map((o,i)=>`${i+1}: ${o}`).join('. ')+'.':'';
  speak(run,q.label+choices,spoken=>{
   if(['ferma la voce','annulla compilazione vocale'].includes(voiceText(spoken))){stopAssignedQuestionnaireVoice();status.textContent='Compilazione vocale fermata.';return;}
   const answer=assignedQuestionnaireVoiceAnswer(q,spoken);
   if(answer===null){status.textContent='Risposta non riconosciuta: riascolta la domanda, pronuncia una delle opzioni o selezionala sullo schermo.';return;}
   field(q).value=answer;field(q).dispatchEvent(new Event('change',{bubbles:true}));advance(run);
  });
 };
 const advance=run=>{
  if(!valid(run))return;if(run.index>=questions.length){ask(run);return;}
  const q=questions[run.index],value=field(q).value;
  if(q.required&&!value.trim()){status.textContent='Questa risposta è obbligatoria. Rispondi prima di continuare.';return;}
  const urgent=(q.alert_values||[]).includes(value);run.index++;
  if(urgent){run.revision++;MediTurn.stop();status.textContent=alarm.textContent;mediSpeakCloud(alarm.textContent);button.textContent='Riprendi quando vuoi';return;}
  ask(run);
 };
 button.onclick=()=>{
  let run=activeAssignedQuestionnaireVoice;
  if(run?.form!==form||!valid(run)){
   stopAssignedQuestionnaireVoice();run={active:true,revision:0,index:questions.findIndex(q=>!field(q).value),form,button,navigation};if(run.index<0)run.index=questions.length;
   activeAssignedQuestionnaireVoice=run;navigation.hidden=false;
  }
  ask(run);
 };
 controls.querySelector('.cqVoiceStop').onclick=()=>{stopAssignedQuestionnaireVoice();status.textContent='Voce fermata. Le risposte restano modificabili sullo schermo.';};
 controls.querySelector('.cqVoicePrevious').onclick=()=>{const run=activeAssignedQuestionnaireVoice;if(valid(run)){run.index=Math.max(0,run.index-1);ask(run);}};
 controls.querySelector('.cqVoiceNext').onclick=()=>advance(activeAssignedQuestionnaireVoice);
 skip.onclick=()=>{const run=activeAssignedQuestionnaireVoice;if(!valid(run)||run.index>=questions.length||questions[run.index].required)return;field(questions[run.index]).value='';field(questions[run.index]).dispatchEvent(new Event('change',{bubbles:true}));run.index++;ask(run);};
 form.addEventListener('input',()=>{const run=activeAssignedQuestionnaireVoice;if(run?.form===form&&valid(run)){run.revision++;MediTurn.stop();status.textContent='Risposta modificata. Premi Continua o Riascolta domanda.';}});
}
