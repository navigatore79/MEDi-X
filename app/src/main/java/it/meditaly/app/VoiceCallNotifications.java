package it.meditaly.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;
import java.time.Instant;
import java.util.Map;

/** No clinical content, caller name or credentials in the lock-screen notification. */
public final class VoiceCallNotifications {
 public static final String CHANNEL="meditaly_calls_v1";
 public static boolean validId(String id){return id!=null&&id.matches("(?i)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}");}
 public static int notificationId(String id){return ("call:"+id).hashCode();}
 public static void ensureChannel(Context context){
  NotificationManager manager=context.getSystemService(NotificationManager.class);
  if(manager==null)return;
  NotificationChannel channel=new NotificationChannel(CHANNEL,"Chiamate Meditaly",NotificationManager.IMPORTANCE_HIGH);
  channel.setDescription("Chiamate e videochiamate in ingresso dal medico");channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);channel.enableVibration(true);
  channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build());manager.createNotificationChannel(channel);
 }
 public static PendingIntent intent(Context context,String id,String action){
  Intent open=new Intent(context,MainActivity.class).setAction("meditaly.call."+action+"."+id)
    .putExtra("meditaly_call_id",id).putExtra("meditaly_call_action",action)
    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
  return PendingIntent.getActivity(context,(id+action).hashCode(),open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
 }
 public static void incoming(Context context,Map<String,String> data){
  String id=data.get("call_id");if(!validId(id))return;long remaining;
  try{remaining=Instant.parse(data.get("expires_at")).toEpochMilli()-System.currentTimeMillis();}catch(Exception ignored){return;}
  if(remaining<=0||remaining>75000)return;ensureChannel(context);
  Person caller=new Person.Builder().setName("Il tuo medico · Meditaly").setImportant(true).build();
  NotificationCompat.Builder builder=new NotificationCompat.Builder(context,CHANNEL)
   .setSmallIcon(android.R.drawable.sym_call_incoming).setContentTitle("video".equals(data.get("media_mode"))?"Videochiamata Meditaly":"Chiamata Meditaly")
   .setContentText("Il medico ti sta chiamando").setContentIntent(intent(context,id,"open"))
   .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller,intent(context,id,"reject"),intent(context,id,"answer")).setIsVideo("video".equals(data.get("media_mode"))))
   .setCategory(NotificationCompat.CATEGORY_CALL).setPriority(NotificationCompat.PRIORITY_MAX)
   .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setAutoCancel(true).setTimeoutAfter(remaining);
  NotificationManager manager=context.getSystemService(NotificationManager.class);
  if(manager!=null)try{manager.notify(notificationId(id),builder.build());}catch(SecurityException ignored){}
 }
 public static void dismiss(Context context,String id){if(!validId(id))return;NotificationManager m=context.getSystemService(NotificationManager.class);if(m!=null)m.cancel(notificationId(id));}
 private VoiceCallNotifications(){}
}
