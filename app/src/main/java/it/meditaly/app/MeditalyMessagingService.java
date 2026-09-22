package it.meditaly.app;

import android.app.PendingIntent;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MeditalyMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token){ super.onNewToken(token); }
    @Override public void onMessageReceived(RemoteMessage remoteMessage){
        super.onMessageReceived(remoteMessage);
        Intent intent=new Intent(this,MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi=PendingIntent.getActivity(this,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b=new NotificationCompat.Builder(this,"meditaly_messages")
                .setSmallIcon(R.drawable.meditaly_app_icon)
                .setContentTitle("Meditaly")
                .setContentText("Hai un messaggio su Meditaly")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);
        try{NotificationManagerCompat.from(this).notify((int)(System.currentTimeMillis()%100000),b.build());}catch(SecurityException ignored){}
    }
}
