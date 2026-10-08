/* Compact, accessible Home additions. Values stay on this device. */
let meditalyTipTimer=null;
let meditalyNewsTimer=null;
function meditalyBmiGuidance(bmi,adult){
 const diet='https://www.who.int/news-room/fact-sheets/detail/healthy-diet';
 const obesity='https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight';
 if(adult===null)return {title:'BMI: serve la data di nascita',body:'Indica la data di nascita nel profilo per vedere la fascia BMI appropriata. Le soglie degli adulti non sono adatte ai minori.',url:'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight',link:'Interpretazione del BMI · OMS'};
 if(!adult)return {title:'BMI: interpretazione per età',body:'Le fasce BMI indicate per gli adulti non si applicano direttamente ai minori. Chiedi al medico di valutare crescita e misure con riferimenti adatti all’età.',url:'https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age',link:'Riferimenti OMS per età'};
 if(bmi<18.5)return {title:'Fascia BMI: sottopeso',body:'Sotto 18,5. Una dieta equilibrata deve rispondere ai bisogni individuali: se il peso è basso o è diminuito, confrontati con il medico per una valutazione personale.',url:diet,link:'Alimentazione sana · OMS'};
 if(bmi<25)return {title:'Fascia BMI: normopeso',body:'Tra 18,5 e 24,9. Per una dieta equilibrata, l’OMS raccomanda varietà alimentare e, sopra i 10 anni, almeno 400 g di frutta e verdura al giorno.',url:diet,link:'Alimentazione sana · OMS'};
 if(bmi<30)return {title:'Fascia BMI: sovrappeso',body:'Da 25 a 29,9. Alimentazione varia e attività fisica regolare sono indicazioni generali dell’OMS. Concorda eventuali obiettivi di peso con il medico.',url:obesity,link:'Sovrappeso e obesità · OMS'};
 return {title:'Fascia BMI: obesità',body:'Da 30. L’OMS descrive l’obesità come condizione complessa. Parlane con il medico per valutare il quadro complessivo e un percorso adatto a te.',url:obesity,link:'Sovrappeso e obesità · OMS'};
}
function meditalyHomeExtras({province,city}){
 const anchor=document.querySelector('.home-today-plan');
 if(!anchor)return;
 anchor.insertAdjacentHTML('beforebegin',`
  <section class="who-tips who-ticker" aria-label="Consigli OMS"><strong class="who-ticker-label">OMS</strong><div class="who-ticker-window"><div id="whoTip" class="who-ticker-track"></div></div><button type="button" class="who-ticker-pause" aria-label="Ferma lo scorrimento dei consigli OMS" aria-pressed="false">Ⅱ</button></section>
  <section class="home-measures"><div class="row between"><div><span class="eyebrow dark">LE TUE MISURE</span><h2>Peso e altezza</h2></div><span id="measuresSummary"></span></div><div class="measure-inputs"><label>Peso · kg<input class="input" id="measureWeight" type="number" min="10" max="500" step="0.1" inputmode="decimal" placeholder="es. 70"></label><label>Altezza · cm<input class="input" id="measureHeight" type="number" min="50" max="250" step="0.1" inputmode="decimal" placeholder="es. 170"></label></div><details class="measure-details"><summary>Vedi i calcoli BMI e BSA</summary><div id="measureResults" class="measure-results">Inserisci peso e altezza per vedere i calcoli.</div></details><div id="measureGuidance" class="measure-guidance" aria-live="polite"></div><p class="small muted measure-caveat">Il BMI è un indicatore orientativo: non descrive da solo la salute individuale e va interpretato con il medico, soprattutto in gravidanza o in presenza di altre condizioni.</p></section>
  <section class="local-health-news"><span class="eyebrow dark">NOTIZIE DEL TERRITORIO</span><h2>Sanità vicino a te</h2><div id="healthNews" aria-live="polite"><p class="muted">Cerco una notizia da una fonte sanitaria ufficiale…</p></div></section>`);
 const tips=[
  {title:'Muoviti con regolarità',body:'Per gli adulti, l’OMS raccomanda 150–300 minuti a settimana di attività aerobica moderata, secondo le proprie possibilità.',url:'https://www.who.int/europe/news-room/fact-sheets/item/physical-activity'},
  {title:'Più frutta e verdura',body:'Per le persone sopra i 10 anni, l’OMS indica almeno 400 g al giorno di frutta e verdura.',url:'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'},
  {title:'Attenzione al sale',body:'Per gli adulti, l’OMS consiglia meno di 5 g di sale al giorno complessivi.',url:'https://www.who.int/news-room/fact-sheets/detail/sodium-reduction'}
 ];
 const box=document.getElementById('whoTip');
 box.innerHTML=tips.map(t=>`<a href="${t.url}" target="_blank" rel="noopener noreferrer"><strong>${esc(t.title)}</strong> · ${esc(t.body)} <span>Fonte OMS ↗</span></a>`).join('');
 clearInterval(meditalyTipTimer);
 const ticker=box.closest('.who-ticker'),pause=ticker.querySelector('.who-ticker-pause');
 pause.onclick=()=>{const paused=ticker.classList.toggle('paused');pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Riprendi lo scorrimento dei consigli OMS':'Ferma lo scorrimento dei consigli OMS');pause.textContent=paused?'▶':'Ⅱ';};
 const key=`meditaly-measures-${state.session.user.id}`;let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
 const w=document.getElementById('measureWeight'),h=document.getElementById('measureHeight');w.value=saved.weight||'';h.value=saved.height||'';
 const birth=state.profile?.date_of_birth,now=new Date(),born=birth?new Date(birth+'T12:00:00'):null;
 const adult=born&&!Number.isNaN(born.getTime())?(now.getFullYear()-born.getFullYear()-(now.getMonth()<born.getMonth()||(now.getMonth()===born.getMonth()&&now.getDate()<born.getDate())?1:0))>=18:null;
 const measure=()=>{const weight=Number(w.value),height=Number(h.value),result=document.getElementById('measureResults'),summary=document.getElementById('measuresSummary'),guidance=document.getElementById('measureGuidance');if(!(weight>=10&&weight<=500&&height>=50&&height<=250)){result.textContent='Inserisci peso e altezza validi per vedere i calcoli.';summary.textContent='';guidance.innerHTML='';localStorage.removeItem(key);return}const bmi=weight/((height/100)**2),bsa=Math.sqrt(weight*height/3600),advice=meditalyBmiGuidance(bmi,adult);result.innerHTML=`<div><strong>BMI ${bmi.toFixed(2)}</strong><small>kg/m²</small></div><div><strong>BSA ${bsa.toFixed(2)}</strong><small>m² · formula di Mosteller</small></div>`;summary.textContent=`BMI ${bmi.toFixed(2)}`;guidance.innerHTML=`<strong>${esc(advice.title)}</strong><p>${esc(advice.body)}</p><a href="${advice.url}" target="_blank" rel="noopener noreferrer">Leggi la fonte: ${esc(advice.link)} ↗</a>`;localStorage.setItem(key,JSON.stringify({weight,height}))};
 w.oninput=measure;h.oninput=measure;measure();
 meditalyLocalNews(province,city);
 clearTimeout(meditalyNewsTimer);
 const newsKey=`meditaly-health-news-${String(province||'').toUpperCase()}`;
 let lastCheck=0;try{lastCheck=JSON.parse(localStorage.getItem(newsKey)||'null')?.checkedAt||0}catch{}
 meditalyNewsTimer=setTimeout(()=>{if(state.tab==='home'&&document.getElementById('healthNews'))meditalyLocalNews(province,city)},Math.max(60000,6*60*60*1000-(Date.now()-lastCheck)+5000));
}
async function meditalyLocalNews(province,city){
 const box=document.getElementById('healthNews');if(!box)return;
 const region=String(province||'').toUpperCase()==='NA'?'Campania':'';
 const cacheKey=`meditaly-health-news-${String(province||'').toUpperCase()}`;
 const render=item=>{if(!box.isConnected)return;
  let url;try{url=new URL(item.url);if(url.protocol!=='https:')throw new Error();}catch{return;}
  box.innerHTML=`<strong>${esc(item.title)}</strong><p class="muted">${esc(item.source)}</p><button type="button" class="btn secondary" id="newsReadInside">Leggi qui</button> <a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Apri sul sito ↗</a><div id="newsInside"></div>`;
  box.querySelector('#newsReadInside').onclick=()=>{
   const target=box.querySelector('#newsInside');if(target.firstChild){target.replaceChildren();return;}
   const frame=document.createElement('iframe');frame.className='news-frame';frame.title=item.title;frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups');frame.src=url.href;
   target.append(frame);const note=document.createElement('p');note.className='small muted';note.textContent='Se il sito impedisce la lettura nel riquadro, usa Apri sul sito.';target.append(note);
  };
 };
 let cached=null;try{cached=JSON.parse(localStorage.getItem(cacheKey)||'null')}catch{}
 if(cached?.item)render(cached.item);
 if(cached?.checkedAt&&Date.now()-cached.checkedAt<6*60*60*1000)return;
 if(!province){box.innerHTML='<p class="muted">Indica la provincia di residenza per vedere le notizie locali.</p>';return}
 try{
  const question=region?`Trova UNA notizia sanitaria recente e verificabile per ${city||'provincia di Napoli'} in Campania, pubblicata esclusivamente su regione.campania.it o aslnapoli3sud.it. Riporta il titolo reale senza inventare date.`:`Trova UNA notizia sanitaria recente e verificabile per la provincia ${province} pubblicata sul sito ufficiale della Regione o della ASL locale. Riporta il titolo reale.`;
  const data=await mediAsk(question,'guidelines');
  const source=(data.sources||[]).find(x=>{try{const u=new URL(x.url),host=u.hostname.toLowerCase();return u.protocol==='https:'&&(region?(host==='regione.campania.it'||host==='aslnapoli3sud.it'||host.endsWith('.regione.campania.it')||host.endsWith('.aslnapoli3sud.it')):(host.includes('regione.')||/^www\.asl|^asl/.test(host))&&host.endsWith('.it'))}catch{return false}});
  if(!source)throw new Error('Nessuna fonte ufficiale verificata');
  const item={title:String(source.title||'Notizia sanitaria del territorio').slice(0,170),url:source.url,source:new URL(source.url).hostname};
  localStorage.setItem(cacheKey,JSON.stringify({item,checkedAt:Date.now()}));render(item);
 }catch(e){if(!cached?.item)box.innerHTML=region?'<a href="https://www.regione.campania.it/regione-informa/notizie" target="_blank" rel="noopener noreferrer">Consulta le notizie ufficiali della Regione Campania ↗</a>':'<p class="muted">Notizie locali non disponibili al momento. Riprova più tardi.</p>'}
}
