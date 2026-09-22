package it.meditaly.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.Comparator;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private TextToSpeech tts;
    private final ActivityResultLauncher<String[]> filePicker =
            registerForActivityResult(new ActivityResultContracts.OpenMultipleDocuments(), uris -> {
                if (fileCallback == null) return;
                fileCallback.onReceiveValue(uris == null ? new Uri[0] : uris.toArray(new Uri[0]));
                fileCallback = null;
            });
    private final ActivityResultLauncher<String> notificationPermission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {});

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createChannels();
        initTts();
        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request){
                Uri u=request.getUrl();
                if ("file".equalsIgnoreCase(u.getScheme()) || "https".equalsIgnoreCase(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW,u)); } catch(Exception ignored){}
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params){
                if(fileCallback!=null) fileCallback.onReceiveValue(null);
                fileCallback=cb;
                String[] types=params!=null && params.getAcceptTypes()!=null && params.getAcceptTypes().length>0
                        ? params.getAcceptTypes() : new String[]{"application/pdf","image/*"};
                try{ filePicker.launch(types); }catch(Exception e){ filePicker.launch(new String[]{"application/pdf","image/*"}); }
                return true;
            }
        });
        webView.loadUrl("file:///android_asset/index.html");
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!= PackageManager.PERMISSION_GRANTED){
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS);
        }
        try { FirebaseMessaging.getInstance().getToken().addOnSuccessListener(this::deliverToken); } catch (Exception ignored) {}
    }

    private void initTts(){
        tts=new TextToSpeech(this,status->{
            if(status!=TextToSpeech.SUCCESS) return;
            tts.setLanguage(Locale.ITALIAN);
            tts.setSpeechRate(0.90f);
            tts.setPitch(0.98f);
            try{
                Set<Voice> voices=tts.getVoices();
                if(voices!=null){
                    Voice best=voices.stream()
                            .filter(v->v.getLocale()!=null && "it".equals(v.getLocale().getLanguage()))
                            .min(Comparator.comparingInt(v->{
                                int score=0;
                                if(v.isNetworkConnectionRequired()) score+=2;
                                if(v.getQuality()<Voice.QUALITY_NORMAL) score+=2;
                                if(v.getLatency()>Voice.LATENCY_NORMAL) score+=1;
                                return score;
                            })).orElse(null);
                    if(best!=null) tts.setVoice(best);
                }
            }catch(Exception ignored){}
        });
    }

    private void deliverToken(String token){
        if(token==null||token.isEmpty()) return;
        if(webView==null) return;
        String safe=token.replace("\\","\\\\").replace("'","\\'");
        webView.postDelayed(()->webView.evaluateJavascript(
                "if(window.meditalyPushToken) window.meditalyPushToken('"+safe+"');",null),700);
    }

    private void createChannels(){
        if(Build.VERSION.SDK_INT<26) return;
        NotificationManager nm=getSystemService(NotificationManager.class);
        NotificationChannel messages=new NotificationChannel("meditaly_messages","Messaggi Meditaly",NotificationManager.IMPORTANCE_HIGH);
        messages.setDescription("Messaggi e comunicazioni Meditaly");
        nm.createNotificationChannel(messages);
        NotificationChannel therapy=new NotificationChannel("meditaly_therapy_siren_v1","Promemoria terapia",NotificationManager.IMPORTANCE_HIGH);
        therapy.setDescription("Promemoria per le terapie");
        nm.createNotificationChannel(therapy);
    }

    @Override public void onBackPressed(){
        if(webView!=null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy(){
        if(tts!=null){tts.stop();tts.shutdown();}
        if(webView!=null){webView.removeJavascriptInterface("AndroidBridge");webView.destroy();}
        super.onDestroy();
    }

    public class AndroidBridge {
        private final String PREFS="meditaly_prefs";
        private final String SIREN="therapy_siren_enabled";
        @JavascriptInterface public void speak(String text){
            runOnUiThread(()->{if(tts!=null && text!=null && !text.isBlank()) tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"medi");});
        }
        @JavascriptInterface public void stopSpeaking(){ runOnUiThread(()->{if(tts!=null)tts.stop();}); }
        @JavascriptInterface public void requestPushToken(){ try { FirebaseMessaging.getInstance().getToken().addOnSuccessListener(MainActivity.this::deliverToken); } catch (Exception ignored) {} }
        @JavascriptInterface public boolean toggleTherapySiren(){
            SharedPreferences p=getSharedPreferences(PREFS,MODE_PRIVATE);
            boolean next=!p.getBoolean(SIREN,true);p.edit().putBoolean(SIREN,next).apply();return next;
        }
        @JavascriptInterface public boolean isTherapySirenEnabled(){return getSharedPreferences(PREFS,MODE_PRIVATE).getBoolean(SIREN,true);}
        @JavascriptInterface public void openExternal(String url){
            if(url==null)return;runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(Exception ignored){}});
        }
        @JavascriptInterface public void openNotificationSettings(){
            if(Build.VERSION.SDK_INT>=26){
                Intent i=new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName());
                startActivity(i);
            }
        }
    }
}
