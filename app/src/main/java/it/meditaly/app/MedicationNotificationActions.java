package it.meditaly.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;

/** Activity actions authenticate the current patient before writing an intake. */
final class MedicationNotificationActions {
 static void add(Context context, NotificationCompat.Builder builder, String schedule,
                 String date, String patient) {
  if (schedule == null || date == null || patient == null) return;
  for (String status : new String[]{"taken", "skipped"}) {
   Intent intent = new Intent(context, MainActivity.class);
   intent.setAction("meditaly.INTAKE." + schedule + "." + date + "." + status);
   intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
   intent.putExtra("open_meditaly_tab", "therapy");
   intent.putExtra("intake_schedule", schedule);
   intent.putExtra("intake_date", date);
   intent.putExtra("intake_patient", patient);
   intent.putExtra("intake_status", status);
   PendingIntent action = PendingIntent.getActivity(context, intent.getAction().hashCode(), intent,
       PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
   builder.addAction(0, "taken".equals(status) ? "Assunto" : "Non assunto", action);
  }
 }
}
