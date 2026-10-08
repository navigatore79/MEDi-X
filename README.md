# Meditaly Android — Beta 55.5

Sorgenti Android aggiornati al pacchetto verificato **0.7.37-beta55.5**, versionCode **79**.

- Application ID Google Play: `com.ciromaiello.meditaly`.
- Namespace Java: `it.meditaly.app` (non è l'identificativo Play).
- Android minimo 9 (API 28), target/compile SDK 36, JDK 17, Gradle 8.11.1.
- Dashboard principale: https://med-italy.vercel.app — repository https://github.com/navigatore79/MedItaly.
- Questo repository contiene l'app Android e non deve essere pubblicato come dashboard Vercel.

## Android Studio

Aprire la cartella radice di questo repository. Nel pacchetto completo ZIP, aprire invece la cartella `android`.

Prima della compilazione da un clone GitHub:

1. Eseguire `python tools/setup_medi_model.py`: scarica il modello italiano Vosk ufficiale, verifica il checksum del pacchetto di riferimento e lo installa. Il modello, di circa 90 MB estratto, è una dipendenza esterna e non viene duplicato nel repository; è già incluso nel pacchetto ZIP completo.
2. Inserire localmente `app/google-services.json` del progetto Firebase Meditaly, con client `com.ciromaiello.meditaly`. Non committare il file.
3. Sincronizzare Gradle. Per Google Play usare Build → Generate Signed Bundle / APK → Android App Bundle, con il keystore di caricamento esistente di Meditaly.

Le chiavi di firma non sono incluse. Un APK debug non aggiorna una copia distribuita da Google Play.

## Compilazione automatica

GitHub Actions prepara SDK, JDK e modello italiano, poi produce un APK debug. Per abilitare Firebase in CI, configurare il repository secret `MEDITALY_GOOGLE_SERVICES_JSON` con il contenuto del file locale. Se il secret manca, la build debug non contiene Firebase: le push non sono disponibili. Una build release senza Firebase è bloccata dal progetto.

Le release per Play devono essere firmate con la chiave esistente, non con una nuova chiave generata dalla CI.

## Comunicazioni

Inclusi messaggi vocali in chat, questionari assegnati dal medico con interazione vocale e predisposizione alle chiamate vocali. Le chiamate richiedono la configurazione TURN lato backend; la presenza del codice non significa che siano già attive su tutte le reti.

L'app comunica con il backend Supabase Meditaly. Diario e relativi audio/video restano locali fino alla condivisione esplicita; inclusa la migrazione della memoria locale durante l'aggiornamento dell'origine WebView.
