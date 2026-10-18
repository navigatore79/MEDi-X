# Meditaly Android 83 — questionari, archivio e funzionamento offline

- Medi, all'apertura, pronuncia soltanto «Sono Medi, il tuo assistente sanitario.» e avvia l'ascolto al termine della frase.
- I questionari assegnati richiedono sempre una conferma esplicita. Le bozze sono salvate sul telefono; dopo la conferma gli invii restano in coda fino alla conferma del server. Il server salva risposta e messaggio al medico nella stessa transazione e riconosce i tentativi ripetuti.
- I documenti sono organizzati in 29 cassetti per branca, con Dati amministrativi alla fine. Foto/PDF possono essere salvati offline e caricati alla riconnessione. I file online vengono conservati sul telefono dopo la prima apertura. Gli avvisi al medico richiedono una conferma separata.
- La libreria Supabase è inclusa nell'app, senza download da CDN all'avvio. I dati già consultati di profilo, terapia, questionari e controlli restano consultabili senza rete per 30 giorni. I dati mostrati offline possono essere meno recenti rispetto al piano del medico.
- Le dichiarazioni di assunzione possono restare in coda, mantenendo la data originale. Il backend verifica nuovamente proprietà del farmaco, validità della terapia e accesso al momento della sincronizzazione. Gli invii oltre 30 giorni o con un collegamento/terapia non più valido non vengono dichiarati riusciti.
- La sincronizzazione automatica avviene quando l'app è aperta, all'avvio e alla riconnessione. Non è un servizio di invio garantito in background ad app chiusa. Chat, chiamate, nuovi dati del medico, prenotazioni in tempo reale e risposte Gemini richiedono rete.
- Cache e coda sono separate per account nell'archivio interno dell'app; nessuna autorizzazione del server è ricavata dalla cache. Non cancellare i dati dell'app prima di sincronizzare gli invii pendenti.
- La fotocamera richiede il permesso Android prima di aprire l'acquisizione. I PDF locali usano un lettore PDF installato e un URI temporaneo FileProvider.

## Verifica

Eseguire i test JavaScript con `npm install` in `tests/interactive` e `node --test archive.test.cjs offline.test.cjs assigned-questionnaires.test.cjs checkin.test.cjs session.test.cjs voice-questionnaire.test.cjs welcome.test.cjs`.

`offline-database-rollback.sql` verifica invio al medico, data originale, deduplicazione, visibilità e isolamento tra pazienti con dati fittizi in una transazione annullata.

Il test Gemini preesistente richiede una funzione backend non inclusa nel repository Android e non fa parte di questa modifica.

## Installazione

Aprire il progetto in Android Studio. Per aggiornare l'app del Play Store servono l'originale `google-services.json` e il keystore già usato. Non disinstallare la versione precedente: il diario e i documenti locali restano sul dispositivo. La build debug automatica non sostituisce una release firmata con il keystore originale.

Da collaudare su telefono reale: autorizzazione fotocamera concessa/negata, foto multipagina, PDF, riavvio in modalità aereo e sincronizzazione dopo riapertura dell'app.
