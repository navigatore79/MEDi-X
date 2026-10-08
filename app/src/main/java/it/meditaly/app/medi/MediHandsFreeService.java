package it.meditaly.app.medi;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.*;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import androidx.core.app.NotificationCompat;
import it.meditaly.app.R;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;
import org.vosk.android.StorageService;
import java.util.Locale;

/** Experimental local STT wake detector. Explicit start, visible notification, no boot restart. */
public final class MediHandsFreeService extends Service implements RecognitionListener {
    public static final String STOP = "it.meditaly.app.medi.STOP";
    private static final String CHANNEL = "medi_hands_free";
    private static final int NOTIFICATION = 4901;
    private final Handler main = new Handler(Looper.getMainLooper());
    private Model model;
    private Recognizer recognizer;
    private SpeechService speech;
    private TextToSpeech tts;
    private MediGeminiClient gemini;
    private PowerManager.WakeLock wakeLock;
    private boolean closed, started, ttsReady, failed;
    private enum Phase { STARTING, WAKE, SPEAKING, COMMAND, THINKING }
    private Phase phase = Phase.STARTING;
    private Runnable afterSpeech;
    private long lastRequest;

    public static String status(Context c) {
        return c.getSharedPreferences("medi_handsfree", MODE_PRIVATE).getString("status", "Spento");
    }
    private void status(String message) {
        getSharedPreferences("medi_handsfree", MODE_PRIVATE).edit().putString("status", message).apply();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onCreate() {
        super.onCreate();
        ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(
            new NotificationChannel(CHANNEL, "Medi: ascolto in background", NotificationManager.IMPORTANCE_LOW));
        gemini = new MediGeminiClient(this);
        tts = new TextToSpeech(this, result -> {
            if (closed) return;
            if (result != TextToSpeech.SUCCESS || tts.setLanguage(Locale.ITALIAN) < 0) { fail("Voce italiana non disponibile"); return; }
            ttsReady = true;
            tts.setSpeechRate(.95f);
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { main.post(() -> finishSpeech()); }
                @Override public void onError(String id) { main.post(() -> fail("Riproduzione vocale non disponibile")); }
            });
            beginIfReady();
        });
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || STOP.equals(intent.getAction())) { stopSelf(); return START_NOT_STICKY; }
        if (started) return START_NOT_STICKY;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            fail("Autorizza il microfono e riattiva Medi dall’app"); return START_NOT_STICKY;
        }
        try {
            startForeground(NOTIFICATION, notification("Preparazione ascolto locale…"), ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } catch (RuntimeException denied) { fail("Apri Meditaly per avviare l’ascolto"); return START_NOT_STICKY; }
        started = true;
        status("Preparazione ascolto locale…");
        PowerManager power = (PowerManager)getSystemService(POWER_SERVICE);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Meditaly:MediVoice");
        // Bounded session. User can start a new session from the visible Activity.
        wakeLock.acquire(2 * 60 * 60 * 1000L + 10000L);
        main.postDelayed(() -> fail("Sessione di 2 ore terminata. Riattiva Medi dall’app."), 2 * 60 * 60 * 1000L);
        StorageService.unpack(this, "medi-model-it", "medi-model-it", unpacked -> {
            if (closed) { unpacked.close(); return; }
            model = unpacked; beginIfReady();
        }, error -> fail("Modello vocale italiano assente o non leggibile"));
        return START_NOT_STICKY;
    }
    private Notification notification(String message) {
        PendingIntent open = PendingIntent.getActivity(this, 4902,
            new Intent(this, MediGeminiActivity.class), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop = PendingIntent.getService(this, 4903,
            new Intent(this, MediHandsFreeService.class).setAction(STOP), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now).setContentTitle("Medi · microfono attivo")
            .setContentText(message).setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_pause, "Ferma", stop).build();
    }
    private void update(String message) {
        status(message);
        ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(NOTIFICATION, notification(message));
    }
    private void beginIfReady() {
        if (!closed && started && model != null && ttsReady && phase == Phase.STARTING) listen(false);
    }
    private void stopListening() {
        if (speech != null) { speech.stop(); speech.shutdown(); speech = null; }
        if (recognizer != null) { recognizer.close(); recognizer = null; }
    }
    private void listen(boolean command) {
        if (closed) return;
        stopListening();
        try {
            // Free vocabulary Italian STT. Recognition of the name Medi must be validated on device.
            recognizer = new Recognizer(model, 16000.0f);
            speech = new SpeechService(recognizer, 16000.0f);
            phase = command ? Phase.COMMAND : Phase.WAKE;
            update(command ? "Ti ascolto · massimo 12 secondi" : "Pronuncia Hei Medi · rilevamento sul telefono");
            if (command) speech.startListening(this, 12000); else speech.startListening(this);
        } catch (Exception error) { fail("Microfono non disponibile. Chiudi altre app vocali e riprova."); }
    }
    private void speak(String text, Runnable next) {
        if (closed) return;
        stopListening(); phase = Phase.SPEAKING; afterSpeech = next;
        update("Medi sta parlando");
        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "medi-handsfree") == TextToSpeech.ERROR)
            fail("Voce non disponibile");
    }
    private void finishSpeech() {
        if (closed || phase != Phase.SPEAKING) return;
        Runnable next = afterSpeech; afterSpeech = null;
        if (next != null) main.postDelayed(next, 400);
    }
    private void result(String json, boolean partial) {
        if (closed) return;
        try {
            String text = new JSONObject(json).optString(partial ? "partial" : "text", "").trim();
            if (phase == Phase.WAKE && MediWakePhrase.matches(text)) {
                speak("Ti ascolto.", () -> listen(true));
            } else if (!partial && phase == Phase.COMMAND && !text.isEmpty()) {
                stopListening();
                if (text.matches("(?i).*(ferma medi|spegni medi|disattiva ascolto).*")) { stopSelf(); return; }
                if (SystemClock.elapsedRealtime() - lastRequest < 5000) { listen(false); return; }
                lastRequest = SystemClock.elapsedRealtime(); phase = Phase.THINKING;
                update("Attendo la risposta di Gemini");
                gemini.ask(text, (answer, error) -> {
                    if (!closed) speak(error == null ? answer : "Non riesco a contattare Gemini. Controlla la connessione e la configurazione nell’app.", () -> listen(false));
                });
            }
        } catch (Exception malformed) { fail("Errore nel riconoscimento vocale"); }
    }
    @Override public void onPartialResult(String text) { result(text, true); }
    @Override public void onResult(String text) { result(text, false); }
    @Override public void onFinalResult(String text) { result(text, false); }
    @Override public void onTimeout() { if (phase == Phase.COMMAND) speak("Non ho sentito la domanda. Richiamami con Hei Medi.", () -> listen(false)); }
    @Override public void onError(Exception error) { fail("Ascolto interrotto. Riattiva Medi dall’app."); }
    private void fail(String reason) { failed = true; status(reason); stopSelf(); }
    @Override public void onDestroy() {
        closed = true; main.removeCallbacksAndMessages(null); stopListening();
        if (model != null) model.close();
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (gemini != null) gemini.close();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        stopForeground(STOP_FOREGROUND_REMOVE);
        if (!failed) status("Spento");
        super.onDestroy();
    }
}
