/* Per-account offline data. No cached permissions are used to authorize server writes. */
window.MeditalyOffline=(()=>{
 let user=null,flight=null;const running=new Map();const handlers=new Map(),allowed=new Set(['profiles','patient_care_contacts','patient_screening_profiles','patient_clinicians','patient_monitoring_settings','patient_daily_checkins','medications','medication_schedules','medication_intakes','followup_milestones','medical_reports','medical_report_files','care_questionnaire_assignments','care_questionnaire_responses','patient_chronic_conditions','patient_vaccine_declarations','notifications']);
 const database=new Promise((resolve,reject)=>{const r=indexedDB.open('meditaly-offline-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('entries');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const access=async(mode,fn)=>{const db=await database;return new Promise((resolve,reject)=>{const t=db.transaction('entries',mode),r=fn(t.objectStore('entries'));t.oncomplete=()=>resolve(r.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Salvataggio locale interrotto'));});};
 const key=(uid,k)=>uid+':'+k;
 const getFor=(uid,k)=>access('readonly',s=>s.get(key(uid,k)));
 const putFor=(uid,k,v)=>access('readwrite',s=>s.put(v,key(uid,k)));
 const removeFor=(uid,k)=>access('readwrite',s=>s.delete(key(uid,k)));
 const entriesFor=async(uid,prefix)=>{const db=await database;return new Promise((resolve,reject)=>{const out=[],r=db.transaction('entries').objectStore('entries').openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return resolve(out);if(String(c.key).startsWith(key(uid,prefix)))out.push({key:String(c.key).slice(uid.length+1),value:c.value});c.continue();};r.onerror=()=>reject(r.error);});};
 // Receipt and removal must compare the revision in the same transaction.
 const acknowledge=async(uid,k,job,receipt)=>{const db=await database;return new Promise((resolve,reject)=>{let committed=false;const t=db.transaction('entries','readwrite'),store=t.objectStore('entries'),r=store.get(key(uid,k));r.onsuccess=()=>{if(r.result?.revision!==job.revision)return;store.put({at:new Date().toISOString(),receipt},key(uid,'receipt:'+job.id));store.delete(key(uid,k));committed=true;};t.oncomplete=()=>resolve(committed);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Conferma locale interrotta'));});};
 const signal=()=>{window.dispatchEvent(new CustomEvent('meditaly-offline-change'));void banner();};
 async function banner(){
  const uid=user;if(!uid)return;let pending=[];try{pending=await entriesFor(uid,'job:');}catch{return;}if(uid!==user||typeof document==='undefined')return;
  let el=document.getElementById('offlineStatus');if(!el){el=document.createElement('aside');el.id='offlineStatus';el.setAttribute('role','status');document.body.append(el);}
  el.hidden=navigator.onLine!==false&&!pending.length;
  el.textContent=(navigator.onLine===false?'Senza rete · dati salvati sul telefono':flight?'Sincronizzazione in corso…':'Connessione disponibile')+(pending.length?` · ${pending.length} invii in attesa`:'');
  for(const {value:job} of pending){const error=!handlers.has(job.kind)?'Questo invio richiede una versione aggiornata dell’app.':job.error;if(error){const detail=document.createElement('p');detail.textContent=error+' I dati restano conservati sul telefono.';el.append(detail);}}
  if(pending.length){const button=document.createElement('button');button.type='button';button.textContent=flight?'Sincronizzazione…':'Sincronizza';button.disabled=!!flight||navigator.onLine===false;button.onclick=()=>{void pump().catch(()=>{el.append(' Sincronizzazione non riuscita. I dati restano sul telefono.');});};el.append(' ',button);}
 }
 async function pump(){
  if(flight)return flight;if(!user||navigator.onLine===false)return;const uid=user;
  flight=(async()=>{
   const attempted=new Set();
   while(user===uid&&navigator.onLine!==false){
    const jobs=(await entriesFor(uid,'job:')).filter(x=>handlers.has(x.value.kind)&&!attempted.has(x.value.revision)&&!running.has(key(uid,x.key)));if(!jobs.length)break;
    for(const {key:k,value:job} of jobs){
     if(user!==uid||navigator.onLine===false)return;attempted.add(job.revision);
     const runKey=key(uid,k);
     const operation=(async()=>{
      try{const receipt=await handlers.get(job.kind)(job.payload,uid);if(user!==uid)return;
       if(await acknowledge(uid,k,job,receipt)){
        window.dispatchEvent(new CustomEvent('meditaly-offline-sent',{detail:{id:job.id,kind:job.kind,receipt}}));}
      }catch(e){const latest=await getFor(uid,k);if(latest?.revision===job.revision)await putFor(uid,k,{...job,error:String(e.message||e),lastAttempt:new Date().toISOString()});}
     })().finally(()=>{running.delete(runKey);signal();});
     running.set(runKey,operation);
     let timer;try{await Promise.race([operation,new Promise(resolve=>{timer=setTimeout(async()=>{try{const latest=await getFor(uid,k);if(latest?.revision===job.revision)await putFor(uid,k,{...latest,error:'Il server non ha ancora confermato questo invio. Non verrà inviato di nuovo finché la richiesta è in corso.',lastAttempt:new Date().toISOString()});}catch{ /* The local queue remains untouched if storage is unavailable. */ }finally{resolve();}},20000);})]);}finally{clearTimeout(timer);}
    }
   }
  })().finally(()=>{flight=null;signal();if(user&&user!==uid)void pump();});void banner();return flight;
 }
 function wrapClient(sb,getUid){const from=sb.from.bind(sb);sb.from=table=>{const wrap=builder=>new Proxy(builder,{get(target,prop){if(prop==='then')return (ok,bad)=>{const uid=getUid(),cacheKey='query:'+target.url.toString();return (async()=>{const cached=uid&&allowed.has(table)&&target.method==='GET'?await getFor(uid,cacheKey).catch(()=>null):null;if(navigator.onLine===false&&cached&&Date.now()-cached.at<30*86400000)return {...cached.result,offline:true,cachedAt:cached.at};let result;try{result=await target;}catch(e){if(cached&&navigator.onLine===false)return {...cached.result,offline:true,cachedAt:cached.at};throw e;}if(!result.error&&uid&&target.method==='GET'&&allowed.has(table))await putFor(uid,cacheKey,{at:Date.now(),result}).catch(()=>{});if(result.error&&cached&&(result.status===0||navigator.onLine===false)&&Date.now()-cached.at<30*86400000)return {...cached.result,offline:true,cachedAt:cached.at};return result;})().then(ok,bad);};const value=Reflect.get(target,prop,target);return typeof value==='function'? (...args)=>{const next=value.apply(target,args);return next&&typeof next.then==='function'?wrap(next):next;}:value;}});return wrap(from(table));};}
 window.addEventListener('online',()=>{signal();void pump();});window.addEventListener('offline',signal);
 return {wrapClient,setUser(uid){user=uid;void banner();if(!uid)document.getElementById('offlineStatus')?.remove();},get:k=>user?getFor(user,k):Promise.resolve(null),put:(k,v)=>{if(!user)return Promise.reject(new Error('Accesso richiesto'));return putFor(user,k,v);},remove:k=>user?removeFor(user,k):Promise.resolve(),list:prefix=>user?entriesFor(user,prefix):Promise.resolve([]),register(kind,fn){handlers.set(kind,fn);},async enqueue(kind,id,payload){if(!user)throw new Error('Accesso richiesto');const uid=user;await putFor(uid,'job:'+id,{id,kind,payload,revision:crypto.randomUUID(),createdAt:new Date().toISOString()});signal();},pump,banner};
})();
