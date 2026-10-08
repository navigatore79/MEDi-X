package it.meditaly.app;
import android.app.Service;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.IBinder;
import android.content.pm.ServiceInfo;
import androidx.core.app.NotificationCompat;

/** Started only while the activity is visible and microphone permission is granted. */
public class VoiceCallService extends Service {
 private static final String CHANNEL="meditaly_ongoing_calls_v1";
 @Override public IBinder onBind(Intent intent){return null;}
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  String id=intent==null?null:intent.getStringExtra("call_id");
  if(!VoiceCallNotifications.validId(id)){stopSelf();return START_NOT_STICKY;}
  NotificationManager manager=getSystemService(NotificationManager.class);
  if(manager!=null)manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Chiamata in corso",NotificationManager.IMPORTANCE_LOW));
  android.app.Notification notification=new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.sym_call_incoming)
   .setContentTitle("Meditaly · Chiamata in corso").setContentText("Tocca per tornare alla chiamata")
   .setContentIntent(VoiceCallNotifications.intent(this,id,"open")).setCategory(NotificationCompat.CATEGORY_CALL)
   .setOngoing(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build();
  if(android.os.Build.VERSION.SDK_INT>=29)startForeground(7801,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
  else startForeground(7801,notification);
  return START_NOT_STICKY;
 }
 @Override public void onTaskRemoved(Intent rootIntent){stopSelf();}
}
