package it.meditaly.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MeditalyMessagingService extends FirebaseMessagingService {
    public static final String CHANNEL_ID = "meditaly_messages";
    public static final String CHECKIN_CHANNEL_ID = "meditaly_daily_checkin_v2";
    public static final String APPOINTMENT_CHANNEL_ID = "meditaly_appointment_proposals_v2";

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Messaggi Meditaly",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Avvisi per nuovi messaggi protetti su Meditaly");
            channel.enableVibration(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
                NotificationChannel checkin = new NotificationChannel(CHECKIN_CHANNEL_ID,
                        "Come stai oggi", NotificationManager.IMPORTANCE_HIGH);
                checkin.setDescription("Domanda quotidiana Meditaly delle 09:00");
                checkin.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                checkin.enableVibration(true);
                manager.createNotificationChannel(checkin);
                NotificationChannel appointments = new NotificationChannel(APPOINTMENT_CHANNEL_ID,
                        "Proposte di appuntamento", NotificationManager.IMPORTANCE_HIGH);
                appointments.setDescription("Nuove proposte di appuntamento dal medico su Meditaly");
                appointments.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                appointments.enableVibration(true);
                manager.createNotificationChannel(appointments);
            }
        }
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        ensureChannel(this);
        LocalReminderReceiver.ensureChannels(this);
        if("voice_call".equals(remoteMessage.getData().get("type"))){VoiceCallNotifications.incoming(this,remoteMessage.getData());return;}

        String route = remoteMessage.getData().get("route");
        boolean therapyReminder = "therapy".equals(route);
        String reminderSlot = therapyReminder ? remoteMessage.getData().get("slot") : null;
        String reminderDate = therapyReminder ? remoteMessage.getData().get("local_date") : null;
        String scheduleId=remoteMessage.getData().get("schedule_id"), patientId=remoteMessage.getData().get("patient_id");
        String therapyKey=patientId!=null && scheduleId!=null ? patientId+":med-"+scheduleId : reminderSlot;
        if (therapyReminder && ReminderDedupe.alreadyShown(this, reminderDate, therapyKey)) return;
        boolean dailyCheckin = "daily_checkin".equals(remoteMessage.getData().get("type"));
        String checkinDate = dailyCheckin ? remoteMessage.getData().get("local_date") : null;
        String checkinKey = dailyCheckin ? remoteMessage.getData().get("reminder_key") : null;
        if (dailyCheckin && !CheckinAlarmScheduler.owns(this, checkinKey)) return;
        if (dailyCheckin && ReminderDedupe.alreadyShown(this, checkinDate, checkinKey)) return;
        boolean appointment = "appointment_proposal".equals(remoteMessage.getData().get("type"))
                && "followup".equals(route);
        boolean generalNotice = "notifications".equals(route);
        String targetTab = therapyReminder ? "therapy" : dailyCheckin ? "checkin"
                : appointment ? "followup" : generalNotice ? "notifications" : "chat";
        String privateText = therapyReminder
                ? remoteMessage.getData().getOrDefault("medication_name", "Terapia") + " " + remoteMessage.getData().getOrDefault("medication_dose", "") + " · " + (reminderSlot==null?"":reminderSlot)
                : dailyCheckin
                ? "Come stai oggi? Inizia il check-in."
                : appointment
                ? "Il tuo medico ha proposto un appuntamento. Tocca per vederlo."
                : "Hai un messaggio su Meditaly";
        String publicText = dailyCheckin ? "Inizia il check-in oppure rimandalo di 30 minuti o 1 ora."
                : appointment ? "Hai una nuova proposta di appuntamento. Tocca per aprire Meditaly."
                : "Hai un messaggio su Meditaly";
        String channelId = CHANNEL_ID;
        if (therapyReminder) {
            channelId = LocalReminderReceiver.THERAPY_SOUND_CHANNEL_ID;
        } else if (dailyCheckin) {
            channelId = CHECKIN_CHANNEL_ID;
        } else if (appointment) {
            channelId = APPOINTMENT_CHANNEL_ID;
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("open_meditaly_tab", targetTab);
        if (therapyReminder && reminderSlot != null) intent.putExtra("therapy_slot", reminderSlot);
        String messageId = "chat".equals(targetTab) ? remoteMessage.getData().get("message_id") : null;
        if (messageId != null && messageId.matches("(?i)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}")) {
            intent.putExtra("chat_message_id", messageId);
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                dailyCheckin ? 1002 : appointment ? 1003 : therapyReminder ? (therapyKey==null?1004:therapyKey.hashCode())
                        : messageId != null ? messageId.hashCode() : 1001,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Ignora sempre il testo clinico ricevuto dal server. Sul blocco schermo
        // mostra solo la domanda quotidiana o il tipo di appuntamento, senza dettagli.
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_email)
                .setContentTitle("Meditaly")
                .setContentText(privateText)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(dailyCheckin || appointment
                        ? NotificationCompat.VISIBILITY_PUBLIC : NotificationCompat.VISIBILITY_PRIVATE)
                .setPublicVersion(new NotificationCompat.Builder(this, channelId)
                        .setSmallIcon(android.R.drawable.ic_dialog_email)
                        .setContentTitle("Meditaly")
                        .setContentText(publicText)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .build())
                .setCategory(therapyReminder || dailyCheckin || appointment
                        ? NotificationCompat.CATEGORY_REMINDER
                        : NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE);

        if(therapyReminder){
            builder.setStyle(new NotificationCompat.BigTextStyle().bigText(privateText));
            MedicationNotificationActions.add(this,builder,scheduleId,reminderDate,patientId);
        }
        if (dailyCheckin) {
            builder.setContentTitle("Come ti senti oggi?")
                    .setContentText(publicText)
                    .setStyle(new NotificationCompat.BigTextStyle()
                            .setBigContentTitle("Come ti senti oggi?")
                            .bigText("" + publicText));
            CheckinNotificationActions.add(this, builder, checkinDate, checkinKey);
            NotificationCompat.Builder lockscreen = new NotificationCompat.Builder(this, channelId)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle("Come ti senti oggi?")
                    .setContentText(publicText)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(publicText));
            CheckinNotificationActions.add(this, lockscreen, checkinDate, checkinKey);
            builder.setPublicVersion(lockscreen.build());
        }

        try {
            NotificationManagerCompat.from(this)
                    .notify(dailyCheckin ? checkinKey.hashCode() : (int) (System.currentTimeMillis() & 0x0fffffff), builder.build());
            if (therapyReminder) ReminderDedupe.markShown(this, reminderDate, therapyKey);
            if (dailyCheckin) ReminderDedupe.markShown(this, checkinDate, checkinKey);
        } catch (SecurityException ignored) {
            // Android 13+: l'utente può aver negato POST_NOTIFICATIONS.
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        // Il token viene sincronizzato con Supabase alla prossima apertura/accesso dell'app,
        // quando è disponibile una sessione utente autenticata nel WebView.
    }
}
