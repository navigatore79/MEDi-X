package it.meditaly.app;

import android.content.Context;

final class ReminderDedupe {
    private ReminderDedupe() {}

    static boolean alreadyShown(Context context, String date, String slot) {
        if (date == null || slot == null || slot.isEmpty()) return false;
        return context.getSharedPreferences("meditaly_reminder_receipts", Context.MODE_PRIVATE)
                .getBoolean(date + ":" + slot, false);
    }

    static void markShown(Context context, String date, String slot) {
        if (date == null || slot == null || slot.isEmpty()) return;
        context.getSharedPreferences("meditaly_reminder_receipts", Context.MODE_PRIVATE)
                .edit().putBoolean(date + ":" + slot, true).apply();
    }
}
