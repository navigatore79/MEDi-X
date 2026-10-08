/* BETA55: reorganize the actual BETA54 DOM without replacing its actions. */
function organizeSimpleHome() {
 const host=document.querySelector('.patient-home-focus #content');
 if(!host || host.querySelector('.simple-stack'))return;
 const stack=document.createElement('div');stack.className='simple-stack';
 host.querySelector('.daily-checkin-card')?.after(stack);
 void offerDailyAssignedQuestionnaire(host);
 const make=(title,icon,tone='')=>{
  const d=document.createElement('details');d.className='simple-section '+tone;
  d.innerHTML=`<summary><span class="simple-icon">${uiIcon(icon)}</span><span>${esc(title)}</span><b aria-hidden="true">⌄</b></summary><div class="simple-body"></div>`;
  stack.append(d);return d.lastElementChild;
 };
 const move=(target,selector)=>host.querySelectorAll(selector).forEach(n=>target.append(n));
 const action=(body,label,tab)=>{const b=document.createElement('button');b.className='btn full';b.textContent=label;b.type='button';b.onclick=()=>{state.tab=tab;if(tab==='chat')state.selectedChatPeer=state.selectedCareDoctor;patientView();};body.append(b);};
 const doctor=make('Scrivi al medico','messages','simple-doctor');
 const name=document.createElement('p');name.textContent=chosenCareDoctor()?.profiles?.full_name||'Scegli il tuo medico';doctor.append(name);
 action(doctor,'Apri la conversazione','chat');move(doctor,'#myDoctor,[data-go="inviteDoctor"]');
 const therapy=make('Terapie','pill','simple-therapy');
 move(therapy,'.home-today-plan,.next-row[data-go="therapy"]');action(therapy,'Apri tutte le terapie','therapy');
 const appointments=make('Appuntamenti','calendar');move(appointments,'.next-row[data-go="followup"]');action(appointments,'Controlli e appuntamenti','followup');
 const reports=make('Referti','report');action(reports,'Consulta e carica i referti','reports');
 const journey=make('Il tuo percorso','search');move(journey,'.home-prevention,.home-path-card');
 const old=journey.querySelector('#homePathContent');if(old)old.hidden=false;
 journey.querySelector('.home-path-toggle')?.remove();
 action(journey,'Questionari del medico','assignedQuestionnaires');action(journey,'Le mie condizioni','conditions');
 const journal=make('Diario','diary');action(journal,'Testo, voce e video','journal');
 const measures=make('Le tue misure e dispositivi','heart');move(measures,'.home-measures');action(measures,'Dati del telefono e dispositivi','devices');
 const who=host.querySelector('.who-tips');if(who)host.querySelector('.daily-checkin-card')?.after(who);
 const news=make('Notizie','report');news.parentElement.open=true;move(news,'.local-health-news');
 const services=make('Numeri e link utili','search');services.parentElement.open=true;move(services,'.home-territory');
 // Every original page remains accessible from the bottom Menu.
 host.querySelector('.home-command-grid')?.remove();host.querySelector('.next-card')?.remove();
 configureReferenceHeader(host,services);
 const medi=document.getElementById('headerMedi');
 if(medi){medi.classList.add('simple-medi');medi.innerHTML='<img src="medi-avatar.png" alt=""><span>Medi</span>';document.querySelector('.patient-shell').append(medi);}
}
async function offerDailyAssignedQuestionnaire(host){
 const uid=state.session?.user.id;if(!uid)return;
 let query=sb.from('care_questionnaire_assignments').select('id').eq('patient_id',uid).eq('active',true);
 if(state.selectedCareDoctor)query=query.eq('clinician_id',state.selectedCareDoctor);
 const {data,error}=await query;if(error||!data?.length||!host.isConnected)return;
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
 const submitted=await sb.from('care_questionnaire_responses').select('assignment_id').eq('patient_id',uid).eq('response_date',today);
 if(submitted.error||!host.isConnected)return;
 const complete=new Set((submitted.data||[]).map(r=>r.assignment_id));
 if(data.every(a=>complete.has(a.id)))return;
 const b=document.createElement('button');b.type='button';b.className='btn secondary full';b.textContent='Completa il questionario del medico';
 b.onclick=()=>{state.tab='assignedQuestionnaires';patientView();};host.querySelector('.daily-checkin-card')?.append(b);
}

function configureReferenceHeader(host,services){
 const top=document.querySelector('.patient-shell .mobile-top');
 if(top){
  top.classList.add('reference-top');
  const brand=top.querySelector('.brand-mini');
  if(brand){brand.querySelector('.brand-mark')?.remove();brand.querySelector('.tiny')?.remove();
   const select=brand.querySelector('.doctor-header-select');
   if(select){select.classList.add('reference-doctor-select');services.prepend(select);}}
  const bell=top.querySelector('#openNotifications');
  if(bell)bell.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>';
  const logout=top.querySelector('#logout');if(logout){logout.textContent='Esci';logout.classList.add('reference-logout');services.append(logout);}
 }
 const head=host.querySelector('.clinical-home-head'),title=head?.querySelector('h1');
 if(title){title.textContent='Ciao, '+(state.profile.full_name||'').split(' ')[0]+'!';
  head.querySelector('.simple-greeting')?.remove();
  const subtitle=document.createElement('p');subtitle.className='simple-greeting';subtitle.textContent='Come stai oggi?';title.after(subtitle);
  const asl=services.querySelector('.home-asl-line');if(asl)head.firstElementChild.append(asl);
  const location=services.querySelector('#homeLocationMsg');if(location)head.firstElementChild.append(location);
  const aslLine=head.querySelector('.home-asl-line'),aslLink=aslLine?.querySelector('a strong')?.closest('a');
  if(aslLink){const label=aslLine.textContent.includes('zona in cui ti trovi')?'ASL della zona · ':'ASL di appartenenza · ';aslLine.replaceChildren(document.createTextNode(label),aslLink);}
  if(!head.querySelector('.reference-heart'))head.insertAdjacentHTML('beforeend','<svg class="reference-heart" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M30 51S8 34 8 23c0-11 14-14 22-1 8-13 22-10 22 1 0 11-22 28-22 28Z"/><path d="m48 10 4-7m4 18 7-2m-8 15 6 4"/></svg>');
 }
 const mouths={green:'M21 31Q30 44 39 31',yellow:'M23 35H37',red:'M21 39Q30 25 39 39'};
 const colors={green:'#bfe0c4',yellow:'#f5d496',red:'#eb957d'};
 host.querySelectorAll('.mood-btn').forEach(b=>{
  const mood=b.dataset.mood,face=b.querySelector('.mood-face');
  if(face)face.innerHTML=`<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="28" fill="${colors[mood]}"/><circle cx="22" cy="23" r="3" fill="#343529"/><circle cx="38" cy="23" r="3" fill="#343529"/><path d="${mouths[mood]}" fill="none" stroke="#343529" stroke-width="4" stroke-linecap="round"/></svg>`;
  if(mood==='red')b.querySelector('strong').textContent='Male';
 });
}
