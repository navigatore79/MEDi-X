// Private device journal. No record or media is uploaded until "Condividi col medico".
const journalLocalDB = (() => {
  let opening;
  function open() {
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open('meditaly-private-journal', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('entries', { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return opening;
  }
  async function run(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('entries', mode);
      const request = action(tx.objectStore('entries'));
      let value;
      request.onsuccess = () => { value = request.result; };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  }
  return {
    list: owner => run('readonly', store => store.getAll()).then(rows =>
      rows.filter(row => row.patient_id === owner).sort((a, b) => b.created_at.localeCompare(a.created_at))),
    put: row => run('readwrite', store => store.put(row)),
    remove: id => run('readwrite', store => store.delete(id)),
  };
})();

const journalMoods = { great: ['🤩','Molto bene'], good: ['🙂','Bene'], neutral: ['😐','Così così'], low: ['☹️','Non bene'] };
const journalExtensions = {
  'audio/mpeg':'mp3','audio/mp4':'m4a','audio/aac':'aac','audio/ogg':'ogg',
  'audio/webm':'webm','audio/wav':'wav','audio/3gpp':'3gp','audio/amr':'amr',
  'audio/x-m4a':'m4a','audio/m4a':'m4a','video/mp4':'mp4',
  'video/webm':'webm','video/3gpp':'3gp','video/quicktime':'mov'
};
async function patientJournal() {
  const patient = state.session.user.id;
  let entries;
  try { entries = await journalLocalDB.list(patient); }
  catch (error) {
    content.innerHTML = msg('Archivio locale non disponibile: ' + (error.message || error), 'error');
    return;
  }
  const renderEntry = row => {
    const mood = journalMoods[row.mood] || ['●','Stato registrato'];
    return `<article class="journal-entry" data-entry="${esc(row.id)}">
      <div class="journal-entry-head"><span class="journal-entry-mood">${mood[0]}</span>
      <div><strong>${esc(mood[1])}</strong><small>${new Date(row.created_at).toLocaleString('it-IT')} · ${row.shared_id ? 'Condiviso col medico' : 'Solo sul dispositivo'}</small></div>
      <span class="spacer"></span>
      <button type="button" class="icon-btn journal-delete" data-id="${esc(row.id)}" aria-label="Elimina">${uiIcon('trash')}</button></div>
      ${row.text_content ? `<p>${esc(row.text_content).replace(/\n/g,'<br>')}</p>` : ''}
      ${row.media ? `<button type="button" class="btn secondary small journal-play" data-id="${esc(row.id)}">${uiIcon('play')} ${row.media_type === 'video' ? 'Guarda video' : 'Ascolta vocale'}</button>` : ''}
      <button type="button" class="btn secondary small journal-share" data-id="${esc(row.id)}">${row.shared_id ? 'Revoca condivisione' : 'Condividi col medico'}</button>
    </article>`;
  };
  content.innerHTML = `<section class="page-title"><button class="back-link" id="journalBack">${uiIcon('back')} Home</button>
    <div class="eyebrow dark">SPAZIO PERSONALE</div><h1>Il mio diario</h1>
    <p class="muted">Testo, vocali e video restano sul dispositivo. Solo quando scegli “Condividi col medico” vengono caricati nello spazio protetto del medico collegato.</p></section>
    <section class="card journal-compose"><h2>Nuova pagina</h2>
      <div class="journal-moods">${Object.entries(journalMoods).map(([key, value]) => `<button class="journal-mood" data-journal-mood="${key}" type="button"><span>${value[0]}</span><strong>${value[1]}</strong></button>`).join('')}</div>
      <div class="field"><label for="journalText">Cosa vuoi ricordare?</label><textarea id="journalText" class="textarea" rows="5" maxlength="5000" placeholder="Scrivi liberamente…"></textarea></div>
      <div class="journal-media-actions"><button class="btn secondary" id="journalAudioBtn" type="button">${uiIcon('microphone')} Registra vocale</button>
      <button class="btn secondary" id="journalVideoBtn" type="button">${uiIcon('video')} Registra video</button>
      <button class="text-link hidden" id="journalRemoveMedia" type="button">Rimuovi allegato</button></div>
      <input class="hidden" id="journalAudio" type="file" accept="audio/*" capture>
      <input class="hidden" id="journalVideo" type="file" accept="video/*" capture="user">
      <div id="journalMediaInfo" class="journal-media-info muted" role="status">Nessun allegato.</div>
      <button class="btn full" id="journalSave" type="button">Salva sul dispositivo</button>
      <div id="journalMsg" role="status" aria-live="polite"></div>
      <p class="small muted">I dati locali si perdono cancellando i dati dell'app o disinstallandola. Audio e video: massimo 50 MB.</p>
    </section>
    <section><div class="section-head"><h2 class="section-title">Le mie pagine</h2><span class="badge gray">${entries.length}</span></div>
      <div class="journal-list">${entries.map(renderEntry).join('') || '<p>Nessuna pagina nel diario locale.</p>'}</div></section>
    <section class="card section" id="journalPrevious" hidden><h3>Pagine di versioni precedenti</h3><p class="small muted">Le vecchie pagine salvate online restano consultabili in questo archivio privato.</p><div id="journalPreviousList"></div></section>`;

  let mood = '', media = null, mediaType = null, mediaMime = null;
  document.querySelectorAll('[data-journal-mood]').forEach(button => button.onclick = () => {
    mood = button.dataset.journalMood;
    document.querySelectorAll('[data-journal-mood]').forEach(item => {
      item.classList.toggle('selected', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
  });
  const mediaInfo = document.getElementById('journalMediaInfo');
  const removeButton = document.getElementById('journalRemoveMedia');
  function choose(file, type) {
    if (!file) return;
    const mime = journalMime(file, type);
    if (!file.size || file.size > 50 * 1024 * 1024 || !mime || !journalExtensions[mime]) {
      document.getElementById('journalMsg').innerHTML = msg('Registrazione vuota, oltre 50 MB o formato non supportato. Riprova o scegli un file già salvato.', 'error');
      return;
    }
    media = file; mediaType = type; mediaMime = mime;
    mediaInfo.textContent = `${type === 'video' ? 'Video' : 'Vocale'}: ${file.name || 'registrazione'} · ${(file.size / 1048576).toFixed(1)} MB`;
    removeButton.classList.remove('hidden');
    document.getElementById('journalMsg').textContent = '';
  }
  document.getElementById('journalAudioBtn').onclick = () => document.getElementById('journalAudio').click();
  document.getElementById('journalVideoBtn').onclick = () => document.getElementById('journalVideo').click();
  document.getElementById('journalAudio').onchange = event => choose(event.target.files?.[0], 'audio');
  document.getElementById('journalVideo').onchange = event => choose(event.target.files?.[0], 'video');
  removeButton.onclick = () => { media = mediaType = mediaMime = null; mediaInfo.textContent = 'Nessun allegato.'; removeButton.classList.add('hidden'); };
  document.getElementById('journalSave').onclick = async () => {
    const text = document.getElementById('journalText').value.trim();
    const output = document.getElementById('journalMsg');
    const button = document.getElementById('journalSave');
    if (!mood || (!text && !media)) { output.innerHTML = msg('Scegli come ti senti e aggiungi un testo, un vocale o un video.', 'error'); return; }
    button.disabled = true; output.innerHTML = msg('Salvataggio locale in corso…');
    try {
      // Read the content URI while the chooser grant is still valid, then persist the bytes.
      const blob = media ? new Blob([await media.arrayBuffer()], { type: mediaMime }) : null;
      if (media && blob.size !== media.size) throw new Error('Registrazione non leggibile. Riprova.');
      await journalLocalDB.put({ id: crypto.randomUUID(), patient_id: patient, mood, text_content: text,
        media: blob, media_type: mediaType, media_mime: mediaMime, created_at: new Date().toISOString(),
        shared_id: null, shared_path: null });
      await patientJournal();
    } catch (error) { output.innerHTML = msg('Non salvato: ' + (error.message || error), 'error'); button.disabled = false; }
  };
  document.querySelectorAll('.journal-play').forEach(button => button.onclick = () => {
    const row = entries.find(item => item.id === button.dataset.id);
    if (!row?.media) return;
    const url = URL.createObjectURL(row.media);
    const overlay = document.createElement('div');
    overlay.className = 'journal-player-overlay';
    const tag = row.media_type === 'video' ? 'video' : 'audio';
    overlay.innerHTML = `<div class="journal-player-card" role="dialog" aria-modal="true"><button type="button" class="journal-player-close">×</button><${tag} controls playsinline preload="metadata" src="${url}"></${tag}></div>`;
    const close = () => { overlay.querySelector('video,audio')?.pause(); URL.revokeObjectURL(url); overlay.remove(); };
    document.body.append(overlay); overlay.querySelector('button').onclick = close;
    overlay.onclick = event => { if (event.target === overlay) close(); };
  });
  document.querySelectorAll('.journal-share').forEach(button => button.onclick = async () => {
    const row = entries.find(item => item.id === button.dataset.id);
    if (!row) return;
    button.disabled = true;
    try {
      if (row.shared_id) {
        if (!confirm('Revocare la condivisione di questa pagina col medico?')) return;
        const result = await sb.from('patient_journal_entries').delete().eq('id', row.shared_id);
        if (result.error) throw result.error;
        if (row.shared_path) await sb.storage.from('patient-journal').remove([row.shared_path]);
        row.shared_id = row.shared_path = null;
      } else {
        const doctor = await getAssignedClinician();
        if (!doctor || doctor.isTest) throw new Error('Collega un medico verificato prima di condividere il diario.');
        if (!confirm('Condividere questa pagina e l’eventuale registrazione col medico collegato?')) return;
        let path = null;
        try {
          if (row.media) {
            path = `${patient}/${crypto.randomUUID()}.${journalExtensions[row.media_mime]}`;
            await uploadJournalMedia(path, row.media, row.media_mime);
          }
          const result = await sb.from('patient_journal_entries').insert({
            patient_id: patient, mood: row.mood, text_content: row.text_content || null,
            media_path: path, media_type: row.media_type, media_mime: row.media_mime,
            shared_with: doctor.clinician_id, shared_at: new Date().toISOString()
          }).select('id').single();
          if (result.error) throw result.error;
          row.shared_id = result.data.id; row.shared_path = path;
        } catch (error) {
          if (path) await sb.storage.from('patient-journal').remove([path]);
          throw error;
        }
      }
      await journalLocalDB.put(row);
      await patientJournal();
    } catch (error) { alert('Condivisione non riuscita: ' + (error.message || error)); }
    finally { button.disabled = false; }
  });
  document.querySelectorAll('.journal-delete').forEach(button => button.onclick = async () => {
    const row = entries.find(item => item.id === button.dataset.id);
    if (!row || !confirm('Eliminare questa pagina dal dispositivo' + (row.shared_id ? ' e dal medico' : '') + '?')) return;
    try {
      if (row.shared_id) {
        const result = await sb.from('patient_journal_entries').delete().eq('id', row.shared_id);
        if (result.error) throw result.error;
        if (row.shared_path) await sb.storage.from('patient-journal').remove([row.shared_path]);
      }
      await journalLocalDB.remove(row.id);
      await patientJournal();
    } catch (error) { alert('Eliminazione non riuscita: ' + (error.message || error)); }
  });
  document.getElementById('journalBack').onclick = () => { state.tab = 'home'; patientView(); };

  // Do not silently discard private pages written by earlier releases.
  const previous = await sb.from('patient_journal_entries').select('*').eq('patient_id', patient).is('shared_with', null).order('created_at', { ascending: false });
  const archive = document.getElementById('journalPrevious');
  if (!archive || previous.error || !previous.data?.length) return;
  archive.hidden = false;
  const list = document.getElementById('journalPreviousList');
  list.innerHTML = previous.data.map(row => `<article class="item"><strong>${esc(journalMoods[row.mood]?.[1] || 'Pagina')}</strong> · ${new Date(row.created_at).toLocaleString('it-IT')}
    ${row.text_content ? `<p>${esc(row.text_content)}</p>` : ''}
    ${row.media_path ? `<button type="button" class="btn secondary small previous-media" data-path="${esc(row.media_path)}">Apri registrazione</button>` : ''}</article>`).join('');
  list.querySelectorAll('.previous-media').forEach(button => button.onclick = async () => {
    const result = await sb.storage.from('patient-journal').createSignedUrl(button.dataset.path, 900);
    if (result.error) alert(result.error.message);
    else window.open(result.data.signedUrl, '_blank');
  });
}
