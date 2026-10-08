package it.meditaly.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.app.NotificationCompat;

/** Opens an authenticated, preselected check-in; the patient confirms before saving. */
public final class CheckinNotificationActions {
    private CheckinNotificationActions() {}

    public static void add(Context context, NotificationCompat.Builder builder, String localDate, String reminderKey) {
        if (localDate == null || !localDate.matches("\\d{4}-\\d{2}-\\d{2}")) return;
        if (reminderKey == null || !reminderKey.matches("checkin-[0-9a-fA-F-]{36}")) return;
        final String patientId = reminderKey.substring("checkin-".length());
        Intent open = new Intent(context, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        open.setData(Uri.parse("meditaly://daily-checkin/" + localDate + "/" + patientId + "/start"));
        open.putExtra("open_meditaly_tab", "checkin");
        open.putExtra("checkin_choice", "start");
        open.putExtra("checkin_date", localDate);
        open.putExtra("checkin_patient_id", patientId);
        builder.addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_input_add, "Inizia",
            PendingIntent.getActivity(context, (reminderKey + localDate).hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).setAuthenticationRequired(true).build());
        for (int minutes : new int[]{30, 60}) {
            Intent snooze = new Intent(context, CheckinSnoozeReceiver.class);
            snooze.setData(Uri.parse("meditaly://snooze/" + patientId + "/" + minutes));
            snooze.putExtra("reminder_key", reminderKey);
            snooze.putExtra("local_date", localDate);
            snooze.putExtra("minutes", minutes);
            builder.addAction(android.R.drawable.ic_lock_idle_alarm, minutes == 30 ? "Tra 30 minuti" : "Tra 1 ora",
                PendingIntent.getBroadcast(context, (reminderKey + minutes).hashCode(), snooze,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
    }
}
