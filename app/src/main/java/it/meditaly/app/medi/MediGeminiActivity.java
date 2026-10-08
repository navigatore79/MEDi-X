package it.meditaly.app.medi;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.*;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.widget.*;
import java.util.ArrayList;
import java.util.Locale;

/** Native, explicitly enabled preview. No patient records are injected into Gemini. */
public final class MediGeminiActivity extends Activity {
    private static final int PERMISSIONS = 910, SPEECH = 911;
    private MediGeminiClient client;
    private TextToSpeech tts;
    private TextView status, transcript;
    private EditText question;
    private Button send;
    private boolean ready, destroyed, consent;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable poll = new Runnable() {
        @Override public void run() {
            if (destroyed) return;
            status.setText("Ascolto: " + MediHandsFreeService.status(MediGeminiActivity.this));
            main.postDelayed(this, 1500);
        }
    };
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        stopService(new Intent(this, MediHandsFreeService.class));
        client = new MediGeminiClient(this);
        tts = new TextToSpeech(this, result -> {
            if (!destroyed && result == TextToSpeech.SUCCESS) ready = tts.setLanguage(Locale.ITALIAN) >= 0;
        });
        ScrollView scroll = new ScrollView(this);
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL);
        int pad = (int)(22 * getResources().getDisplayMetrics().density);
        layout.setPadding(pad,pad,pad,pad); layout.setBackgroundColor(Color.rgb(250,246,231));
        scroll.addView(layout); setContentView(scroll);
        TextView title = new TextView(this); title.setText("Medi · Gemini"); title.setTextSize(28); title.setTextColor(Color.rgb(41,78,105)); layout.addView(title);
        TextView note = new TextView(this); note.setTextSize(16);
        note.setText("Anteprima sperimentale: conversazione generale. Il percorso personale, i farmaci e i messaggi restano nelle sezioni protette di Meditaly.\n\nLa domanda e la conversazione recente vengono inviate a Google per generare la risposta. Questa modalità non consulta fonti aggiornate e non esegue azioni cliniche."); layout.addView(note);
        question = new EditText(this); question.setHint("Scrivi la tua domanda"); question.setMinLines(2); question.setMaxLines(5); layout.addView(question);
        send = button(layout, "Chiedi a Medi", () -> request(question.getText().toString()));
        button(layout, "Detta la domanda", () -> {
            if (tts != null) tts.stop();
            Intent voice = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT");
            try { startActivityForResult(voice, SPEECH); } catch (Exception absent) { transcript.setText("Dettatura non disponibile. Usa il testo."); }
        });
        transcript = new TextView(this); transcript.setTextSize(17); transcript.setPadding(0,pad,0,pad); layout.addView(transcript);
        status = new TextView(this); status.setTextSize(15); layout.addView(status);
        button(layout, "Attiva Hei Medi in background", this::explainHandsFree);
        button(layout, "Ferma ascolto e voce", () -> { stopService(new Intent(this, MediHandsFreeService.class)); if(tts!=null)tts.stop(); });
        button(layout, "Torna a Meditaly", this::finish);
        TextView limits = new TextView(this); limits.setTextSize(14);
        limits.setText("L’ascolto sperimentale dura al massimo 2 ore e usa batteria. Attivalo con l’app aperta, poi puoi premere Home o spegnere lo schermo. Una notifica permette di fermarlo. Non riparte dopo arresto forzato, riavvio o revoca del microfono. Il nome Medi non autentica chi parla.\n\nPer la modalità background servono il modello vocale italiano incluso nella build e Firebase AI Logic configurato."); layout.addView(limits);
        main.post(poll);
    }
    private Button button(LinearLayout target, String text, Runnable click) {
        Button b = new Button(this); b.setText(text); b.setAllCaps(false); b.setOnClickListener(v -> click.run()); target.addView(b); return b;
    }
    private void request(String text) {
        if (!consent) {
            new AlertDialog.Builder(this).setTitle("Parla con Gemini")
                .setMessage("Invio a Google il testo della domanda e gli ultimi messaggi di questa conversazione. Non aggiungo dati della tua cartella. Le risposte sono generate da IA. In questa anteprima usa solo dati di prova.")
                .setPositiveButton("Continua", (d,w) -> { consent=true; request(text); })
                .setNegativeButton("Annulla", null).show(); return;
        }
        stopService(new Intent(this, MediHandsFreeService.class));
        send.setEnabled(false); transcript.setText("Medi sta rispondendo…");
        client.ask(text, (answer,error) -> {
            if (destroyed) return;
            send.setEnabled(true); transcript.setText(error == null ? answer : error);
            if (error == null && ready) tts.speak(answer, TextToSpeech.QUEUE_FLUSH,null,"medi-gemini");
        });
    }
    private void explainHandsFree() {
        new AlertDialog.Builder(this).setTitle("Ascolto locale con Hei Medi")
            .setMessage("Medi mantiene il microfono attivo sul telefono per riconoscere la frase. Solo la domanda pronunciata dopo il richiamo viene inviata a Gemini. Le risposte possono essere udite anche a schermo bloccato. Usa dati di prova. Durata massima: 2 ore; puoi fermare tutto dalla notifica.")
            .setPositiveButton("Attiva", (d,w) -> startHandsFree())
            .setNegativeButton("Annulla", null).show();
    }
    private void startHandsFree() {
        try { getAssets().open("medi-model-it/uuid").close(); }
        catch (Exception missing) { transcript.setText("Modello italiano non incluso: completa la preparazione della build descritta nel pacchetto."); return; }
        ArrayList<String> missing = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) missing.add(Manifest.permission.RECORD_AUDIO);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) missing.add(Manifest.permission.POST_NOTIFICATIONS);
        if (!missing.isEmpty()) { requestPermissions(missing.toArray(new String[0]),PERMISSIONS); return; }
        if (tts != null) tts.stop();
        try { startForegroundService(new Intent(this,MediHandsFreeService.class)); }
        catch (RuntimeException unavailable) { transcript.setText("Non posso avviare l’ascolto. Verifica i permessi e riprova con l’app aperta."); }
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code,permissions,results);
        if(code!=PERMISSIONS)return;
        boolean allowed=results.length>0; for(int result:results)allowed &= result==PackageManager.PERMISSION_GRANTED;
        if(allowed)startHandsFree(); else transcript.setText("Ascolto non attivato: servono microfono e notifica visibile.");
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==SPEECH && result==RESULT_OK && data!=null){
            ArrayList<String> words=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if(words!=null&&!words.isEmpty()){question.setText(words.get(0));request(words.get(0));}
        }
    }
    @Override protected void onDestroy() {
        destroyed=true; main.removeCallbacksAndMessages(null);client.close();
        if(tts!=null){tts.stop();tts.shutdown();}super.onDestroy();
    }
}
