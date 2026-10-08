# Meditaly 0.7.40-beta55.8 · versionCode 82

## Modifiche

- Dashboard: consentita la riproduzione dei vocali privati e delle anteprime registrate. Microfono e videocamera permessi solo dal sito stesso.
- Ascolto dei vocali: Medi viene sospeso durante la riproduzione; un solo vocale suona alla volta. Errori del microfono distinti per accesso negato e dispositivo non disponibile.
- Chat del medico: pulsanti Chiama e Videochiama. Paziente: risposta o rifiuto; nessuna attivazione di microfono/videocamera prima di Rispondi.
- Video: anteprima personale silenziata, video remoto, esclusione microfono e videocamera, chiusura dei flussi al termine. La videochiamata non è registrata.
- Android: permesso CAMERA richiesto solo per video, soltanto nell'origine locale affidabile dell'app. Notifica di videochiamata distinta dalla chiamata audio.

## Nuovo servizio gestito Cloudflare

Il backend supporta ora Cloudflare Realtime TURN. Seguire [README_CLOUDFLARE_TURN.md](README_CLOUDFLARE_TURN.md) per account, chiave e due variabili da salvare. La procedura coturn riportata sotto è un’alternativa. Nessun servizio è ancora attivo senza credenziali reali.

## Configurazione coturn alternativa

La funzione Supabase `voice-call` restituisce attualmente `calls_configured: false`: manca il servizio TURN. L'interfaccia pronta non equivale a una chiamata funzionante. Non è stato eseguito un collaudo tra telefoni reali.

Occorre un server TURN operativo compatibile con credenziali temporanee HMAC-SHA1 (per esempio coturn con `use-auth-secret`). Non bastano un server STUN o una coppia statica username/password.

Nella pagina https://supabase.com/dashboard/project/ejlhgtodmcadmdhbujkf/functions/secrets impostare:

| Nome | Valore richiesto |
| --- | --- |
| `MEDITALY_TURN_URLS` | URL reali del servizio separati da virgole. Esempio di struttura: `turn:HOST_REALE:3478?transport=udp,turn:HOST_REALE:3478?transport=tcp,turns:HOST_REALE:5349?transport=tcp` |
| `MEDITALY_TURN_SECRET` | Segreto condiviso effettivo del servizio TURN, corrispondente al suo `static-auth-secret`. |

I nomi HOST_REALE e i valori di esempio non sono configurazioni funzionanti. Conservare il segreto nel backend; non inserirlo nei sorgenti Android, JavaScript, Vercel o nella chat. Il servizio deve avere dominio/IP pubblici, porte di ascolto e intervallo di relay raggiungibili; per TLS serve un certificato valido. Le credenziali distribuite dal backend scadono dopo un'ora.

Per push ad app chiusa servono inoltre la configurazione Firebase originale nel build Android e `FIREBASE_SERVICE_ACCOUNT_JSON` nel backend (gestione preesistente). L'APK debug di CI può non includere Firebase se manca il secret del repository.

Documentazione ufficiale:
- https://supabase.com/docs/guides/functions/secrets
- https://github.com/coturn/coturn/blob/master/examples/etc/turnserver.conf

## Build Android

Aprire `android` in Android Studio. Generare AAB release con la chiave originale Meditaly. Il pacchetto include il modello italiano e il file Firebase originale già presenti nella build precedente. Nessuna chiave di firma originale è disponibile qui.

## Collaudo dopo la configurazione

1. Controllare https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/voice-call: deve indicare `calls_configured: true` (presenza dei secret, non test del relay).
2. Aggiornare il paziente alla versione 82; accedere al medico nella dashboard e aprire la chat di un paziente collegato.
3. Inviare, riascoltare e ricevere un vocale in entrambe le direzioni.
4. Provare chiamata e videochiamata con medico su Wi-Fi e paziente su rete mobile; verificare risposta, rifiuto, permessi negati, microfono e videocamera spenti e chiusura.
5. Verificare l'invito con app chiusa e il ritorno alla chiamata dalla notifica.

Le verifiche automatiche coprono 19 scenari di comunicazione e le autorizzazioni database con utenti sintetici e rollback; non sostituiscono il collaudo su rete e dispositivi reali.
