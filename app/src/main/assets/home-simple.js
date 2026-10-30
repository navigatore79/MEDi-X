/* MEDIapp: three primary actions, with the personal archive still available. */
function organizeSimpleHome({centerName='Il tuo centro',unreadCount=0,therapy='Le indicazioni del tuo medico',appointment='Le date proposte dal medico'}={}) {
 const host=document.querySelector('.patient-home-focus #content');
 if(!host||host.querySelector('.mediapp-home'))return;
 const go=tab=>{state.tab=tab;if(tab==='chat')state.selectedChatPeer=state.selectedCareDoctor;patientView();};
 const modals=[...host.querySelectorAll('#mediModal,#checkinModal')];
 const news=host.querySelector('.local-health-news'),territory=host.querySelector('.home-territory');
 const asl=host.querySelector('.home-asl-line'),location=host.querySelector('#homeLocationMsg');
 const main=document.createElement('div');main.className='mediapp-home';
 const first=(state.profile?.full_name||'').trim().split(/\s+/)[0];
 main.innerHTML=`<section class="mediapp-welcome"><p class="mediapp-kicker">CONTINUITÀ ASSISTENZIALE PER TUTTI</p><h1>Ciao${first?' '+esc(first):''}</h1><p>Il tuo centro, vicino a te.</p><div class="mediapp-center">${uiIcon('doctor')}<span>${esc(centerName)}</span></div></section><div class="mediapp-primary" aria-label="Le funzioni principali"></div><details class="mediapp-more"><summary>Archivio e altre funzioni <span aria-hidden="true">⌄</span></summary><div class="mediapp-secondary"></div></details><section class="mediapp-info" aria-label="La tua ASL e notizie di salute"></section><p class="mediapp-service-note">Le comunicazioni non garantiscono una risposta immediata. Per le urgenze usa i consueti canali di emergenza.</p>`;
 const button=(parent,{label,sub,icon,tab,primary=false,badge=0})=>{
  const b=document.createElement('button');b.type='button';b.className=primary?'mediapp-action':'mediapp-secondary-action';b.dataset.go=tab;
  b.innerHTML=`<span class="mediapp-action-icon" aria-hidden="true">${uiIcon(icon)}</span><span class="mediapp-action-copy"><strong>${esc(label)}</strong>${sub?`<small>${esc(sub)}</small>`:''}</span>${badge?`<span class="mediapp-count" aria-label="${badge} messaggi non letti">${badge>99?'99+':badge}</span>`:'<span class="mediapp-action-arrow" aria-hidden="true">›</span>'}`;
  b.onclick=()=>go(tab);parent.append(b);
 };
 const primary=main.querySelector('.mediapp-primary');
 button(primary,{label:'Comunicazioni',sub:'Messaggi del medico e del centro',icon:'messages',tab:'chat',primary:true,badge:unreadCount});
 button(primary,{label:'Terapie',sub:therapy,icon:'pill',tab:'therapy',primary:true});
 button(primary,{label:'Appuntamenti',sub:appointment,icon:'calendar',tab:'followup',primary:true});
 const secondary=main.querySelector('.mediapp-secondary');
 for(const [label,icon,tab] of [['Referti e documenti','report','reports'],['Il mio diario','diary','journal'],['Diario vaccinazioni','report','vaccines'],['Questionari del medico','form','assignedQuestionnaires'],['Avvisi e notifiche','bell','notifications'],['Medico e centro','doctor','doctor'],['Tutte le funzioni','menu','more']])button(secondary,{label,icon,tab});
 const info=main.querySelector('.mediapp-info');
 if(asl){const section=document.createElement('section');section.className='mediapp-asl';const title=document.createElement('h2');title.textContent='La tua ASL';section.append(title,asl);if(location)section.append(location);info.append(section);}
 if(news)info.append(news);
 if(territory){const d=document.createElement('details');d.className='mediapp-more';d.innerHTML='<summary>Informazioni e numeri utili <span aria-hidden="true">⌄</span></summary>';d.append(territory);info.append(d);}
 host.replaceChildren(main,...modals);
 const top=document.querySelector('.patient-shell .mobile-top');
 if(top){top.classList.add('mediapp-top');const brand=top.querySelector('.brand-mini');if(brand){brand.querySelector('.tiny')?.remove();const select=brand.querySelector('.doctor-header-select');if(select)secondary.prepend(select);}
  if(!top.querySelector('.mediapp-health-cross')){const cross=document.createElement('span');cross.className='mediapp-health-cross';cross.setAttribute('role','img');cross.setAttribute('aria-label','Simbolo sanitario');cross.textContent='✚';top.append(cross);}
  const logout=top.querySelector('#logout');if(logout){logout.textContent='Esci';logout.classList.add('mediapp-logout');secondary.append(logout);}
 }
 const medi=document.getElementById('headerMedi');
 if(medi){medi.classList.add('simple-medi');medi.innerHTML='<img src="medi-avatar.png" alt=""><span>Medi</span>';document.querySelector('.patient-shell').append(medi);}
}
