async function importLegacyJournal(){
 const response=await fetch('migration-data/manifest.json');if(!response.ok)throw new Error('Archivio diario mancante');const rows=await response.json();
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('meditaly-private-journal',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('entries'))r.result.createObjectStore('entries',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{for(const entry of rows){const row={...entry};
  if(row.media_file){const media=await fetch('migration-data/'+encodeURIComponent(row.media_file));if(!media.ok)throw new Error('Registrazione diario mancante');const bytes=await media.arrayBuffer();if(bytes.byteLength!==row.media_bytes)throw new Error('Registrazione diario incompleta');row.media=new Blob([bytes],{type:row.media_mime||'application/octet-stream'});}else row.media=null;
  delete row.media_file;delete row.media_bytes;
  await new Promise((resolve,reject)=>{const tx=db.transaction('entries','readwrite'),store=tx.objectStore('entries'),existing=store.get(row.id);existing.onsuccess=()=>{if(!existing.result)store.put(row);};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
 }}finally{db.close();}
}
