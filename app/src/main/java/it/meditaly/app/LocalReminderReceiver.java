package it.meditaly.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class LocalReminderReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "meditaly_reminders";
    // Nuovo canale: Android conserva la configurazione audio del canale precedente.
    public static final String THERAPY_SOUND_CHANNEL_ID = "meditaly_therapy_siren_16_v2";

    private Uri therapySoundUri(Context context) {
        return Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" +
                context.getPackageName() + "/" + R.raw.meditaly_therapy_siren);
    }

    public static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel general = new NotificationChannel(
                CHANNEL_ID,
                "Promemoria Meditaly",
                NotificationManager.IMPORTANCE_HIGH
        );
        general.setDescription("Promemoria personali per controlli e check-in Meditaly");
        general.enableVibration(true);
        general.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(general);

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        NotificationChannel therapySound = new NotificationChannel(
                THERAPY_SOUND_CHANNEL_ID,
                "Terapia Meditaly",
                NotificationManager.IMPORTANCE_HIGH
        );
        therapySound.setDescription("Promemoria terapia con sirena Meditaly di 1,6 secondi");
        therapySound.enableVibration(true);
        therapySound.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        therapySound.setSound(Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" +
                context.getPackageName() + "/" + R.raw.meditaly_therapy_siren), audioAttributes);
        manager.createNotificationChannel(therapySound);

    }

    @Override
    public void onReceive(Context context, Intent source) {
        ensureChannels(context);
        String type = source == null ? "therapy" : source.getStringExtra("reminder_type");
        if (type == null) type = "therapy";

        String text;
        String tab;
        if ("control".equals(type)) {
            text = "Hai un controllo programmato su Meditaly";
            tab = "followup";
        } else if ("adherence".equals(type)) {
            text = "Controlla le terapie di oggi e conferma le assunzioni su Meditaly";
            tab = "therapy";
        } else if ("checkin".equals(type)) {
            text = "Inizia il check-in oppure scegli quando ricevere il promemoria.";
            tab = "checkin";
        } else {
            String name=source==null?null:source.getStringExtra("medication_name");
            String dose=source==null?null:source.getStringExtra("medication_dose");
            String time=source==null?null:source.getStringExtra("reminder_slot");
            text=name==null?"Hai un promemoria terapia su Meditaly":name+" "+(dose==null?"":dose)+" · "+(time==null?"":time);
            tab = "therapy";
        }

        boolean therapy = "therapy".equals(type);
        boolean checkin = "checkin".equals(type);
        String slot = therapy && source != null ? source.getStringExtra("reminder_slot") : null;
        String localDate = null;
        if (therapy && slot != null) {
            TimeZone rome = TimeZone.getTimeZone("Europe/Rome");
            Calendar calendar = Calendar.getInstance(rome);
            SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
            formatter.setTimeZone(rome);
            localDate = formatter.format(calendar.getTime());
            String starts = source.getStringExtra("reminder_starts_on");
            String ends = source.getStringExtra("reminder_ends_on");
            if ((starts != null && !starts.isEmpty() && localDate.compareTo(starts) < 0)
                    || (ends != null && !ends.isEmpty() && localDate.compareTo(ends) > 0)) return;
            String weekdays = source.getStringExtra("reminder_weekdays");
            if (weekdays != null && !weekdays.isEmpty() &&
                    !("," + weekdays + ",").contains("," + (calendar.get(Calendar.DAY_OF_WEEK) - 1) + ",")) return;
            if (ReminderDedupe.alreadyShown(context, localDate, source.getStringExtra("reminder_dedupe"))) return;
        }
        if (checkin) {
            MeditalyMessagingService.ensureChannel(context);
            slot = source == null ? null : source.getStringExtra("reminder_key");
            if(!CheckinAlarmScheduler.owns(context, slot)) return;
            CheckinAlarmScheduler.scheduleNext(context, slot);
            TimeZone rome = TimeZone.getTimeZone("Europe/Rome");
            SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
            formatter.setTimeZone(rome);
            localDate = formatter.format(Calendar.getInstance(rome).getTime());
            boolean snoozed = "meditaly.CHECKIN_SNOOZED".equals(source.getAction());
            if(snoozed) { if(!CheckinAlarmScheduler.consumeSnooze(context,slot))return; }
            else if (ReminderDedupe.alreadyShown(context, localDate, slot)) return;
        }
        String channelId = therapy ? THERAPY_SOUND_CHANNEL_ID
                : checkin ? MeditalyMessagingService.CHECKIN_CHANNEL_ID : CHANNEL_ID;

        Intent open = new Intent(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.putExtra("open_meditaly_tab", tab);
        if (therapy && slot != null) open.putExtra("therapy_slot", slot);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context, (type + (source==null?"":source.getStringExtra("intake_schedule"))).hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Meditaly")
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(checkin ? NotificationCompat.VISIBILITY_PUBLIC
                        : NotificationCompat.VISIBILITY_PRIVATE)
                .setPublicVersion(new NotificationCompat.Builder(context, channelId)
                        .setSmallIcon(android.R.drawable.ic_dialog_info)
                        .setContentTitle("Meditaly")
                        .setContentText(checkin ? text : "Hai un messaggio su Meditaly")
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .build())
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(contentIntent);

        if (therapy && source != null) {
            builder.setStyle(new NotificationCompat.BigTextStyle().bigText(text));
            MedicationNotificationActions.add(context,builder,source.getStringExtra("intake_schedule"),localDate,source.getStringExtra("intake_patient"));
        }
        if (checkin) {
            builder.setContentTitle("Come ti senti oggi?")
                    .setContentText(text)
                    .setStyle(new NotificationCompat.BigTextStyle()
                            .setBigContentTitle("Come ti senti oggi?")
                            .bigText("" + text));
            CheckinNotificationActions.add(context, builder, localDate, slot);
            NotificationCompat.Builder lockscreen = new NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle("Come ti senti oggi?")
                    .setContentText(text)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(text));
            CheckinNotificationActions.add(context, lockscreen, localDate, slot);
            builder.setPublicVersion(lockscreen.build());
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            if (therapy) {
                builder.setSound(therapySoundUri(context));
                builder.setVibrate(new long[]{0, 180, 100, 180});
            } else {
                builder.setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE);
            }
        }

        try {
            NotificationManagerCompat.from(context).notify(
                    checkin ? slot.hashCode() : (int) (System.currentTimeMillis() & 0x0fffffff), builder.build());
            if (therapy || checkin) ReminderDedupe.markShown(context, localDate, therapy ? source.getStringExtra("reminder_dedupe") : slot);
        } catch (SecurityException ignored) {}
    }
}
