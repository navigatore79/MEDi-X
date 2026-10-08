let meditalyHealthRequest='',meditalyDeviceUser='',meditalyConnectPending=false,meditalyHealthCount=0;
const meditalyHealthLabels={pressure:'Pressione',heart:'Frequenza cardiaca',resting:'Battito a riposo',oxygen:'Saturazione',glucose:'Glicemia',temperature:'Temperatura',respiration:'Frequenza respiratoria',weight:'Peso',height:'Altezza',fat:'Massa grassa',hrv:'Variabilità cardiaca (RMSSD)',steps:'Passi di oggi',distance:'Distanza di oggi',calories:'Calorie attive di oggi',sleep:'Sonno nelle ultime 24 ore'};
async function patientDevices(){
 meditalyHealthRequest=crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');meditalyDeviceUser=state.session?.user.id||'';meditalyConnectPending=false;meditalyHealthCount=0;
 content.innerHTML=`<section class="page-title"><button class="back-link" id="deviceBack">‹ Home</button><h1>I miei dati di salute</h1><p>Il telefono e i tuoi dispositivi, in un unico posto.</p></section><div class="device-layout"><section class="card health-connect-card"><div class="health-connect-symbol" aria-hidden="true">♡</div><h2>Collega. Ritrova le tue misure.</h2><p>Accendi il tuo dispositivo e tienilo vicino. Meditaly raccoglie i dati condivisi dalle app di salute e cerca i misuratori compatibili.</p><button class="btn" id="phoneHealthConnect">Collega i miei dati di salute</button><p id="phoneHealthStatus" role="status">Scegli tu quali dati autorizzare nelle schermate di Android.</p><div class="health-metrics" id="phoneHealthMetrics" aria-live="polite"></div><div id="bleDiscovery" hidden><h3>È il tuo dispositivo?</h3><p class="small">Tocca il suo nome per collegarlo, poi esegui la misurazione.</p><div id="bleList"></div></div><p id="bleStatus" class="small" role="status"></p><div id="bleMeasurements" class="health-metrics" aria-live="polite"></div><p class="device-note">Mostriamo solo le misure disponibili, con data e provenienza. Restano visibili in questa sessione; non vengono inviate automaticamente al medico.</p><details class="device-help"><summary>Manca un dato o un dispositivo?</summary><p>Per gli orologi e i dispositivi che usano l’app del produttore, associa il dispositivo in quell’app e attiva la condivisione con Health Connect, se disponibile. Poi torna qui e premi il pulsante.</p><p>Leggiamo pressione, battito, saturazione, glicemia, temperatura, respirazione, peso, altezza, massa grassa, variabilità cardiaca, passi, distanza, calorie attive e sonno, quando condivisi e autorizzati. Le misure istantanee mostrano l’ultimo valore degli ultimi 7 giorni; attività e passi sono di oggi, sonno delle ultime 24 ore.</p><p>La ricerca diretta mostra misuratori che dichiarano i servizi Bluetooth standard di pressione o battito. Altri modelli possono richiedere la propria app. Non è necessario scegliere tra diversi metodi di collegamento.</p><button class="btn secondary" id="phoneHealthSettings">Gestisci autorizzazioni</button><button class="btn secondary" id="bleSettings">Impostazioni Bluetooth</button><button class="btn secondary" id="bleDisconnect">Disconnetti misuratore</button></details></section></div>`;
 const bridge=window.AndroidBridge;
 document.getElementById('deviceBack').onclick=()=>{bridge?.cancelPhoneHealth?.();bridge?.stopBleScan?.();bridge?.disconnectBleDevice?.();meditalyHealthRequest='';meditalyConnectPending=false;state.tab='home';patientView();};
 document.getElementById('phoneHealthConnect').onclick=()=>{if(!bridge?.connectPhoneHealth){document.getElementById('phoneHealthStatus').textContent='Apri questa funzione nella nuova app Android.';return;}meditalyConnectPending=true;document.getElementById('phoneHealthConnect').disabled=true;document.getElementById('phoneHealthStatus').textContent='Avvio il collegamento…';document.getElementById('bleList').replaceChildren();document.getElementById('bleDiscovery').hidden=true;bridge.connectPhoneHealth(meditalyHealthRequest);};
 document.getElementById('phoneHealthSettings').onclick=()=>bridge?.phoneHealthSettings?.();
 document.getElementById('bleSettings').onclick=()=>bridge?.openBluetoothSettings?.();
 document.getElementById('bleDisconnect').onclick=()=>{bridge?.disconnectBleDevice?.();document.getElementById('bleMeasurements').replaceChildren();};
 if(bridge?.phoneHealthAvailability)bridge.phoneHealthAvailability(meditalyHealthRequest);
 if(bridge?.readPhoneHealth)bridge.readPhoneHealth(meditalyHealthRequest);
}
function meditalyDevicePageActive(){return state.tab==='devices'&&meditalyDeviceUser===(state.session?.user.id||'');}
function meditalyMeasurementDetails(e){const date=e.time?new Date(e.time):null;return (date&&!isNaN(date)?date.toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})+' · ':'')+(e.source||'Fonte non indicata');}
function meditalyStartDeviceSearch(){const pending=meditalyConnectPending;meditalyConnectPending=false;const button=document.getElementById('phoneHealthConnect');if(button)button.disabled=false;if(pending)window.AndroidBridge?.scanBleDevices?.(meditalyHealthRequest);}
window.onMeditalyPhoneHealth=e=>{
 if(!meditalyDevicePageActive()||e.requestId!==meditalyHealthRequest)return;
 const status=document.getElementById('phoneHealthStatus'),grid=document.getElementById('phoneHealthMetrics');if(!status||!grid)return;
 if(e.type==='availability')status.textContent=e.message;
 if(e.type==='install'){status.textContent=e.message;document.getElementById('phoneHealthConnect').disabled=false;}
 if(e.type==='start'){grid.replaceChildren();meditalyHealthCount=0;status.textContent=e.message;}
 if(e.type==='error'){status.textContent=e.message;grid.replaceChildren();meditalyHealthCount=0;meditalyStartDeviceSearch();}
 if(e.type==='done'){status.textContent=e.count?`${e.count} tipi di dati disponibili. Puoi aggiornare e cercare nuovi dispositivi con lo stesso pulsante.`:'Nessuna misura condivisa per ora. Controlla la condivisione nell’app del tuo dispositivo.';meditalyStartDeviceSearch();}
 if(e.type==='metric'){
  if(!meditalyHealthLabels[e.metric])return;let card=[...grid.children].find(n=>n.dataset.health===e.metric);
  if(e.state!=='ok'){card?.remove();return;}
  if(!card){card=document.createElement('div');card.className='health-metric';card.dataset.health=e.metric;card.innerHTML='<strong></strong><b></b><small></small>';grid.append(card);}
  card.querySelector('strong').textContent=meditalyHealthLabels[e.metric];card.querySelector('b').textContent=e.value+' '+e.unit;card.querySelector('small').textContent=meditalyMeasurementDetails(e);
 }
};
window.onMeditalyBleEvent=e=>{
 if(!meditalyDevicePageActive()||e.requestId!==meditalyHealthRequest)return;const status=document.getElementById('bleStatus'),list=document.getElementById('bleList');if(!status||!list)return;
 if(e.type==='device'){
  if([...list.children].some(x=>x.dataset.address===e.address))return;
  const b=document.createElement('button');b.type='button';b.className='ble-device-row';b.dataset.address=e.address;
  const copy=document.createElement('span'),name=document.createElement('strong'),hint=document.createElement('small'),action=document.createElement('span');name.textContent=e.name||'Misuratore';hint.textContent=(e.kind||'Misuratore compatibile')+' · '+String(e.address||'').slice(-5);action.textContent='Collega ›';copy.append(name,hint);b.append(copy,action);b.onclick=()=>window.AndroidBridge?.connectBleDevice?.(e.address);list.append(b);document.getElementById('bleDiscovery').hidden=false;
 }else if(e.type==='services'){status.textContent=e.supported?.length?'Dispositivo riconosciuto. Attivo la lettura…':'Questo dispositivo richiede la propria app.';}
 else if(e.type==='measurement'){
  const grid=document.getElementById('bleMeasurements');let card=[...grid.children].find(x=>x.dataset.metric===e.metric);
  if(!card){card=document.createElement('div');card.className='health-metric';card.dataset.metric=e.metric;card.innerHTML='<strong></strong><b></b><small></small>';grid.append(card);}
  card.querySelector('strong').textContent=e.metric==='pressure'?'Pressione dal misuratore':'Battito dal misuratore';card.querySelector('b').textContent=e.value+' '+e.unit;card.querySelector('small').textContent=meditalyMeasurementDetails(e)+(e.pulse?' · polso '+e.pulse+' bpm':'')+' · ora di ricezione';status.textContent='Misuratore collegato. Misura ricevuta.';
 }else status.textContent=e.message||'Bluetooth aggiornato.';
};
