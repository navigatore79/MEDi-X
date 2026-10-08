package it.meditaly.app;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
public final class CheckinSnoozeReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context, Intent intent) {
  if(intent == null) return;
  String today = java.time.LocalDate.now(java.time.ZoneId.of("Europe/Rome")).toString();
  if(!today.equals(intent.getStringExtra("local_date"))) return;
  CheckinAlarmScheduler.snooze(context, intent.getStringExtra("reminder_key"), intent.getIntExtra("minutes", 0));
 }
}
