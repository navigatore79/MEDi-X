# Attivazione nuovo servizio chiamate Meditaly

Il backend è predisposto per Cloudflare Realtime TURN con credenziali temporanee della durata di un'ora. La configurazione non è ancora attiva: occorre creare l'account e una chiave TURN. Il servizio gestito evita di installare/manutenere un server coturn. Nessuna modifica Android aggiuntiva: usare la versione 82 già preparata per chiamate/videochiamate.

## 1. Account

Aprire https://dash.cloudflare.com/sign-up e registrarsi con l'email usata per gestire Meditaly; verificare l'email se richiesto. Se si possiede già un account Cloudflare, accedere. Non è necessario trasferire il dominio o la dashboard da Vercel.

## 2. Chiave TURN

Aprire https://dash.cloudflare.com/?to=/:account/calls e selezionare l'account. Nella sezione Realtime/TURN creare una nuova chiave dedicata `Meditaly`. Conservare i due valori mostrati: TURN Key ID e API Token. Il token del servizio è diverso dall'ID della chiave e dalle credenziali temporanee generate per il browser.

## 3. Collegamento backend

Aprire https://supabase.com/dashboard/project/ejlhgtodmcadmdhbujkf/functions/secrets e salvare:

| Nome | Valore |
| --- | --- |
| `MEDITALY_CLOUDFLARE_TURN_KEY_ID` | TURN Key ID appena creato |
| `MEDITALY_CLOUDFLARE_TURN_API_TOKEN` | API Token della stessa chiave TURN |

Non inviare il token in chat o inserirlo nell'app/JavaScript. Non usare questi valori come MEDITALY_TURN_SECRET: quella variabile è riservata alla configurazione coturn precedente.

La funzione `voice-call` sceglie Cloudflare quando è presente una delle sue due variabili e richiede entrambe. Non serve ripubblicare Android o la dashboard per cambiare i secret.

## 4. Verifica

- https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/voice-call deve restituire `calls_configured: true` e `provider: cloudflare`. Questo verifica la presenza/formato della configurazione, non la validità del token né la raggiungibilità del relay.
- Con la versione Android 82 aggiornata, accedere con medico e paziente attivi e collegati, aprire Chat e provare Chiama/Videochiama tra Wi-Fi e rete mobile.
- Il backend verifica sessione, profili attivi, collegamento medico-paziente e i requisiti MFA del medico. Le richieste di credenziali sono limitate a 6 al minuto e 100 al giorno UTC per account; non sono un limite assoluto al traffico TURN.
- Le chiavi permanenti restano sul backend; l'app riceve soltanto URL e credenziali temporanee. Le chiamate non vengono registrate.

## Costi e documentazione

Tariffe ufficiali consultate l'8 ottobre 2026: primi 1.000 GB al mese gratuiti condivisi tra SFU e TURN; poi 0,05 USD per GB in uscita. Controllare il consumo sull'account Cloudflare e le tariffe effettive prima di attivare fatturazione a pagamento.

https://developers.cloudflare.com/realtime/sfu/platform/pricing/
https://developers.cloudflare.com/realtime/turn/generate-credentials/

Test: 9 test automatici del backend (provider, autenticazione, errori, segreti e compatibilità coturn); test SQL con utenti sintetici e rollback per autorizzazioni, limiti e reset temporali. La chiamata reale non è ancora verificata perché l'account/chiave del servizio non sono stati configurati.
