(()=>{
'use strict';
const root=document.getElementById('app');
const cfg=window.MEDITALY_SUPABASE||{};
const sb=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
let user=null,profile=null,doctor=null,doctorProfile=null,meds=[],followups=[],reports=[],messages=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'}):'—';
const fmtTime=t=>t?String(t).slice(0,5):'—';
const firstName=()=>((profile?.full_name||user?.user_metadata?.full_name||user?.email?.split('@')[0]||'').trim().split(/\s+/)[0]||'');
const greetWord=()=>{const h=new Date().getHours();return h<12?'Buongiorno':h<18?'Buon pomeriggio':'Buonasera'};
const todayISO=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Rome'});
const android=()=>window.AndroidBridge||null;
function speak(text){try{if(android()?.speak){android().speak(text);return;}if('speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='it-IT';u.rate=.92;speechSynthesis.speak(u)}}catch(_){}}
function shell(content,active='home'){
 return '<div class="shell">'+content+'</div><nav class="bottom"><div class="bottom-inner">'+
 [['home','⌂','Home'],['therapy','💊','Terapie'],['reports','▤','Referti'],['messages','✉','Messaggi'],['profile','♙','Profilo']].map(([id,ic,l])=>'<button class="navbtn '+(active===id?'on':'')+'" data-nav="'+id+'"><b>'+ic+'</b>'+l+'</button>').join('')+
 '</div></nav>'+(active==='home'?mediFloat():'');
}
function mediFloat(){return '<button class="medi-float" id="mediFloat"><span class="medi-robot"><i class="medi-ant"></i><i class="medi-head"><i class="medi-mouth"></i></i></span><span class="medi-text">Chiedi a Medi<small>Assistente vocale</small></span><span class="mic">🎙</span></button>'}
function bindNav(){document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>route(b.dataset.nav));const mf=document.getElementById('mediFloat');if(mf)mf.onclick=openMedi}
function route(v){if(v==='home')renderHome();if(v==='therapy')renderTherapies();if(v==='reports')renderReports();if(v==='messages')renderMessages();if(v==='profile')renderProfile()}
function brand(){return '<header class="top"><div class="brand"><div class="brand-mark">♥</div><div><div class="brand-name">Meditaly</div><div class="tag">La tua salute, ogni giorno</div></div></div><div class="top-actions"><button class="icon-btn" id="refreshBtn" aria-label="Aggiorna">↻</button></div></header>'}
function renderAuth(msg=''){
 root.innerHTML='<div class="auth"><div class="auth-card"><div class="brand"><div class="brand-mark">♥</div><div><div class="brand-name">Meditaly</div><div class="tag">La tua salute, ogni giorno</div></div></div><h2 style="margin:24px 0 4px">Accedi</h2><div class="small">Beta Meditaly</div><div class="field"><label>Email</label><input id="email" type="email" autocomplete="email"></div><div class="field"><label>Password</label><input id="pass" type="password" autocomplete="current-password"></div><button id="loginBtn" class="btn full" style="margin-top:16px">Accedi</button><button id="forgotBtn" class="link" style="width:100%;margin-top:10px">Password dimenticata</button><div id="authMsg" class="'+(msg?'err':'')+'">'+esc(msg)+'</div></div></div>';
 document.getElementById('loginBtn').onclick=login;
 document.getElementById('forgotBtn').onclick=forgot;
}
async function login(){
 const email=document.getElementById('email').value.trim(),password=document.getElementById('pass').value;
 const box=document.getElementById('authMsg');box.className='small';box.textContent='Accesso in corso…';
 const {error}=await sb.auth.signInWithPassword({email,password});
 if(error){box.className='err';box.textContent=error.message;return}
 await boot();
}
async function forgot(){const e=document.getElementById('email').value.trim();if(!e)return;const {error}=await sb.auth.resetPasswordForEmail(e);document.getElementById('authMsg').textContent=error?error.message:'Email di recupero inviata.'}
async function boot(){
 const {data:{session}}=await sb.auth.getSession();if(!session){user=null;renderAuth();return}
 user=session.user;
 const {data:p}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();profile=p||{full_name:user.user_metadata?.full_name||''};
 await loadAll();
 renderHome();
 setTimeout(autoGreeting,350);
 try{if(android()?.requestPushToken)android().requestPushToken()}catch(_){}
}
async function loadAll(){
 const uid=user.id;
 const [{data:m},{data:f},{data:r},{data:pc}]=await Promise.all([
   sb.from('medications').select('*,medication_schedules(*)').eq('patient_id',uid).eq('active',true).order('created_at',{ascending:false}),
   sb.from('followup_milestones').select('*').eq('patient_id',uid).order('due_date'),
   sb.from('medical_reports').select('*').eq('patient_id',uid).order('uploaded_at',{ascending:false}).limit(20),
   sb.from('patient_clinicians').select('clinician_id').eq('patient_id',uid).eq('active',true).limit(1).maybeSingle()
 ]);
 meds=m||[];followups=f||[];reports=r||[];doctor=pc?.clinician_id||null;doctorProfile=null;
 if(doctor){
   const [{data:pp},{data:dd}]=await Promise.all([sb.from('profiles').select('id,full_name').eq('id',doctor).maybeSingle(),sb.from('clinician_directory').select('*').eq('clinician_id',doctor).maybeSingle()]);
   doctorProfile={...(pp||{}),...(dd||{})};
 }
}
function todaySchedules(){
 const jsDay=new Date().getDay();
 return meds.flatMap(m=>(m.medication_schedules||[]).filter(s=>!s.weekdays||!s.weekdays.length||s.weekdays.includes(jsDay)).map(s=>({med:m,schedule:s}))).sort((a,b)=>String(a.schedule.time_of_day||'99').localeCompare(String(b.schedule.time_of_day||'99')));
}
function nextTherapy(){const now=new Date().toTimeString().slice(0,5);const t=todaySchedules();return t.find(x=>fmtTime(x.schedule.time_of_day)>=now)||t[0]||null}
function nextControl(){const t=todayISO();return followups.find(f=>!f.completed&&f.due_date>=t)||followups.find(f=>!f.completed)||null}
function renderHome(){
 const nt=nextTherapy(),nc=nextControl(),today=todaySchedules();
 const doctorName=doctorProfile?.display_name||doctorProfile?.full_name||'Nessun medico collegato';
 const specialty=doctorProfile?.specialty||'';
 const now=new Date(),date=now.toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
 root.innerHTML=shell(
 brand()+
 '<section class="greet"><div><h1>'+greetWord()+', '+esc(firstName())+'</h1><p>Ecco il riepilogo della tua giornata.</p></div><div class="date">'+esc(date)+'</div></section>'+
 '<section class="today card"><div class="sec-title"><h2>Oggi</h2><button class="link" data-nav="therapy">Vedi agenda ›</button></div><div class="today-grid"><div class="today-item"><div class="label">Prossima terapia</div><strong>'+esc(nt?fmtTime(nt.schedule.time_of_day):'—')+'</strong><div class="small">'+esc(nt?nt.med.name+' '+(nt.med.dose||''):'Nessuna terapia oggi')+'</div></div><div class="today-item"><div class="label">Prossimo controllo</div><strong style="font-size:19px">'+esc(nc?fmtDate(nc.due_date):'—')+'</strong><div class="small">'+esc(nc?nc.milestone_label:'Nessun controllo programmato')+'</div></div></div></section>'+
 '<section class="feature-grid">'+
 feature('💊','Terapie','Gestisci le tue terapie','therapy')+feature('▣','Controlli','Visite ed esami in programma','profile')+feature('▤','Referti','I tuoi referti e documenti','reports')+feature('✉','Messaggi','Comunica con il tuo medico','messages')+
 '</section>'+
 '<section class="checkin card"><h2>Come ti senti oggi?</h2><p>Seleziona come ti senti per aiutarti a seguire meglio la giornata.</p><div class="mood-grid"><button class="mood green" data-mood="green">☺ Bene</button><button class="mood yellow" data-mood="yellow">◉ Così così</button><button class="mood red" data-mood="red">☹ Non bene</button></div><div id="checkMsg"></div></section>'+
 '<section class="section card"><div class="sec-title"><h2>Farmaci da assumere oggi</h2><button class="link" data-nav="therapy">Vedi tutte ›</button></div><div class="list">'+(today.length?today.map(x=>'<div class="row"><div class="avatar" style="width:42px;height:42px;font-size:18px">💊</div><div class="grow"><strong>'+esc(x.med.name+' '+(x.med.dose||''))+'</strong><div class="meta">Oggi · '+esc(fmtTime(x.schedule.time_of_day))+(x.med.instructions?' · '+esc(x.med.instructions):'')+'</div></div><span>›</span></div>').join(''):'<div class="empty">Nessun farmaco programmato per oggi.</div>')+'</div></section>'+
 '<section class="section card"><div class="sec-title"><h2>Il tuo medico</h2><button class="link" data-nav="messages">Messaggi ›</button></div><div class="doctor"><div class="avatar">Dr</div><div class="grow"><strong>'+esc(doctorName)+'</strong><div class="meta">'+esc(specialty)+'</div></div><div class="actions"><button class="btn secondary" id="doctorMsg">Messaggio</button></div></div></section>'
 ,'home');
 bindNav();document.getElementById('refreshBtn').onclick=async()=>{await loadAll();renderHome()};
 document.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>submitMood(b.dataset.mood));
 const dm=document.getElementById('doctorMsg');if(dm)dm.onclick=()=>renderMessages();
}
function feature(ic,title,sub,to){return '<button class="feature" data-nav="'+to+'"><span class="ico">'+ic+'</span><span style="text-align:left"><strong>'+title+'</strong><span>'+sub+'</span></span></button>'}
async function submitMood(status){
 const box=document.getElementById('checkMsg');box.className='small';box.textContent='Salvataggio…';
 const {error}=await sb.rpc('submit_daily_checkin',{p_status:status,p_reasons:[],p_note:null});
 if(error){box.className='err';box.textContent=error.message;return}
 box.className='ok';box.textContent='Check-in di oggi registrato.';
}
function pageHeader(title){return '<div class="page-head"><button class="back" data-nav="home">‹</button><h1>'+esc(title)+'</h1></div>'}
function renderTherapies(){
 const rows=meds.map(m=>'<div class="row"><div class="avatar" style="width:44px;height:44px;font-size:18px">💊</div><div class="grow"><strong>'+esc(m.name+' '+(m.dose||''))+'</strong><div class="meta">'+esc(m.route||'')+(m.instructions?' · '+esc(m.instructions):'')+'</div><div class="meta">Orari: '+esc((m.medication_schedules||[]).map(s=>fmtTime(s.time_of_day)).join(', ')||'non indicati')+'</div></div></div>').join('');
 root.innerHTML=shell(pageHeader('Terapie')+'<section class="section card"><div class="sec-title"><h2>Terapie attive</h2></div><div class="list">'+(rows||'<div class="empty">Nessuna terapia attiva.</div>')+'</div></section>','therapy');bindNav()
}
function renderReports(){
 root.innerHTML=shell(pageHeader('Referti')+'<section class="section card"><div class="sec-title"><h2>I tuoi documenti</h2><label class="btn" for="reportFile">+ Aggiungi</label><input id="reportFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" class="hidden"></div><div id="reportMsg"></div><div class="list">'+(reports.length?reports.map(r=>'<button class="row open-report" data-path="'+esc(r.storage_path)+'"><div class="avatar" style="width:42px;height:42px;font-size:18px">▤</div><div class="grow" style="text-align:left"><strong>'+esc(r.title)+'</strong><div class="meta">'+esc(fmtDate(r.report_date||String(r.uploaded_at||'').slice(0,10)))+'</div></div><span>›</span></button>').join(''):'<div class="empty">Nessun referto caricato.</div>')+'</div></section>','reports');
 bindNav();document.getElementById('reportFile').onchange=e=>uploadReport(e.target.files?.[0]);document.querySelectorAll('.open-report').forEach(b=>b.onclick=()=>openReport(b.dataset.path))
}
async function uploadReport(file){
 if(!file)return;const msg=document.getElementById('reportMsg');msg.className='small';msg.textContent='Caricamento…';
 if(file.size>15*1024*1024){msg.className='err';msg.textContent='File troppo grande (max 15 MB).';return}
 const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=user.id+'/'+crypto.randomUUID()+'/'+safe;
 const up=await sb.storage.from('medical-reports').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
 if(up.error){msg.className='err';msg.textContent=up.error.message;return}
 const {error}=await sb.from('medical_reports').insert({patient_id:user.id,title:file.name,report_type:'Documento',report_date:todayISO(),storage_path:path,mime_type:file.type,file_size_bytes:file.size});
 if(error){await sb.storage.from('medical-reports').remove([path]);msg.className='err';msg.textContent=error.message;return}
 msg.className='ok';msg.textContent='Referto caricato.';await loadAll();renderReports()
}
async function openReport(path){const {data,error}=await sb.storage.from('medical-reports').createSignedUrl(path,300);if(error)return alert(error.message);if(android()?.openExternal)android().openExternal(data.signedUrl);else window.open(data.signedUrl,'_blank')}
async function loadMessages(){
 if(!doctor){messages=[];return}
 const uid=user.id;
 const {data}=await sb.from('chat_messages').select('*').or('and(sender_id.eq.'+uid+',recipient_id.eq.'+doctor+'),and(sender_id.eq.'+doctor+',recipient_id.eq.'+uid+')').order('sent_at');
 messages=data||[];
}
async function renderMessages(){
 await loadMessages();
 root.innerHTML=shell(pageHeader('Messaggi')+'<section class="section card"><div class="small" style="margin-bottom:10px">Conversazione con '+esc(doctorProfile?.display_name||doctorProfile?.full_name||'il tuo medico')+'</div><div class="chatbox" id="chatBox">'+(messages.length?messages.map(m=>'<div class="msg '+(m.sender_id===user.id?'mine':'')+'">'+esc(m.body)+'<div class="time">'+esc(new Date(m.sent_at).toLocaleString('it-IT'))+'</div></div>').join(''):'<div class="empty">Nessun messaggio.</div>')+'</div><div class="composer"><textarea id="chatText" rows="2" placeholder="Scrivi un messaggio…"></textarea><button class="btn" id="sendMsg">Invia</button></div><div id="chatErr"></div></section>','messages');
 bindNav();const box=document.getElementById('chatBox');box.scrollTop=box.scrollHeight;document.getElementById('sendMsg').onclick=sendMessage
}
async function sendMessage(){
 const body=document.getElementById('chatText').value.trim(),e=document.getElementById('chatErr');if(!body)return;if(!doctor){e.className='err';e.textContent='Nessun medico collegato.';return}
 const {error}=await sb.from('chat_messages').insert({sender_id:user.id,recipient_id:doctor,body,is_read:false});
 if(error){e.className='err';e.textContent=error.message;return}
 renderMessages()
}
function renderProfile(){
 const nc=nextControl();
 root.innerHTML=shell(pageHeader('Profilo')+'<section class="section card"><div class="doctor"><div class="avatar">'+esc((firstName()[0]||'U').toUpperCase())+'</div><div><strong>'+esc(profile?.full_name||user.email)+'</strong><div class="meta">'+esc(user.email)+'</div></div></div></section><section class="section card"><div class="sec-title"><h2>Prossimi controlli</h2></div><div class="list">'+(followups.filter(x=>!x.completed).length?followups.filter(x=>!x.completed).map(x=>'<div class="row"><div class="grow"><strong>'+esc(x.milestone_label)+'</strong><div class="meta">'+esc(fmtDate(x.due_date))+' · '+esc(x.milestone_type||'Controllo')+'</div></div></div>').join(''):'<div class="empty">Nessun controllo programmato.</div>')+'</div></section><section class="section card"><div class="row"><div class="grow"><strong>Saluto vocale all’apertura</strong><div class="meta">Medi ti saluta una sola volta per sessione.</div></div><button class="btn secondary" id="testVoice">Prova</button></div><div class="row" style="margin-top:8px"><div class="grow"><strong>Suono promemoria terapia</strong><div class="meta">Sirena breve Meditaly.</div></div><button class="btn secondary" id="soundToggle">Gestisci</button></div><button class="btn outline full" id="logoutBtn" style="margin-top:14px">Esci</button></section>','profile');
 bindNav();document.getElementById('testVoice').onclick=()=>speak(greetWord()+' '+firstName()+'. Come ti senti oggi?');document.getElementById('soundToggle').onclick=()=>{try{if(android()?.toggleTherapySiren){const on=android().toggleTherapySiren();alert(on?'Suono terapia attivo.':'Suono terapia disattivato.')}else alert('Impostazione disponibile nell’app Android.')}catch(e){alert(e.message)}};document.getElementById('logoutBtn').onclick=async()=>{await sb.auth.signOut();renderAuth()}
}
function openMedi(){
 document.body.insertAdjacentHTML('beforeend','<div class="modal" id="mediModal"><div class="sheet"><div class="medi-big"><span class="medi-robot"><i class="medi-ant"></i><i class="medi-head"><i class="medi-mouth"></i></i></span><div><h2 style="margin:0">Chiedi a Medi</h2><div class="small">Assistente Meditaly</div></div></div><p>Per questa beta Medi può guidarti nell’app e leggere le informazioni già presenti. Non fa diagnosi e non modifica le terapie.</p><div class="notice">Esempio: “Qual è la prossima terapia?” oppure “Quando ho il prossimo controllo?”</div><div style="display:flex;gap:8px"><button class="btn" id="mediSpeak">🎙 Ascolta il riepilogo</button><button class="btn secondary" id="mediClose">Chiudi</button></div></div></div>');
 document.getElementById('mediClose').onclick=()=>document.getElementById('mediModal').remove();
 document.getElementById('mediSpeak').onclick=()=>{const nt=nextTherapy(),nc=nextControl();let t=greetWord()+' '+firstName()+'. ';t+=nt?'La prossima terapia è '+nt.med.name+' alle '+fmtTime(nt.schedule.time_of_day)+'. ':'Non risultano terapie programmate per oggi. ';if(nc)t+='Il prossimo controllo è '+nc.milestone_label+' il '+fmtDate(nc.due_date)+'.';speak(t)}
}
function autoGreeting(){
 try{const key='meditaly_greeted_'+user.id;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');speak(greetWord()+' '+firstName()+'. Come ti senti oggi?')}catch(_){}
}
window.meditalyPushToken=async token=>{try{if(!user||!token)return;await sb.rpc('register_my_push_token',{p_token:token,p_platform:'android'})}catch(_){}};
window.meditalyOpenRoute=route=>{if(route==='messages')renderMessages();else if(route==='therapy')renderTherapies();else renderHome()};
boot().catch(e=>renderAuth(e.message||String(e)));
})();