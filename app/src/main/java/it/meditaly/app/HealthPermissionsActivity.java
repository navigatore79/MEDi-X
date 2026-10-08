package it.meditaly.app;
import android.app.Activity;
import android.os.Bundle;
import android.widget.*;
import android.content.Intent;
import android.net.Uri;
/** Required permission rationale, without any access to the patient's records. */
public final class HealthPermissionsActivity extends Activity {
 @Override public void onCreate(Bundle state){super.onCreate(state);ScrollView scroll=new ScrollView(this);LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);int p=(int)(20*getResources().getDisplayMetrics().density);box.setPadding(p,p,p,p);scroll.addView(box);TextView text=new TextView(this);text.setTextSize(17);text.setText("Meditaly · Dati di salute del telefono\n\nSe autorizzi l'accesso, Meditaly legge passi, distanza e calorie attive di oggi, sonno delle ultime 24 ore e gli ultimi valori degli ultimi 7 giorni di pressione, frequenza cardiaca, battito a riposo, variabilità cardiaca, saturazione, glicemia, temperatura, frequenza respiratoria, peso, altezza e massa grassa presenti in Health Connect. Puoi autorizzare solo i tipi di dati che desideri.\n\nQuesta funzione mostra i dati nella pagina Dispositivi durante la sessione. Non li salva nel profilo, non li invia automaticamente al medico e non modifica i dati di Health Connect. Fonte e data sono visibili accanto alle misure. Non calcola diagnosi né interpreta i valori.\n\nPuoi revocare l'accesso nelle impostazioni di Health Connect. I dati possono mancare se l'app del tuo dispositivo non li condivide con Health Connect.");box.addView(text);Button policy=new Button(this);policy.setText("Informativa privacy Meditaly");policy.setOnClickListener(v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://ejlhgtodmcadmdhbujkf.supabase.co/functions/v1/legal-docs?doc=privacy"))));box.addView(policy);Button close=new Button(this);close.setText("Chiudi");close.setOnClickListener(v->finish());box.addView(close);setContentView(scroll);}
}
