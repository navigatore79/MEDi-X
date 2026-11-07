window.MediImaging=(()=>{
 let modulePromise;
 const viewer=()=>modulePromise||=import('./imaging-viewer-dist/viewer.js');
 async function render(db,host,uid,current){
  host.replaceChildren();const title=document.createElement('h2');title.textContent='Prestazioni del centro';host.append(title);
  const local=document.createElement('input');local.type='file';local.accept='.zip,application/zip';local.hidden=true;
  const openLocal=document.createElement('button');openLocal.className='btn secondary';openLocal.textContent='Apri ZIP dal telefono';
  openLocal.onclick=()=>local.click();local.onchange=async()=>{const file=local.files?.[0];if(!file)return;openLocal.disabled=true;try{const mod=await viewer();const assets=await mod.readLocalZip(file);if(current())await openViewer(db,uid,'Esame dal telefono',assets);}catch(e){if(current())alert(e.message);}finally{openLocal.disabled=false;local.value='';}};host.append(openLocal,local);
  const note=document.createElement('p');note.textContent='Lo ZIP aperto dal telefono resta sul dispositivo e non viene inviato al centro.';host.append(note);
  const result=await db.rpc('imaging_patient_list');if(!current())return;
  if(result.error){const p=document.createElement('p');p.textContent='Prestazioni online non disponibili. Riprova con la connessione.';host.append(p);return;}
  if(!result.data.length){const p=document.createElement('p');p.textContent='Nessuna prestazione ricevuta dal centro.';host.append(p);}
  for(const d of result.data){const card=document.createElement('article');card.className='card card-pad';const h=document.createElement('h3');h.textContent=d.title;const p=document.createElement('p');p.textContent=d.center+' · '+(d.study_date||'');const b=document.createElement('button');b.className='btn';b.textContent='Apri referto e immagini';card.append(h,p,b);host.append(card);
   b.onclick=async()=>{b.disabled=true;try{
    const fetchAssets=async()=>{const r=await db.functions.invoke('imaging-access',{body:{id:d.id}});if(r.error)throw new Error('Impossibile aprire la prestazione. Verifica l’accesso e riprova.');return r.data.assets;};
    const descriptors=await fetchAssets();if(!current())return;
    const assets=descriptors.map(a=>({...a,getBlob:async()=>{if((await db.auth.getUser()).data.user?.id!==uid)throw new Error('Accesso terminato.');const fresh=await fetchAssets(),found=fresh.find(x=>x.id===a.id);if(!found)throw new Error('Documento non disponibile.');const r=await fetch(found.url,{cache:'no-store',credentials:'omit'});if(!r.ok)throw new Error('Download non completato.');return r.blob();}}));
    await openViewer(db,uid,d.title,assets);
   }catch(e){if(current())alert(e.message);}finally{b.disabled=false;}};
  }
 }
 async function openViewer(db,uid,title,assets){
  const dialog=document.createElement('dialog');dialog.style.cssText='width:94vw;max-width:1000px;max-height:95vh;border:0;border-radius:18px;padding:16px;box-sizing:border-box';
  const close=document.createElement('button');close.className='btn';close.textContent='Chiudi';close.onclick=()=>dialog.close();
  const heading=document.createElement('h2');heading.textContent=title;const content=document.createElement('div'),message=document.createElement('p');message.role='status';dialog.append(close,heading,content,message);
  const urls=[],tasks=[];let dispose,closed=false;
  const listener=db.auth.onAuthStateChange((_event,session)=>{if(session?.user.id!==uid)dialog.close();});
  dialog.onclose=()=>{closed=true;dispose?.();urls.forEach(URL.revokeObjectURL);listener.data.subscription.unsubscribe();dialog.remove();};document.body.append(dialog);dialog.showModal();
  for(const asset of assets.filter(a=>a.kind==='report')){const b=document.createElement('button');b.className='btn secondary';b.textContent='Leggi referto PDF';content.append(b);b.onclick=async()=>{b.disabled=true;try{const blob=await asset.getBlob();if(closed)return;if(window.AndroidBridge?.openOfflinePdf){const bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));AndroidBridge.openOfflinePdf(btoa(s));}else{const url=URL.createObjectURL(blob);urls.push(url);const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent='Apri PDF';content.append(a);a.click();}}catch(e){message.textContent=e.message;}finally{b.disabled=false;}};}
  const dicoms=assets.filter(a=>a.kind==='dicom'||!a.kind);
  if(dicoms.length){const panel=document.createElement('div');content.append(panel);message.textContent='Preparazione delle immagini…';try{const mod=await viewer();if(closed)return;dispose=await mod.openDicom(panel,dicoms);if(closed)dispose();else message.textContent='Visualizzazione per consultazione personale. Per l’interpretazione delle immagini rivolgiti al medico.';}catch{if(!closed)message.textContent='Il dispositivo non riesce a visualizzare questa serie. Il referto resta consultabile.';}}
 }
 return{render};
})();
