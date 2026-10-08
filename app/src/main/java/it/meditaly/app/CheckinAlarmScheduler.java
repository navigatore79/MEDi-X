package it.meditaly.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.util.Calendar;
import java.util.TimeZone;

/** Local fallback for the server's 09:00 Europe/Rome check-in push. */
final class CheckinAlarmScheduler {
    private static final String PREFS = "meditaly_checkin_alarm";
    private static final String KEY = "patient_reminder_key";

    private CheckinAlarmScheduler() {}

    static void saveAndSchedule(Context context, String reminderKey) {
        if (!valid(reminderKey)) return;
        String previous = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        if (previous != null && !previous.equals(reminderKey)) { cancelAlarm(context, previous); cancelSnooze(context, previous); }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, reminderKey).apply();
        scheduleNext(context, reminderKey);
    }

    static void scheduleStored(Context context) {
        String key = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        scheduleNext(context, key);
        long at = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("snooze_at", 0);
        if (valid(key) && at > 0) scheduleSnooze(context, key, Math.max(at, System.currentTimeMillis() + 1000));
    }

    static void scheduleNext(Context context, String reminderKey) {
        if (!valid(reminderKey)) return;
        String current = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        if (!reminderKey.equals(current)) return;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent pending = pending(context, reminderKey, PendingIntent.FLAG_UPDATE_CURRENT);
        manager.cancel(pending); // cancels an old repeating alarm when upgrading the app
        Calendar next = Calendar.getInstance(TimeZone.getTimeZone("Europe/Rome"));
        next.set(Calendar.HOUR_OF_DAY, 9);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 1);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
        else manager.set(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending);
    }

    static void remove(Context context, String reminderKey) {
        String current = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        if (reminderKey == null || !reminderKey.equals(current)) return;
        cancelAlarm(context, current);
        cancelSnooze(context, current);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply();
    }

    private static void cancelAlarm(Context context, String key) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pending = pending(context, key, PendingIntent.FLAG_NO_CREATE);
        if (pending != null) {
            if (manager != null) manager.cancel(pending);
            pending.cancel();
        }
    }

    private static PendingIntent pending(Context context, String key, int flags) {
        Intent intent = new Intent(context, LocalReminderReceiver.class);
        intent.putExtra("reminder_type", "checkin");
        intent.putExtra("reminder_key", key);
        return PendingIntent.getBroadcast(context, key.hashCode(), intent, flags | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean owns(Context c, String key) {
        return valid(key) && key.equals(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null));
    }
    static boolean snooze(Context c, String key, int minutes) {
        if (!owns(c,key) || (minutes != 30 && minutes != 60)) return false;
        long at = System.currentTimeMillis() + minutes * 60000L;
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("snooze_at",at).apply();
        scheduleSnooze(c,key,at);
        androidx.core.app.NotificationManagerCompat.from(c).cancel(key.hashCode());
        return true;
    }
    private static PendingIntent snoozeIntent(Context c, String key, int flags) {
        Intent i = new Intent(c, LocalReminderReceiver.class).setAction("meditaly.CHECKIN_SNOOZED");
        i.putExtra("reminder_type","checkin").putExtra("reminder_key",key);
        return PendingIntent.getBroadcast(c,key.hashCode(),i,flags | PendingIntent.FLAG_IMMUTABLE);
    }
    private static void scheduleSnooze(Context c, String key, long at) {
        AlarmManager m=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if(m!=null)m.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,snoozeIntent(c,key,PendingIntent.FLAG_UPDATE_CURRENT));
    }
    static boolean consumeSnooze(Context c, String key) {
        if(!owns(c,key)) return false;
        long at=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getLong("snooze_at",0);
        if(at==0 || at>System.currentTimeMillis()+1000)return false;
        c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove("snooze_at").apply();
        return true;
    }
    static void cancelSnooze(Context c,String key) {
        PendingIntent p=snoozeIntent(c,key,PendingIntent.FLAG_NO_CREATE);
        if(p!=null){AlarmManager m=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);if(m!=null)m.cancel(p);p.cancel();}
        c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove("snooze_at").apply();
        androidx.core.app.NotificationManagerCompat.from(c).cancel(key.hashCode());
    }
    private static boolean valid(String key) {
        return key != null && key.matches("checkin-[0-9a-fA-F-]{36}");
    }
}
