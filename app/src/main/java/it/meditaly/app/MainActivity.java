package it.meditaly.app;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.location.Address;
import android.location.Geocoder;
import android.speech.RecognitionListener;
import android.speech.SpeechRecognizer;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.GeolocationPermissions;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceResponse;
import android.media.AudioManager;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import org.json.JSONArray;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.widget.Toast;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.speech.RecognizerIntent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import java.util.Calendar;

import java.util.Locale;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 501;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 701;
    private static final int VOICE_INPUT_REQUEST = 502;
    private static final int MICROPHONE_PERMISSION_REQUEST = 702;
    private static final int LOCATION_PERMISSION_REQUEST = 703;
    private WebView webView;
    private OnBackInvokedCallback systemBackCallback;
    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraPhotoUri;
    private File cameraOutputFile;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean ttsFailed = false;
    private String checkinVoiceTurnId = "";
    private long checkinListenWindowMs = 2500;
    private long checkinRecognitionGeneration = 0;
    private String pendingSpeech;
    private static final String LOCAL_ORIGIN="https://appassets.androidplatform.net";
    private PermissionRequest pendingAudioPermission;
    private String pendingOriginData;
    private volatile boolean journalMigrationAllowed=false;
    private JSONArray journalMigrationEntries;
    private String pendingCallAction;
    private boolean communicationAudioActive=false;
    private String activeCallId;
    private String pendingOpenTab;
    private String pendingTherapySlot;
    private String pendingChatMessageId;
    private String pendingIntakeAction;
    private BleDeviceConnector bleConnector;
    private PhoneHealthConnector phoneHealth;
    private String bleRequestId="";
    private String pendingCheckinAction;
    private boolean pendingVoiceInput = false;
    private boolean pendingCheckinVoice = false;
    private SpeechRecognizer checkinRecognizer;
    private String checkinPartial = "";
    private final Handler checkinHandler = new Handler(Looper.getMainLooper());
    private Runnable checkinStopTask;
    private Runnable checkinResultTimeout;
    private boolean pendingWakeEnable = false;
    private boolean mediWakeEnabled = false;
    private boolean mediWakeListening = false;
    private boolean mediWakeSuspended = false;
    private boolean mediForeground = false;
    private int mediWakeErrors = 0;
    private SpeechRecognizer mediRecognizer;
    private final Handler mediWakeHandler = new Handler(Looper.getMainLooper());
    private final Runnable mediWakeRetry = this::startMediWakeListening;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bleConnector=new BleDeviceConnector(this,event->runOnUiThread(()->{if(webView!=null)webView.evaluateJavascript("window.onMeditalyBleEvent && window.onMeditalyBleEvent("+event.toString()+")",null);}));

        phoneHealth=new PhoneHealthConnector(this,event->runOnUiThread(()->{if(webView!=null)webView.evaluateJavascript("window.onMeditalyPhoneHealth && window.onMeditalyPhoneHealth("+event.toString()+")",null);}));
        MeditalyMessagingService.ensureChannel(this);
        LocalReminderReceiver.ensureChannels(this);
        pendingCallAction = extractCallAction(getIntent());
        pendingOpenTab = extractRequestedTab(getIntent());
        pendingTherapySlot = extractTherapySlot(getIntent());
        pendingChatMessageId = extractChatMessageId(getIntent());
        pendingIntakeAction = extractIntakeAction(getIntent());
        pendingCheckinAction = extractCheckinAction(getIntent());
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int result = tts.setLanguage(Locale.ITALIAN);
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(Locale.getDefault());
                }
                if (tts.getVoices() != null) {
                    Voice best = null;
                    for (Voice voice : tts.getVoices()) {
                        if (!"it".equals(voice.getLocale().getLanguage()) || voice.isNetworkConnectionRequired()) continue;
                        if (best == null || voice.getQuality() > best.getQuality()) best = voice;
                    }
                    if (best != null) tts.setVoice(best);
                }
                tts.setSpeechRate(0.95f);
                tts.setPitch(1.0f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { runOnUiThread(() -> stopMediWakeListening()); }
                    @Override public void onDone(String id) { runOnUiThread(() -> { if (("meditaly_medi".equals(id) || "meditaly_welcome".equals(id)) && webView != null) webView.evaluateJavascript("window.onMediSpeechDone && window.onMediSpeechDone()", null); scheduleMediWake(700); }); }
                    @Override public void onError(String id) { runOnUiThread(() -> notifyMediSpeechError()); }
                });
                runOnUiThread(() -> {
                    ttsReady = true;
                    if (pendingSpeech != null && tts != null) {
                        String text = pendingSpeech;
                        pendingSpeech = null;
                        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "meditaly_welcome") == TextToSpeech.ERROR) notifyMediSpeechError();
                    }
                });
            } else {
                ttsFailed = true;
                runOnUiThread(() -> { pendingSpeech = null; notifyMediSpeechError(); });
            }
        });
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }

        webView = new WebView(this);
        setContentView(webView);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            systemBackCallback = this::handleMeditalyBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, systemBackCallback);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request){
                runOnUiThread(()->{
                    if(!trustedAudioOrigin(request.getOrigin())) {request.deny();return;}
                    java.util.ArrayList<String> missing=new java.util.ArrayList<>();
                    for(String resource:request.getResources()){
                        String permission;
                        if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) permission=Manifest.permission.RECORD_AUDIO;
                        else if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) permission=Manifest.permission.CAMERA;
                        else {request.deny();return;}
                        if(checkSelfPermission(permission)!=PackageManager.PERMISSION_GRANTED) missing.add(permission);
                    }
                    if(missing.isEmpty()){request.grant(request.getResources());return;}
                    if(pendingAudioPermission!=null){request.deny();return;}
                    pendingAudioPermission=request;requestPermissions(missing.toArray(new String[0]),814);
                });
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request){runOnUiThread(()->{if(pendingAudioPermission==request)pendingAudioPermission=null;});}
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                    return;
                }
                pendingGeoOrigin = origin;
                pendingGeoCallback = callback;
                requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST);
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;
                // I referti vengono acquisiti direttamente con la fotocamera.
                // L'input HTML usa capture=environment; quando è attivo apriamo
                // esclusivamente la fotocamera posteriore invece del file picker.
                // Rispetta il flag HTML capture: solo gli input che chiedono esplicitamente
                // la fotocamera aprono direttamente ACTION_IMAGE_CAPTURE. Gli input image/*
                // senza capture restano disponibili per galleria/file picker.
                boolean wantsCameraCapture = fileChooserParams.isCaptureEnabled();
                if (wantsCameraCapture) {
                    String[] accepted = fileChooserParams.getAcceptTypes();
                    String accept = accepted != null && accepted.length > 0 && accepted[0] != null ? accepted[0] : "";
                    if (accept.startsWith("audio/")) {
                        Intent audioIntent = new Intent(MediaStore.Audio.Media.RECORD_SOUND_ACTION);
                        if (audioIntent.resolveActivity(getPackageManager()) == null) {
                            // Some Android devices have no sound-recorder application.
                            // Let the patient select an existing recording instead.
                            Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                            picker.addCategory(Intent.CATEGORY_OPENABLE);
                            picker.setType("audio/*");
                            try {
                                startActivityForResult(picker, FILE_CHOOSER_REQUEST);
                                return true;
                            } catch (Exception e) {
                                MainActivity.this.filePathCallback.onReceiveValue(null);
                                MainActivity.this.filePathCallback = null;
                                return true;
                            }
                        }
                        cameraPhotoUri = null;
                        cameraOutputFile = null;
                        startActivityForResult(audioIntent, FILE_CHOOSER_REQUEST);
                        return true;
                    }
                    boolean videoCapture = accept.startsWith("video/");
                    Intent cameraIntent = new Intent(videoCapture ? MediaStore.ACTION_VIDEO_CAPTURE : MediaStore.ACTION_IMAGE_CAPTURE);
                    if (cameraIntent.resolveActivity(getPackageManager()) == null) {
                        MainActivity.this.filePathCallback.onReceiveValue(null);
                        MainActivity.this.filePathCallback = null;
                        Toast.makeText(MainActivity.this, videoCapture ? "Fotocamera video non disponibile" : "Fotocamera non disponibile", Toast.LENGTH_LONG).show();
                        return true;
                    }
                    try {
                        File captureDir = new File(getExternalFilesDir(videoCapture ? Environment.DIRECTORY_MOVIES : Environment.DIRECTORY_PICTURES), videoCapture ? "journal" : "reports");
                        if (!captureDir.exists() && !captureDir.mkdirs()) {
                            throw new IOException("Impossibile creare la cartella immagini");
                        }
                        File photoFile = File.createTempFile(videoCapture ? "meditaly_journal_" : "meditaly_report_", videoCapture ? ".mp4" : ".jpg", captureDir);
                        cameraOutputFile = photoFile;
                        cameraPhotoUri = FileProvider.getUriForFile(
                                MainActivity.this,
                                getPackageName() + ".fileprovider",
                                photoFile
                        );
                        cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                        if (videoCapture) {
                            cameraIntent.putExtra(MediaStore.EXTRA_SIZE_LIMIT, 45L * 1024 * 1024);
                        }
                        cameraIntent.setClipData(ClipData.newRawUri("meditaly_report", cameraPhotoUri));
                        cameraIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivityForResult(cameraIntent, FILE_CHOOSER_REQUEST);
                        return true;
                    } catch (Exception e) {
                        cameraPhotoUri = null;
                        cameraOutputFile = null;
                        MainActivity.this.filePathCallback = null;
                        return false;
                    }
                }

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
            }
        });
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if(!trustedAudioOrigin(uri))return null;
                String path=uri.getPath();if(path==null||!path.startsWith("/assets/")||path.contains(".."))return emptyAsset();
                String asset=path.substring(8);
                try{
                    if(asset.startsWith("migration-data/")){
                        String filename=asset.substring(15);
                        if(!("manifest.json".equals(filename)||filename.matches("(?i)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\\.bin")))return emptyAsset();
                        File file=new File(getFilesDir(),"journal-origin-migration/"+filename);
                        return new WebResourceResponse(filename.endsWith(".json")?"application/json":"application/octet-stream","UTF-8",new FileInputStream(file));
                    }
                    if("origin-import.html".equals(asset)){
                        String data=pendingOriginData==null?"{}":pendingOriginData;
                        String encoded=android.util.Base64.encodeToString(data.getBytes(StandardCharsets.UTF_8),android.util.Base64.NO_WRAP);
                        String page="<!doctype html><meta charset='utf-8'><p>Conservo il diario Meditaly…</p><script src='origin-import.js'></script><script>try{const d=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('"+encoded+"'),c=>c.charCodeAt(0))));for(const k of Object.keys(d)){if(localStorage.getItem(k)===null)localStorage.setItem(k,d[k]);}importLegacyJournal().then(()=>AndroidBridge.completeOriginMigration()).catch(()=>document.querySelector('p').textContent='Diario non ancora trasferito. Il diario originale è conservato. Libera spazio e riapri Meditaly.');}catch(e){document.querySelector('p').textContent='Aggiornamento non riuscito. Chiudi e riapri Meditaly.';}</script>";
                        return new WebResourceResponse("text/html","UTF-8",new ByteArrayInputStream(page.getBytes(StandardCharsets.UTF_8)));
                    }
                    String mime=asset.endsWith(".js")?"application/javascript":asset.endsWith(".css")?"text/css":asset.endsWith(".html")?"text/html":asset.endsWith(".json")?"application/json":asset.endsWith(".svg")?"image/svg+xml":asset.endsWith(".png")?"image/png":asset.endsWith(".jpg")?"image/jpeg":asset.endsWith(".woff2")?"font/woff2":"application/octet-stream";
                    return new WebResourceResponse(mime,"UTF-8",getAssets().open(asset));
                }catch(Exception ignored){return emptyAsset();}
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if(trustedAudioOrigin(request.getUrl()))return false;
                if (url.startsWith("tel:")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse(url)));
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Impossibile aprire il tastierino telefonico", Toast.LENGTH_SHORT).show();
                    }
                    return true;
                }
                if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("otpauth://")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    } catch (Exception e) {
                        if (url.startsWith("otpauth://")) {
                            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.authenticator2"))); } catch (Exception ignored) {}
                        }
                    }
                    return true;
                }
                return false;
            }
        });

        if(getSharedPreferences("meditaly_origin",MODE_PRIVATE).getBoolean("migrated",false)&&getSharedPreferences("meditaly_origin",MODE_PRIVATE).getBoolean("journal_migrated",false)){webView.getSettings().setAllowFileAccess(false);webView.loadUrl(LOCAL_ORIGIN+"/assets/index.html");}
        else {journalMigrationAllowed=true;webView.loadUrl("file:///android_asset/index.html");}
    }

    private static boolean trustedAudioOrigin(Uri uri){return uri!=null&&"https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443);}
    private static WebResourceResponse emptyAsset(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
    private String extractCallAction(Intent intent){
        if(intent==null)return null;String id=intent.getStringExtra("meditaly_call_id"),action=intent.getStringExtra("meditaly_call_action");
        if(!VoiceCallNotifications.validId(id))return null;if(!("answer".equals(action)||"reject".equals(action)))action="open";
        try{return new JSONObject().put("id",id).put("action",action).toString();}catch(Exception ignored){return null;}
    }
    public class AndroidBridge {
        @JavascriptInterface public boolean isLegacyMigrationPending(){return journalMigrationAllowed;}
        @JavascriptInterface public boolean shouldCopyLegacyStorage(){return !getSharedPreferences("meditaly_origin",MODE_PRIVATE).getBoolean("migrated",false);}
        @JavascriptInterface public synchronized boolean beginJournalOriginMigration(){
            if(!journalMigrationAllowed)return false;File directory=new File(getFilesDir(),"journal-origin-migration");
            if(directory.exists()){File[] files=directory.listFiles();if(files!=null)for(File file:files)if(!file.delete())return false;}
            else if(!directory.mkdirs())return false;journalMigrationEntries=new JSONArray();return true;
        }
        @JavascriptInterface public synchronized boolean writeJournalOriginChunk(String id,int offset,String encoded){
            if(!journalMigrationAllowed||journalMigrationEntries==null||!VoiceCallNotifications.validId(id)||offset<0||encoded==null||encoded.length()>270000)return false;
            try{File file=new File(getFilesDir(),"journal-origin-migration/"+id+".bin");if(file.length()!=offset)return false;byte[] bytes=android.util.Base64.decode(encoded,android.util.Base64.DEFAULT);
                try(FileOutputStream output=new FileOutputStream(file,offset!=0)){output.write(bytes);}return true;
            }catch(Exception ignored){return false;}
        }
        @JavascriptInterface public synchronized boolean addJournalOriginEntry(String metadata){
            if(!journalMigrationAllowed||journalMigrationEntries==null||metadata==null||metadata.length()>100000)return false;
            try{JSONObject entry=new JSONObject(metadata);String id=entry.getString("id");if(!VoiceCallNotifications.validId(id))return false;
                if(entry.has("media_file")){if(!(id+".bin").equals(entry.getString("media_file")))return false;File file=new File(getFilesDir(),"journal-origin-migration/"+id+".bin");if(!file.exists()||file.length()!=entry.getLong("media_bytes"))return false;}
                journalMigrationEntries.put(entry);return true;
            }catch(Exception ignored){return false;}
        }
        @JavascriptInterface public synchronized boolean finishJournalOriginExport(){
            if(!journalMigrationAllowed||journalMigrationEntries==null)return false;
            try(FileOutputStream output=new FileOutputStream(new File(getFilesDir(),"journal-origin-migration/manifest.json"))){output.write(journalMigrationEntries.toString().getBytes(StandardCharsets.UTF_8));return true;}catch(Exception ignored){return false;}
        }
        @JavascriptInterface public void migrateLocalOrigin(String data){runOnUiThread(()->{
            if(!"file:///android_asset/index.html".equals(webView.getUrl())||data==null||data.length()>10000000)return;
            try{new JSONObject(data);journalMigrationAllowed=false;pendingOriginData=data;webView.loadUrl(LOCAL_ORIGIN+"/assets/origin-import.html");}catch(Exception ignored){}
        });}
        @JavascriptInterface public void completeOriginMigration(){runOnUiThread(()->{
            if(!(LOCAL_ORIGIN+"/assets/origin-import.html").equals(webView.getUrl()))return;
            getSharedPreferences("meditaly_origin",MODE_PRIVATE).edit().putBoolean("migrated",true).putBoolean("journal_migrated",true).apply();pendingOriginData=null;journalMigrationEntries=null;
            File[] migrationFiles=new File(getFilesDir(),"journal-origin-migration").listFiles();if(migrationFiles!=null)for(File file:migrationFiles)file.delete();
            webView.getSettings().setAllowFileAccess(false);webView.loadUrl(LOCAL_ORIGIN+"/assets/index.html");
        });}
        @JavascriptInterface public String consumeInitialCall(){String action=pendingCallAction;pendingCallAction=null;return action==null?"":action;}
        @JavascriptInterface public void dismissCallNotification(String id){VoiceCallNotifications.dismiss(MainActivity.this,id);}
        @JavascriptInterface public void setCommunicationAudioActive(boolean enabled){runOnUiThread(()->{
            communicationAudioActive=enabled;if(enabled){stopMediWakeListening();if(tts!=null)tts.stop();if(checkinRecognizer!=null)finishDailyCheckinListening("");stopService(new Intent(MainActivity.this,it.meditaly.app.medi.MediHandsFreeService.class));}else scheduleMediWake(800);
        });}
        @JavascriptInterface public void setCallAudioActive(String id,boolean enabled){runOnUiThread(()->{
            if(!VoiceCallNotifications.validId(id))return;
            if(enabled){if(activeCallId!=null)return;if(!mediForeground||checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED)return;activeCallId=id;communicationAudioActive=true;
                try{startForegroundService(new Intent(MainActivity.this,VoiceCallService.class).putExtra("call_id",id));}catch(Exception ignored){activeCallId=null;}
                AudioManager audio=(AudioManager)getSystemService(AUDIO_SERVICE);if(audio!=null)audio.setMode(AudioManager.MODE_IN_COMMUNICATION);
            }else if(id.equals(activeCallId)){activeCallId=null;stopService(new Intent(MainActivity.this,VoiceCallService.class));AudioManager audio=(AudioManager)getSystemService(AUDIO_SERVICE);if(audio!=null){audio.setSpeakerphoneOn(false);audio.setMode(AudioManager.MODE_NORMAL);}}
        });}
        @JavascriptInterface public void setCallSpeaker(boolean enabled){runOnUiThread(()->{if(activeCallId==null)return;AudioManager audio=(AudioManager)getSystemService(AUDIO_SERVICE);if(audio!=null)audio.setSpeakerphoneOn(enabled);});}
        @JavascriptInterface public void phoneHealthAvailability(String id){runOnUiThread(()->phoneHealth.availability(id));}
        @JavascriptInterface public void connectPhoneHealth(String id){runOnUiThread(()->phoneHealth.request(id));}
        @JavascriptInterface public void readPhoneHealth(String id){runOnUiThread(()->phoneHealth.read(id));}
        @JavascriptInterface public void cancelPhoneHealth(){runOnUiThread(()->phoneHealth.cancel());}
        @JavascriptInterface public void phoneHealthSettings(){runOnUiThread(()->phoneHealth.settings());}
        @JavascriptInterface public void scanBleDevices(String id){runOnUiThread(()->{
            if(!phoneHealth.valid(id))return;bleRequestId=id;
            if(!bleConnector.permitted()){
                requestPermissions(Build.VERSION.SDK_INT>=31?new String[]{Manifest.permission.BLUETOOTH_SCAN,Manifest.permission.BLUETOOTH_CONNECT}:new String[]{Manifest.permission.ACCESS_FINE_LOCATION},812);
            }else bleConnector.scan(bleRequestId);
        });}
        @JavascriptInterface public void openBluetoothSettings(){runOnUiThread(()->{try{startActivity(new Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS));}catch(Exception ignored){}});}
        @JavascriptInterface public void stopBleScan(){runOnUiThread(()->bleConnector.stop());}
        @JavascriptInterface public void connectBleDevice(String address){runOnUiThread(()->bleConnector.connect(address));}
        @JavascriptInterface public void disconnectBleDevice(){runOnUiThread(()->bleConnector.disconnect());}

        @JavascriptInterface
        public void reverseGeocodeForAsl(String requestId, double latitude, double longitude) {
            if (requestId == null || requestId.length() > 64 || !Double.isFinite(latitude) || !Double.isFinite(longitude)
                    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
            new Thread(() -> {
                String city = "", province = "";
                try {
                    // Solo il comune e la provincia tornano alla pagina; non memorizziamo coordinate GPS.
                    Geocoder geocoder = new Geocoder(MainActivity.this, Locale.ITALIAN);
                    @SuppressWarnings("deprecation")
                    List<Address> addresses = geocoder.getFromLocation(latitude, longitude, 1);
                    if (addresses != null && !addresses.isEmpty()) {
                        Address address = addresses.get(0);
                        city = address.getLocality() == null ? "" : address.getLocality();
                        String area = address.getSubAdminArea() == null ? "" : address.getSubAdminArea();
                        if (area.toLowerCase(Locale.ITALIAN).contains("napoli")) province = "NA";
                        else if (area.matches("(?i)[A-Z]{2}")) province = area.toUpperCase(Locale.ITALIAN);
                    }
                } catch (Exception ignored) { /* La posizione potrebbe non essere risolvibile offline. */ }
                try {
                    JSONObject place = new JSONObject().put("city", city).put("province", province);
                    String script = "window.meditalyReverseGeocodeResult && window.meditalyReverseGeocodeResult("
                            + JSONObject.quote(requestId) + "," + JSONObject.quote(place.toString()) + ")";
                    runOnUiThread(() -> { if (webView != null) webView.evaluateJavascript(script, null); });
                } catch (Exception ignored) { }
            }).start();
        }

        @JavascriptInterface
        public String consumeInitialCheckinAction() {
            String action = pendingCheckinAction;
            pendingCheckinAction = null;
            if (action != null) pendingOpenTab = null;
            return action == null ? "" : action;
        }

        @JavascriptInterface
        public String consumeInitialIntakeAction() {
            String action=pendingIntakeAction;pendingIntakeAction=null;
            if(action!=null){pendingOpenTab=null;pendingTherapySlot=null;}
            return action==null?"":action;
        }

        @JavascriptInterface
        public String consumeInitialTab() {
            String tab = pendingOpenTab;
            pendingOpenTab = null;
            return tab == null ? "" : tab;
        }

        @JavascriptInterface
        public String consumeInitialTherapySlot() {
            String slot = pendingTherapySlot;
            pendingTherapySlot = null;
            return slot == null ? "" : slot;
        }

        @JavascriptInterface
        public String consumeInitialChatMessageId() {
            String id = pendingChatMessageId;
            pendingChatMessageId = null;
            return id == null ? "" : id;
        }

        @JavascriptInterface
        public void requestPushToken() {
            runOnUiThread(() -> {
                try {
                    if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        notifyPushUnavailable("Autorizzazione notifiche Android non concessa");
                        return;
                    }
                    FirebaseApp.initializeApp(MainActivity.this);
                    if (FirebaseApp.getApps(MainActivity.this).isEmpty()) {
                        notifyPushUnavailable("Firebase non configurato");
                        return;
                    }
                    FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                        if (!task.isSuccessful() || task.getResult() == null) {
                            notifyPushUnavailable("Token FCM non disponibile");
                            return;
                        }
                        String token = jsEscape(task.getResult());
                        if (webView != null) {
                            webView.evaluateJavascript("window.onMeditalyPushToken && window.onMeditalyPushToken('" + token + "')", null);
                        }
                    });
                } catch (Exception e) {
                    notifyPushUnavailable("Firebase non configurato");
                }
            });
        }


        @JavascriptInterface
        public void cancelDailyReminder(String key) {
            runOnUiThread(() -> {
                if (key == null || key.isEmpty()) return;
                if (key.startsWith("checkin-")) {
                    CheckinAlarmScheduler.remove(MainActivity.this, key);
                    return;
                }
                AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                Intent intent = new Intent(MainActivity.this, LocalReminderReceiver.class);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        MainActivity.this, key.hashCode(), intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
                );
                if (pendingIntent != null) {
                    if (alarmManager != null) alarmManager.cancel(pendingIntent);
                    pendingIntent.cancel();
                }
            });
        }

        @JavascriptInterface
        public void scheduleMedicationReminderNamed(String key, int hour, int minute, String weekdays, String startsOn, String endsOn, String name, String dose, String patient) {
            runOnUiThread(() -> {
                try {
                    AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                    Intent intent = new Intent(MainActivity.this, LocalReminderReceiver.class);
                    intent.putExtra("reminder_type", "therapy");
                    intent.putExtra("medication_name", name);
                    intent.putExtra("medication_dose", dose);
                    intent.putExtra("intake_patient", patient);
                    intent.putExtra("intake_schedule", key == null ? "" : key.replaceFirst("^med-", ""));
                    intent.putExtra("reminder_slot", String.format(Locale.ROOT, "%02d:%02d", hour, minute));
                    intent.putExtra("reminder_dedupe", patient + ":" + key);
                    intent.putExtra("reminder_weekdays", weekdays == null ? "" : weekdays);
                    intent.putExtra("reminder_starts_on", startsOn == null ? "" : startsOn);
                    intent.putExtra("reminder_ends_on", endsOn == null ? "" : endsOn);
                    PendingIntent pendingIntent = PendingIntent.getBroadcast(MainActivity.this,
                            (key == null ? "meditaly" : key).hashCode(), intent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    Calendar next = Calendar.getInstance();
                    next.set(Calendar.HOUR_OF_DAY, hour);
                    next.set(Calendar.MINUTE, minute);
                    next.set(Calendar.SECOND, 0);
                    next.set(Calendar.MILLISECOND, 0);
                    if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 1);
                    if (alarmManager != null) alarmManager.setInexactRepeating(AlarmManager.RTC_WAKEUP,
                            next.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pendingIntent);
                } catch (Exception e) { android.util.Log.w("Meditaly", "Promemoria terapia non programmato", e); }
            });
        }

        @JavascriptInterface
        public boolean snoozeCheckin(String patient, int minutes) {
            return CheckinAlarmScheduler.snooze(MainActivity.this, "checkin-" + patient, minutes);
        }
        @JavascriptInterface
        public void completeCheckin(String patient) {
            String key = "checkin-" + patient;
            if(!CheckinAlarmScheduler.owns(MainActivity.this,key))return;
            CheckinAlarmScheduler.cancelSnooze(MainActivity.this,key);
            ReminderDedupe.markShown(MainActivity.this,java.time.LocalDate.now(java.time.ZoneId.of("Europe/Rome")).toString(),key);
        }

        @JavascriptInterface
        public void scheduleDailyReminder(String key, int hour, int minute, String type) {
            runOnUiThread(() -> {
                try {
                    if ("checkin".equals(type)) {
                        if (hour == 9 && minute == 0) CheckinAlarmScheduler.saveAndSchedule(MainActivity.this, key);
                        return;
                    }
                    AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                    Intent intent = new Intent(MainActivity.this, LocalReminderReceiver.class);
                    intent.putExtra("reminder_type", type == null ? "therapy" : type);
                    intent.putExtra("reminder_key", key);
                    int requestCode = (key == null ? "meditaly" : key).hashCode();
                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            MainActivity.this, requestCode, intent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    Calendar next = Calendar.getInstance();
                    next.set(Calendar.HOUR_OF_DAY, hour);
                    next.set(Calendar.MINUTE, minute);
                    next.set(Calendar.SECOND, 0);
                    next.set(Calendar.MILLISECOND, 0);
                    if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 1);
                    if (alarmManager != null) {
                        alarmManager.setInexactRepeating(
                                AlarmManager.RTC_WAKEUP,
                                next.getTimeInMillis(),
                                AlarmManager.INTERVAL_DAY,
                                pendingIntent
                        );
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void scheduleOneTimeReminder(String key, long epochMillis, String type) {
            runOnUiThread(() -> {
                try {
                    if (epochMillis <= System.currentTimeMillis()) return;
                    AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                    Intent intent = new Intent(MainActivity.this, LocalReminderReceiver.class);
                    intent.putExtra("reminder_type", type == null ? "control" : type);
                    int requestCode = (key == null ? "meditaly-once" : key).hashCode();
                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            MainActivity.this, requestCode, intent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    if (alarmManager != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, epochMillis, pendingIntent);
                        } else {
                            alarmManager.set(AlarmManager.RTC_WAKEUP, epochMillis, pendingIntent);
                        }
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void openAuthenticator(String uri) {
            runOnUiThread(() -> {
                try {
                    if (uri != null && uri.startsWith("otpauth://")) {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
                        startActivity(intent);
                    } else {
                        Intent launch = getPackageManager().getLaunchIntentForPackage("com.google.android.apps.authenticator2");
                        if (launch != null) startActivity(launch);
                        else startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.apps.authenticator2")));
                    }
                } catch (Exception e) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2")));
                    } catch (Exception ignored) {}
                }
            });
        }

        @JavascriptInterface
        public void copyText(String text) {
            runOnUiThread(() -> {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(ClipData.newPlainText("Meditaly 2FA", text == null ? "" : text));
                Toast.makeText(MainActivity.this, "Chiave copiata", Toast.LENGTH_SHORT).show();
            });
        }

        @JavascriptInterface
        public void speak(String text) {
            runOnUiThread(() -> {
                if (text == null || text.trim().isEmpty()) return;
                if (tts == null || ttsFailed) { notifyMediSpeechError(); return; }
                if (!ttsReady) { pendingSpeech = text; return; }
                tts.stop();
                if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "meditaly_medi") == TextToSpeech.ERROR) notifyMediSpeechError();
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(() -> { pendingSpeech = null; if (tts != null) tts.stop(); });
        }

        @JavascriptInterface
        public void startVoiceInput() {
            runOnUiThread(() -> {
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    pendingVoiceInput = true;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION_REQUEST);
                    return;
                }
                launchVoiceInput();
            });
        }

        @JavascriptInterface
        public void listenForDailyCheckin() {
            runOnUiThread(() -> {
                cancelDailyCheckinListening();
                checkinVoiceTurnId = "";
                checkinListenWindowMs = 2500;
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    pendingCheckinVoice = true;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION_REQUEST);
                    return;
                }
                startDailyCheckinListening();
            });
        }

        @JavascriptInterface
        public void cancelMediTurn() {
            runOnUiThread(() -> cancelDailyCheckinListening());
        }

        @JavascriptInterface
        public void listenForMediTurn(String turnId, int milliseconds) {
            runOnUiThread(() -> {
                cancelDailyCheckinListening();
                checkinVoiceTurnId = turnId == null ? "" : turnId;
                checkinListenWindowMs = Math.max(2500, Math.min(milliseconds, 15000));
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    pendingCheckinVoice = true;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION_REQUEST);
                    return;
                }
                startDailyCheckinListening();
            });
        }

        @JavascriptInterface
        public void openMediGemini() {
            runOnUiThread(() -> {
                mediWakeEnabled = false;
                stopMediWakeListening();
                if (checkinRecognizer != null) finishDailyCheckinListening("");
                if (tts != null) tts.stop();
                startActivity(new Intent(MainActivity.this, it.meditaly.app.medi.MediGeminiActivity.class));
            });
        }

        @JavascriptInterface
        public void setMediWakeEnabled(boolean enabled) {
            runOnUiThread(() -> {
                if (enabled && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    pendingWakeEnable = true;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION_REQUEST);
                    return;
                }
                mediWakeEnabled = enabled;
                mediWakeSuspended = false;
                if (enabled) startMediWakeListening(); else stopMediWakeListening();
                notifyMediWakeState(enabled ? "active" : "off");
            });
        }

        @JavascriptInterface
        public void shareText(String title, String text) {
            runOnUiThread(() -> {
                try {
                    Intent share = new Intent(Intent.ACTION_SEND);
                    share.setType("text/plain");
                    share.putExtra(Intent.EXTRA_SUBJECT, title == null ? "Meditaly" : title);
                    share.putExtra(Intent.EXTRA_TEXT, text == null ? "" : text);
                    startActivity(Intent.createChooser(share, "Condividi referto"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Condivisione non disponibile", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void ocrImage(String dataUrl) {
            if (dataUrl == null || dataUrl.trim().isEmpty()) return;
            try {
                String raw = dataUrl;
                int comma = raw.indexOf(',');
                if (comma >= 0) raw = raw.substring(comma + 1);
                byte[] bytes = Base64.decode(raw, Base64.DEFAULT);
                Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (bitmap == null) {
                    notifyOcrError("Immagine non leggibile");
                    return;
                }
                InputImage image = InputImage.fromBitmap(bitmap, 0);
                TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                        .process(image)
                        .addOnSuccessListener(result -> {
                            String text = jsEscape(result.getText());
                            if (webView != null) webView.evaluateJavascript(
                                    "window.onMeditalyOcrResult && window.onMeditalyOcrResult('" + text + "')", null);
                        })
                        .addOnFailureListener(e -> notifyOcrError("Testo non riconosciuto"));
            } catch (Exception e) {
                notifyOcrError("Errore durante la lettura della foto");
            }
        }

    }

    private void launchVoiceInput() {
        try {
            mediWakeSuspended = true;
            stopMediWakeListening();
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT");
            intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Parla con Medi");
            startActivityForResult(intent, VOICE_INPUT_REQUEST);
        } catch (Exception e) {
            if (webView != null) webView.evaluateJavascript("window.onMeditalyVoiceInput && window.onMeditalyVoiceInput('')", null);
            mediWakeSuspended = false;
            scheduleMediWake(1000);
        }
    }

    private void cancelDailyCheckinListening() {
        checkinRecognitionGeneration++;
        pendingCheckinVoice = false;
        checkinVoiceTurnId = "";
        if (checkinStopTask != null) checkinHandler.removeCallbacks(checkinStopTask);
        if (checkinResultTimeout != null) checkinHandler.removeCallbacks(checkinResultTimeout);
        if (checkinRecognizer != null) { checkinRecognizer.cancel(); checkinRecognizer.destroy(); checkinRecognizer = null; }
        checkinStopTask = null;
        checkinResultTimeout = null;
        mediWakeSuspended = false;
    }

    private void finishDailyCheckinListening(String spoken) {
        if (checkinRecognizer == null) return;
        checkinRecognitionGeneration++;
        if (checkinStopTask != null) checkinHandler.removeCallbacks(checkinStopTask);
        if (checkinResultTimeout != null) checkinHandler.removeCallbacks(checkinResultTimeout);
        checkinRecognizer.destroy();
        checkinRecognizer = null;
        checkinStopTask = null;
        checkinResultTimeout = null;
        mediWakeSuspended = false;
        scheduleMediWake(900);
        deliverCheckinSpeech(spoken);
    }

    private void deliverCheckinSpeech(String spoken) {
        String turnId = checkinVoiceTurnId;
        checkinVoiceTurnId = "";
        if (webView == null) return;
        if (!turnId.isEmpty()) webView.evaluateJavascript("window.onMeditalyMediTurnInput && window.onMeditalyMediTurnInput(" + JSONObject.quote(turnId) + "," + JSONObject.quote(spoken == null ? "" : spoken) + ")", null);
        else webView.evaluateJavascript("window.onMeditalyCheckinVoiceInput && window.onMeditalyCheckinVoiceInput(" + JSONObject.quote(spoken == null ? "" : spoken) + ")", null);
    }

    private void startDailyCheckinListening() {
        if (checkinRecognizer != null) finishDailyCheckinListening("");
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            deliverCheckinSpeech("");
            return;
        }
        mediWakeSuspended = true;
        stopMediWakeListening();
        checkinPartial = "";
        checkinRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        final long generation = ++checkinRecognitionGeneration;
        checkinRecognizer.setRecognitionListener(new RecognitionListener() {
            private boolean current() { return generation == checkinRecognitionGeneration && checkinRecognizer != null; }
            @Override public void onReadyForSpeech(Bundle params) {
                if (!current()) return;
                checkinStopTask = () -> {
                    if (current()) {
                        checkinRecognizer.stopListening();
                        checkinResultTimeout = () -> finishDailyCheckinListening(checkinPartial);
                        checkinHandler.postDelayed(checkinResultTimeout, 2500);
                    }
                };
                checkinHandler.postDelayed(checkinStopTask, checkinListenWindowMs);
            }
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onPartialResults(Bundle results) {
                if (!current()) return;
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) checkinPartial = matches.get(0);
            }
            @Override public void onResults(Bundle results) {
                if (!current()) return;
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                finishDailyCheckinListening(matches != null && !matches.isEmpty() ? matches.get(0) : checkinPartial);
            }
            @Override public void onError(int error) { if (current()) finishDailyCheckinListening(checkinPartial); }
            @Override public void onEvent(int type, Bundle params) {}
        });
        Intent request = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        request.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        request.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT");
        request.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        try { checkinRecognizer.startListening(request); }
        catch (Exception error) { finishDailyCheckinListening(""); }
    }

    private void notifyMediSpeechError() {
        if (webView != null) webView.evaluateJavascript("window.onMediSpeechError && window.onMediSpeechError()", null);
    }

    private void notifyMediWakeState(String status) {
        if (webView != null) webView.evaluateJavascript("window.onMediWakeState && window.onMediWakeState('" + status + "')", null);
    }

    private void stopMediWakeListening() {
        mediWakeHandler.removeCallbacks(mediWakeRetry);
        mediWakeListening = false;
        if (mediRecognizer != null) {
            mediRecognizer.destroy();
            mediRecognizer = null;
        }
    }

    private void scheduleMediWake(long delayMs) {
        mediWakeHandler.removeCallbacks(mediWakeRetry);
        if (mediWakeEnabled && mediForeground && !mediWakeSuspended && !communicationAudioActive)
            mediWakeHandler.postDelayed(mediWakeRetry, delayMs);
    }

    private void startMediWakeListening() {
        if (!mediWakeEnabled || !mediForeground || mediWakeSuspended || mediWakeListening || communicationAudioActive) return;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return;
        if (tts != null && tts.isSpeaking()) { scheduleMediWake(1000); return; }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            mediWakeEnabled = false;
            notifyMediWakeState("unavailable");
            return;
        }
        stopMediWakeListening();
        mediRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        mediRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onPartialResults(Bundle results) {}
            @Override public void onEvent(int type, Bundle params) {}
            @Override public void onError(int error) {
                stopMediWakeListening();
                mediWakeErrors = Math.min(5, mediWakeErrors + 1);
                scheduleMediWake(Math.min(30000, 1000L << mediWakeErrors));
            }
            @Override public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String spoken = matches != null && !matches.isEmpty() ? matches.get(0) : "";
                stopMediWakeListening();
                mediWakeErrors = 0;
                String normalized = java.text.Normalizer.normalize(spoken.toLowerCase(Locale.ITALIAN), java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "");
                if (normalized.matches(".*\\b(ehi|hey|hei|ei)\\s+medi\\b.*")) {
                    mediWakeSuspended = true;
                    if (webView != null) webView.evaluateJavascript("window.onMediWakeDetected && window.onMediWakeDetected(" + org.json.JSONObject.quote(spoken) + ")", null);
                    mediWakeHandler.postDelayed(() -> { mediWakeSuspended = false; scheduleMediWake(800); }, 12000);
                } else scheduleMediWake(650);
            }
        });
        Intent request = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        request.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        request.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT");
        request.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        try { mediWakeListening = true; mediRecognizer.startListening(request); }
        catch (Exception e) { stopMediWakeListening(); scheduleMediWake(2200); }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if(requestCode==814){
            PermissionRequest request=pendingAudioPermission;pendingAudioPermission=null;
            if(request!=null){
                boolean allowed=trustedAudioOrigin(request.getOrigin());
                for(String resource:request.getResources()){
                    if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) allowed &= checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED;
                    else if(PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) allowed &= checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED;
                    else allowed=false;
                }
                if(allowed)request.grant(request.getResources());else request.deny();
            }
            return;
        }
        if(requestCode==813){phoneHealth.afterPermissions();return;}
        if(requestCode==812){if(bleConnector.permitted())bleConnector.scan(bleRequestId);else bleConnector.denied(bleRequestId);return;}
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                new AndroidBridge().requestPushToken();
            } else {
                notifyPushUnavailable("Autorizzazione notifiche Android non concessa");
            }
            return;
        }
        if (requestCode == MICROPHONE_PERMISSION_REQUEST) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (pendingVoiceInput && granted) launchVoiceInput();
            pendingVoiceInput = false;
            if (pendingCheckinVoice) {
                pendingCheckinVoice = false;
                if (granted) startDailyCheckinListening();
                else deliverCheckinSpeech("");
            }
            if (pendingWakeEnable) {
                pendingWakeEnable = false;
                mediWakeEnabled = granted;
                if (granted) { startMediWakeListening(); notifyMediWakeState("active"); }
                else notifyMediWakeState("denied");
            }
            return;
        }
        if (requestCode == LOCATION_PERMISSION_REQUEST) {
            boolean granted = false;
            for (int result : grantResults) if (result == PackageManager.PERMISSION_GRANTED) { granted = true; break; }
            if (pendingGeoCallback != null) pendingGeoCallback.invoke(pendingGeoOrigin == null ? "" : pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }

    private String extractRequestedTab(Intent intent) {
        if (intent == null) return null;
        String tab = intent.getStringExtra("open_meditaly_tab");
        if (tab != null && !tab.trim().isEmpty()) return tab.trim();
        String route = intent.getStringExtra("route");
        if (route == null) return null;
        if ("messages".equals(route) || "chat".equals(route)) return "chat";
        if ("therapy".equals(route)) return "therapy";
        if ("notifications".equals(route)) return "notifications";
        if ("followup".equals(route) || "controls".equals(route)) return "followup";
        return null;
    }

    private String extractIntakeAction(Intent intent) {
        if(intent==null)return null;
        String schedule=intent.getStringExtra("intake_schedule"), date=intent.getStringExtra("intake_date"),
               patient=intent.getStringExtra("intake_patient"), status=intent.getStringExtra("intake_status");
        if(schedule==null||!schedule.matches("(?i)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}")
            ||patient==null||!patient.matches("(?i)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}")
            ||date==null||!date.matches("\\d{4}-\\d{2}-\\d{2}")
            ||!("taken".equals(status)||"skipped".equals(status)))return null;
        try{return new JSONObject().put("schedule",schedule).put("date",date).put("patient",patient).put("status",status).toString();}
        catch(Exception ignored){return null;}
    }

    private String extractTherapySlot(Intent intent) {
        if (intent == null || !"therapy".equals(extractRequestedTab(intent))) return null;
        String slot = intent.getStringExtra("therapy_slot");
        return slot != null && slot.matches("[0-2][0-9]:[0-5][0-9]") ? slot : null;
    }

    private String extractChatMessageId(Intent intent) {
        if (intent == null || !"chat".equals(extractRequestedTab(intent))) return null;
        String id = intent.getStringExtra("chat_message_id");
        if(id==null)id=intent.getStringExtra("message_id");
        return id != null && id.matches("(?i)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}") ? id : null;
    }

    private String extractCheckinAction(Intent intent) {
        if (intent == null) return null;
        String choice = intent.getStringExtra("checkin_choice");
        String date = intent.getStringExtra("checkin_date");
        String patient = intent.getStringExtra("checkin_patient_id");
        if (!("start".equals(choice) || "green".equals(choice) || "yellow".equals(choice) || "red".equals(choice))
                || date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")
                || patient == null || !patient.matches("[0-9a-fA-F-]{36}")) return null;
        try {
            return new org.json.JSONObject().put("status", choice).put("date", date)
                    .put("patient_id", patient).toString();
        } catch (org.json.JSONException ignored) {
            return null;
        }
    }

    private String jsEscape(String value) {
        return value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "").replace("\r", "");
    }

    private void notifyOcrError(String reason) {
        if (webView == null) return;
        String safe = jsEscape(reason);
        webView.evaluateJavascript("window.onMeditalyOcrError && window.onMeditalyOcrError('" + safe + "')", null);
    }

    private void notifyPushUnavailable(String reason) {
        if (webView == null) return;
        String safe = jsEscape(reason);
        webView.evaluateJavascript("window.onMeditalyPushUnavailable && window.onMeditalyPushUnavailable('" + safe + "')", null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && webView != null) {
            String call=extractCallAction(intent);
            if(call!=null){pendingCallAction=call;try{JSONObject parsed=new JSONObject(call);webView.evaluateJavascript("Boolean(window.openMeditalyCall && window.openMeditalyCall("+JSONObject.quote(parsed.getString("id"))+","+JSONObject.quote(parsed.getString("action"))+"))",result->{if("true".equals(result))pendingCallAction=null;});}catch(Exception ignored){}return;}
            String intakeAction=extractIntakeAction(intent);
            if(intakeAction!=null){
                pendingIntakeAction=intakeAction;
                webView.evaluateJavascript("Boolean(window.openMeditalyIntakeAction && window.openMeditalyIntakeAction("+intakeAction+"))", value->{if("true".equals(value)){pendingIntakeAction=null;pendingOpenTab=null;}});
                return;
            }
            String checkinAction = extractCheckinAction(intent);
            if (checkinAction != null) {
                pendingCheckinAction = checkinAction;
                pendingOpenTab = "checkin";
                webView.evaluateJavascript("Boolean(window.openMeditalyCheckinAction && window.openMeditalyCheckinAction(" +
                        checkinAction + "))", value -> {
                    if ("true".equals(value)) {
                        pendingCheckinAction = null;
                        pendingOpenTab = null;
                    }
                });
                return;
            }
            String tab = extractRequestedTab(intent);
            if (tab != null && !tab.trim().isEmpty()) {
                pendingOpenTab = tab;
                pendingTherapySlot = extractTherapySlot(intent);
                pendingChatMessageId = extractChatMessageId(intent);
                if ("therapy".equals(tab) && pendingTherapySlot != null) {
                    webView.evaluateJavascript("Boolean(window.openMeditalyTherapyReminder && window.openMeditalyTherapyReminder(" +
                            JSONObject.quote(pendingTherapySlot) + "))", value -> {
                        if ("true".equals(value)) { pendingOpenTab = null; pendingTherapySlot = null; }
                    });
                    return;
                }
                if ("chat".equals(tab)) {
                    String id = pendingChatMessageId == null ? "" : pendingChatMessageId;
                    webView.evaluateJavascript("Boolean(window.openMeditalyChatNotification && window.openMeditalyChatNotification(" +
                            JSONObject.quote(id) + "))", value -> {
                        if ("true".equals(value)) { pendingOpenTab = null; pendingChatMessageId = null; }
                    });
                    return;
                }
                String safeTab = jsEscape(tab);
                webView.evaluateJavascript("Boolean(window.openMeditalyTab && window.openMeditalyTab('" + safeTab + "'))", value -> {
                    if ("true".equals(value)) pendingOpenTab = null;
                });
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if(requestCode==PhoneHealthConnector.PERMISSION_REQUEST){phoneHealth.afterPermissions();return;}
        if (requestCode == VOICE_INPUT_REQUEST) {
            if (resultCode == RESULT_OK && data != null && webView != null) {
                ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                String spoken = (results != null && !results.isEmpty()) ? results.get(0) : "";
                webView.evaluateJavascript("window.onMeditalyVoiceInput && window.onMeditalyVoiceInput(" + org.json.JSONObject.quote(spoken) + ")", null);
            }
            else if (webView != null) webView.evaluateJavascript("window.onMeditalyVoiceInput && window.onMeditalyVoiceInput('')", null);
            mediWakeSuspended = false;
            scheduleMediWake(900);
            return;
        }
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback != null) {
                Uri[] result = null;
                if (resultCode == RESULT_OK) {
                    if (cameraPhotoUri != null) {
                        // Some camera applications ignore EXTRA_OUTPUT and return
                        // their own content URI. Prefer the actual non-empty file.
                        Uri captured = cameraPhotoUri;
                        try {
                            if (cameraOutputFile != null && cameraOutputFile.length() == 0 &&
                                    data != null && data.getData() != null) captured = data.getData();
                        } catch (Exception ignored) {
                            if (data != null && data.getData() != null) captured = data.getData();
                        }
                        result = new Uri[]{captured};
                    } else {
                        result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                    }
                }
                filePathCallback.onReceiveValue(result);
                filePathCallback = null;
                cameraPhotoUri = null;
                cameraOutputFile = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        mediWakeEnabled = false;
        stopMediWakeListening();
        if (checkinRecognizer != null) finishDailyCheckinListening("");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && systemBackCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(systemBackCallback);
            systemBackCallback = null;
        }
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        if(bleConnector!=null)bleConnector.destroy();
        if(phoneHealth!=null)phoneHealth.cancel();
        if(pendingAudioPermission!=null){pendingAudioPermission.deny();pendingAudioPermission=null;}
        stopService(new Intent(this,VoiceCallService.class));
        AudioManager callAudio=(AudioManager)getSystemService(AUDIO_SERVICE);if(callAudio!=null&&activeCallId!=null){callAudio.setSpeakerphoneOn(false);callAudio.setMode(AudioManager.MODE_NORMAL);}
        super.onDestroy();
    }

    @Override protected void onResume() {
        super.onResume();
        if(phoneHealth!=null)phoneHealth.resume();
        stopService(new Intent(this, it.meditaly.app.medi.MediHandsFreeService.class));
        mediForeground = true;
        if (webView != null) webView.post(() -> webView.evaluateJavascript("window.onMeditalyAppResume && window.onMeditalyAppResume()", null));
        scheduleMediWake(800);
    }

    @Override protected void onPause() {
        mediForeground = false;
        stopMediWakeListening();
        if (!pendingCheckinVoice && !pendingVoiceInput && webView != null) webView.evaluateJavascript("window.onMeditalyAppPause && window.onMeditalyAppPause()", null);
        if (checkinRecognizer != null) finishDailyCheckinListening("");
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        handleMeditalyBack();
    }

    private void handleMeditalyBack() {
        if (webView == null) { moveTaskToBack(true); return; }
        webView.evaluateJavascript(
                "Boolean(window.meditalyHandleBack && window.meditalyHandleBack())",
                handled -> {
                    if ("true".equals(handled)) return;
                    if (webView.canGoBack()) webView.goBack();
                    else moveTaskToBack(true);
                }
        );
    }
}
