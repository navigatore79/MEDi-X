package it.meditaly.app;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.health.connect.client.*;
import androidx.health.connect.client.records.*;
import androidx.health.connect.client.records.Record;
import androidx.health.connect.client.request.*;
import androidx.health.connect.client.response.*;
import androidx.health.connect.client.aggregate.*;
import androidx.health.connect.client.time.TimeRangeFilter;
import kotlin.coroutines.*;
import kotlin.coroutines.intrinsics.IntrinsicsKt;
import kotlin.jvm.JvmClassMappingKt;
import kotlin.ResultKt;
import org.json.JSONObject;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.*;
/** Official cross-version, foreground read-only Health Connect client. No cloud forwarding. */
final class PhoneHealthConnector {
 interface Listener {void event(JSONObject event);}
 static final int PERMISSION_REQUEST=813;
 private final Activity activity;private final Listener listener;
 private String pending="",installPending="";private long generation;
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final Set<String> permissions=new LinkedHashSet<>(Arrays.asList(PERMISSIONS));
 static final String[] PERMISSIONS={"android.permission.health.READ_STEPS","android.permission.health.READ_HEART_RATE","android.permission.health.READ_BLOOD_PRESSURE","android.permission.health.READ_WEIGHT","android.permission.health.READ_OXYGEN_SATURATION","android.permission.health.READ_BLOOD_GLUCOSE","android.permission.health.READ_BODY_TEMPERATURE","android.permission.health.READ_RESPIRATORY_RATE","android.permission.health.READ_RESTING_HEART_RATE","android.permission.health.READ_HEIGHT","android.permission.health.READ_BODY_FAT","android.permission.health.READ_HEART_RATE_VARIABILITY","android.permission.health.READ_SLEEP","android.permission.health.READ_DISTANCE","android.permission.health.READ_ACTIVE_CALORIES_BURNED"};
 PhoneHealthConnector(Activity a,Listener l){activity=a;listener=l;}
 boolean valid(String id){return id!=null&&id.matches("[a-zA-Z0-9-]{8,80}");}
 void emit(String id,String type,String message){try{emit(new JSONObject().put("type",type).put("requestId",id).put("message",message));}catch(Exception ignored){}}
 void emit(JSONObject e){activity.runOnUiThread(()->listener.event(e));}
 int status(){try{return HealthConnectClient.getSdkStatus(activity);}catch(Exception e){return HealthConnectClient.SDK_UNAVAILABLE;}}
 void availability(String id){if(!valid(id))return;int s=status();try{emit(new JSONObject().put("type","availability").put("requestId",id).put("supported",s!=HealthConnectClient.SDK_UNAVAILABLE).put("message",s==HealthConnectClient.SDK_AVAILABLE?"Collega i dati di salute e i misuratori vicini con un solo pulsante.":s==HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED?"Il pulsante ti guiderà anche nell’installazione o aggiornamento di Health Connect.":"Su questo telefono puoi cercare i misuratori Bluetooth compatibili."));}catch(Exception ignored){}}
 void request(String id){if(!valid(id))return;int s=status();if(s==HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED){installPending=id;emit(id,"install","Installa o aggiorna Health Connect, poi torna qui: il collegamento riprenderà automaticamente.");try{activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding")));}catch(Exception e){try{activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")));}catch(Exception ignored){emit(id,"error","Non riesco ad aprire lo store. Puoi usare i misuratori Bluetooth compatibili.");}}return;}
 if(s!=HealthConnectClient.SDK_AVAILABLE){emit(id,"error","Health Connect non disponibile: cerco i misuratori Bluetooth compatibili.");return;}
 pending=id;long requestToken=++generation;
 handler.postDelayed(()->{if(requestToken==generation&&!pending.isEmpty()){pending="";generation++;emit(id,"error","Health Connect non risponde. Puoi riprovare; intanto cerco i misuratori vicini.");}},20000);
 HealthConnectClient client=HealthConnectClient.getOrCreate(activity);
 call(c->client.getPermissionController().getGrantedPermissions(c),(Set<String> granted)->{if(requestToken!=generation)return;if(granted.containsAll(permissions)){pending="";read(id);}else try{handler.removeCallbacksAndMessages(null);activity.startActivityForResult(PermissionController.createRequestPermissionResultContract().createIntent(activity,permissions),PERMISSION_REQUEST);}catch(Exception e){pending="";emit(id,"error","Impossibile aprire le autorizzazioni. Controlla Health Connect nelle impostazioni.");}},e->{if(requestToken!=generation)return;pending="";emit(id,"error","Impossibile verificare l’accesso ai dati di salute.");});
 }
 void afterPermissions(){String id=pending;pending="";if(valid(id))read(id);}
 void resume(){if(valid(installPending)&&status()==HealthConnectClient.SDK_AVAILABLE){String id=installPending;installPending="";request(id);}}
 void cancel(){pending="";installPending="";generation++;handler.removeCallbacksAndMessages(null);}
 void settings(){try{if(status()==HealthConnectClient.SDK_AVAILABLE)activity.startActivity(new Intent(HealthConnectClient.getHealthConnectSettingsAction()));else activity.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")));}catch(Exception e){emit(pending,"error","Apri Health Connect dalle impostazioni del telefono.");}}
 interface Suspend<T>{Object run(Continuation<? super T> continuation);}
 <T>void call(Suspend<T> fn,Consumer<T> ok,Consumer<Throwable> fail){
  Continuation<T> c=new Continuation<T>(){public CoroutineContext getContext(){return EmptyCoroutineContext.INSTANCE;}public void resumeWith(Object result){activity.runOnUiThread(()->{try{ResultKt.throwOnFailure(result);ok.accept((T)result);}catch(Throwable e){fail.accept(e);}});}};
  try{Object result=fn.run(c);if(result!=IntrinsicsKt.getCOROUTINE_SUSPENDED())c.resumeWith(result);}catch(Throwable e){fail.accept(e);}
 }
 void read(String id){if(!valid(id))return;if(status()!=HealthConnectClient.SDK_AVAILABLE){availability(id);return;}long token=++generation;HealthConnectClient client=HealthConnectClient.getOrCreate(activity);emit(id,"start","Leggo i dati di salute autorizzati…");
 handler.postDelayed(()->{if(token==generation){generation++;emit(id,"error","Lettura non completata. Riprova per aggiornare i dati di salute.");}},25000);
 call(c->client.getPermissionController().getGrantedPermissions(c),(Set<String> granted)->{if(token==generation)new Snapshot(client,id,token,granted).read();},e->{if(token==generation)emit(id,"error","Lettura non riuscita. Controlla l’accesso a Health Connect.");});}
 final class Snapshot {
 final HealthConnectClient client;final String id;final long token;final Set<String> granted;final Set<String> completed=new HashSet<>();int remaining=15,available=0;
 Snapshot(HealthConnectClient c,String id,long token,Set<String> g){client=c;this.id=id;this.token=token;granted=g;}
 void item(String metric,String value,String unit,String time,String source,String state){if(token!=generation||!completed.add(metric))return;try{emit(new JSONObject().put("type","metric").put("requestId",id).put("metric",metric).put("value",value).put("unit",unit).put("time",time).put("source",source).put("state",state));if(state.equals("ok"))available++;if(--remaining==0){generation++;emit(new JSONObject().put("type","done").put("requestId",id).put("count",available).put("granted",granted.size()));}}catch(Exception ignored){}}
 void absent(String metric,String state){item(metric,"","","","",state);}
 String number(double v){return String.format(Locale.ITALY,"%.1f",v).replace(",0","");}
 String source(Record r){return r.getMetadata().getDataOrigin().getPackageName();}
 <T extends Record>void latest(Class<T> type,String metric,String permission,Consumer<T> use){if(!granted.contains("android.permission.health.READ_"+permission)){absent(metric,"permission");return;}ReadRecordsRequest<T> req=new ReadRecordsRequest<>(JvmClassMappingKt.getKotlinClass(type),TimeRangeFilter.between(Instant.now().minus(7,ChronoUnit.DAYS),Instant.now()),Collections.emptySet(),false,1,null);
 call(c->client.readRecords(req,c),(ReadRecordsResponse<T> response)->{if(token!=generation)return;try{if(response.getRecords().isEmpty())absent(metric,"empty");else use.accept(response.getRecords().get(0));}catch(Exception e){absent(metric,"error");}},e->absent(metric,e instanceof SecurityException?"permission":"error"));}
 <T>void aggregate(String key,String permission,AggregateMetric<T> metric,Instant start,Function<T,String> format,String unit){if(!granted.contains("android.permission.health.READ_"+permission)){absent(key,"permission");return;}Instant now=Instant.now();AggregateRequest req=new AggregateRequest(Collections.singleton(metric),TimeRangeFilter.between(start,now),Collections.emptySet());
 call(c->client.aggregate(req,c),(AggregationResult response)->{try{T value=response.get(metric);if(value==null)absent(key,"empty");else item(key,format.apply(value),unit,now.toString(),response.getDataOrigins().stream().map(o->o.getPackageName()).collect(java.util.stream.Collectors.joining(", ")),"ok");}catch(Exception e){absent(key,"error");}},e->absent(key,e instanceof SecurityException?"permission":"error"));}
 void read(){
 handler.postDelayed(()->{if(token==generation)for(String key:new String[]{"steps","distance","calories","sleep","heart","pressure","weight","oxygen","glucose","temperature","respiration","resting","height","fat","hrv"})if(!completed.contains(key))absent(key,"error");},20000);
 Instant today=LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
 aggregate("steps","STEPS",StepsRecord.COUNT_TOTAL,today,v->String.valueOf(v),"passi oggi");
 aggregate("distance","DISTANCE",DistanceRecord.DISTANCE_TOTAL,today,v->number(v.getKilometers()),"km oggi");
 aggregate("calories","ACTIVE_CALORIES_BURNED",ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL,today,v->number(v.getKilocalories()),"kcal attive oggi");
 aggregate("sleep","SLEEP",SleepSessionRecord.SLEEP_DURATION_TOTAL,Instant.now().minus(24,ChronoUnit.HOURS),v->number(v.toMinutes()/60.0),"ore nelle ultime 24 h");
 latest(HeartRateRecord.class,"heart","HEART_RATE",r->{if(r.getSamples().isEmpty()){absent("heart","empty");return;}HeartRateRecord.Sample sample=Collections.max(r.getSamples(),Comparator.comparing(HeartRateRecord.Sample::getTime));item("heart",String.valueOf(sample.getBeatsPerMinute()),"bpm",sample.getTime().toString(),source(r),"ok");});
 latest(BloodPressureRecord.class,"pressure","BLOOD_PRESSURE",r->item("pressure",number(r.getSystolic().getMillimetersOfMercury()) + " / " + number(r.getDiastolic().getMillimetersOfMercury()),"mmHg",r.getTime().toString(),source(r),"ok"));
latest(WeightRecord.class,"weight","WEIGHT",r->item("weight",number(r.getWeight().getKilograms()),"kg",r.getTime().toString(),source(r),"ok"));
latest(OxygenSaturationRecord.class,"oxygen","OXYGEN_SATURATION",r->item("oxygen",number(r.getPercentage().getValue()),"%",r.getTime().toString(),source(r),"ok"));
latest(BloodGlucoseRecord.class,"glucose","BLOOD_GLUCOSE",r->item("glucose",number(r.getLevel().getMilligramsPerDeciliter()),"mg/dL",r.getTime().toString(),source(r),"ok"));
latest(BodyTemperatureRecord.class,"temperature","BODY_TEMPERATURE",r->item("temperature",number(r.getTemperature().getCelsius()),"°C",r.getTime().toString(),source(r),"ok"));
latest(RespiratoryRateRecord.class,"respiration","RESPIRATORY_RATE",r->item("respiration",number(r.getRate()),"atti/min",r.getTime().toString(),source(r),"ok"));
latest(RestingHeartRateRecord.class,"resting","RESTING_HEART_RATE",r->item("resting",number(r.getBeatsPerMinute()),"bpm",r.getTime().toString(),source(r),"ok"));
latest(HeightRecord.class,"height","HEIGHT",r->item("height",number(r.getHeight().getMeters()*100),"cm",r.getTime().toString(),source(r),"ok"));
latest(BodyFatRecord.class,"fat","BODY_FAT",r->item("fat",number(r.getPercentage().getValue()),"%",r.getTime().toString(),source(r),"ok"));
latest(HeartRateVariabilityRmssdRecord.class,"hrv","HEART_RATE_VARIABILITY",r->item("hrv",number(r.getHeartRateVariabilityMillis()),"ms",r.getTime().toString(),source(r),"ok"));
 }
 }
}
