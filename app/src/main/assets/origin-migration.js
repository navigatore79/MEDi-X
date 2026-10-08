(async function(){
 const status=document.querySelector('p');
 const dataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
 try{
  if(!AndroidBridge.beginJournalOriginMigration())throw new Error('Archivio locale non disponibile.');
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('meditaly-private-journal',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('entries'))r.result.createObjectStore('entries',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  // Fetch metadata/Blob handles, then transfer one media file at a time in bounded chunks.
  const rows=await new Promise((resolve,reject)=>{const tx=db.transaction('entries','readonly'),r=tx.objectStore('entries').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();
  for(let i=0;i<rows.length;i++){
   const row=rows[i],metadata={...row};delete metadata.media;
   status.textContent=`Conservo il diario sul dispositivo… ${i+1}/${rows.length}`;
   if(row.media){metadata.media_file=row.id+'.bin';metadata.media_bytes=row.media.size;metadata.media_mime=row.media_mime||row.media.type;
    for(let offset=0;offset<row.media.size;offset+=196608){const chunk=await dataUrl(row.media.slice(offset,offset+196608));if(!AndroidBridge.writeJournalOriginChunk(row.id,offset,chunk))throw new Error('Spazio insufficiente per conservare il diario.');}
   }
   if(!AndroidBridge.addJournalOriginEntry(JSON.stringify(metadata)))throw new Error('Pagina del diario non trasferita.');
  }
  if(!AndroidBridge.finishJournalOriginExport())throw new Error('Archivio del diario incompleto.');
  const storage={};if(AndroidBridge.shouldCopyLegacyStorage())for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);storage[key]=localStorage.getItem(key);}
  AndroidBridge.migrateLocalOrigin(JSON.stringify(storage));
 }catch(e){status.textContent='Non riesco a completare l’aggiornamento. Il diario originale è ancora sul dispositivo. Libera spazio e riapri Meditaly. '+(e.message||'');}
})();
