package it.meditaly.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class LocalReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent){
        String title=intent!=null?intent.getStringExtra("title"):null;
        String body=intent!=null?intent.getStringExtra("body"):null;
        NotificationCompat.Builder b=new NotificationCompat.Builder(context,"meditaly_therapy_siren_v1")
                .setSmallIcon(R.drawable.meditaly_app_icon)
                .setContentTitle(title==null?"Meditaly · Terapia":title)
                .setContentText(body==null?"È il momento della terapia":body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
        try{NotificationManagerCompat.from(context).notify((int)(System.currentTimeMillis()%100000),b.build());}catch(SecurityException ignored){}
    }
}
