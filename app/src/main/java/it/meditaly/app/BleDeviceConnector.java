package it.meditaly.app;
import android.Manifest;
import android.app.Activity;
import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.*;

/** Foreground BLE measurements using standard pressure and heart-rate services only. */
final class BleDeviceConnector {
 interface Listener{void event(JSONObject event);}
 private final Activity activity;private final Listener listener;private final Handler handler=new Handler(Looper.getMainLooper());
 private BluetoothLeScanner scanner;private BluetoothGatt gatt;private boolean scanning;private String deviceName="",requestId="";
 private final Map<String,BluetoothDevice> found=new java.util.concurrent.ConcurrentHashMap<>();
 private final Map<String,String> names=new java.util.concurrent.ConcurrentHashMap<>();
 private final ArrayDeque<BluetoothGattDescriptor> subscriptions=new ArrayDeque<>();
 private boolean subscriptionFailed;
 private static UUID uuid(String shortId){return UUID.fromString("0000"+shortId+"-0000-1000-8000-00805f9b34fb");}
 BleDeviceConnector(Activity a,Listener l){activity=a;listener=l;}
 private void event(String type,String message){try{listener.event(new JSONObject().put("type",type).put("requestId",requestId).put("message",message));}catch(Exception ignored){}}
 private void status(String message){event("status",message);}
 boolean permitted(){if(Build.VERSION.SDK_INT>=31)return activity.checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN)==PackageManager.PERMISSION_GRANTED&&activity.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)==PackageManager.PERMISSION_GRANTED;return activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;}
 void denied(String id){requestId=id;status("Ricerca non avviata: autorizza i dispositivi nelle vicinanze nelle impostazioni di Meditaly.");}
 void scan(String id){
  disconnect();requestId=id;
  if(!permitted()){status("Autorizza i dispositivi nelle vicinanze, poi ripeti la ricerca.");return;}
  try{BluetoothManager manager=activity.getSystemService(BluetoothManager.class);BluetoothAdapter adapter=manager==null?null:manager.getAdapter();if(adapter==null||!adapter.isEnabled()){status("Attiva Bluetooth sul telefono e metti il dispositivo in modalità associazione.");return;}
   stop();found.clear();names.clear();scanner=adapter.getBluetoothLeScanner();if(scanner==null){status("Ricerca Bluetooth non disponibile.");return;}scanning=true;scanner.startScan(callback);status("Ricerca per 15 secondi. Tieni il dispositivo acceso e vicino al telefono.");handler.postDelayed(()->{stop();status(found.isEmpty()?"Nessun dispositivo trovato. Attiva la modalità associazione e riprova; alcuni orologi si collegano solo tramite l’app del produttore.":"Ricerca terminata. Tocca il nome del tuo dispositivo per verificare la compatibilità.");},15000);
  }catch(Exception e){status("Ricerca non disponibile. Controlla Bluetooth e autorizzazioni.");}
 }
 void stop(){handler.removeCallbacksAndMessages(null);if(scanner!=null&&scanning)try{scanner.stopScan(callback);}catch(Exception ignored){}scanning=false;}
 private final ScanCallback callback=new ScanCallback(){
  @Override public void onScanResult(int type,ScanResult result){try{BluetoothDevice device=result.getDevice();String address=device.getAddress();ScanRecord record=result.getScanRecord();String name=record==null?null:record.getDeviceName();if(name==null)name=device.getName();if(name==null||name.isEmpty())name="Nome non trasmesso";String kind="Da verificare";if(record!=null&&record.getServiceUuids()!=null){for(android.os.ParcelUuid u:record.getServiceUuids()){if(u.getUuid().equals(uuid("1810")))kind="Pressione BLE standard";else if(u.getUuid().equals(uuid("180d")))kind="Frequenza cardiaca BLE standard";}}if(kind.equals("Da verificare"))return;found.put(address,device);names.put(address,name);listener.event(new JSONObject().put("type","device").put("requestId",requestId).put("address",address).put("name",name).put("kind",kind));}catch(Exception ignored){}}
  @Override public void onScanFailed(int code){scanning=false;status("Ricerca non riuscita. Attendi qualche secondo e riprova.");}
 };
 void connect(String address){
  if(!permitted()){status("Autorizzazione Bluetooth mancante.");return;}BluetoothDevice device=found.get(address);if(device==null){status("Ripeti la ricerca prima di collegarti.");return;}
  stop();disconnect();deviceName=names.getOrDefault(address,"Dispositivo Bluetooth");status("Verifico "+deviceName+"… Se Android chiede di associare, conferma solo il tuo dispositivo.");
  try{gatt=device.connectGatt(activity,false,callbacks,BluetoothDevice.TRANSPORT_LE);handler.postDelayed(()->{if(gatt!=null&&subscriptions.isEmpty())status("Se non arrivano misure, attiva la trasmissione sul dispositivo oppure usa la sua app e Health Connect.");},20000);}catch(Exception e){status("Connessione non riuscita. Controlla il dispositivo e riprova.");}
 }
 private final BluetoothGattCallback callbacks=new BluetoothGattCallback(){
  @Override public void onConnectionStateChange(BluetoothGatt connection,int code,int state){handler.post(()->{if(connection!=gatt){connection.close();return;}if(code==BluetoothGatt.GATT_SUCCESS&&state==BluetoothProfile.STATE_CONNECTED){try{connection.discoverServices();}catch(Exception e){status("Servizi non disponibili.");}}else if(state==BluetoothProfile.STATE_DISCONNECTED){connection.close();gatt=null;subscriptions.clear();event("disconnected","Dispositivo disconnesso. Le misure ricevute restano visibili in questa sessione.");}});}
  @Override public void onServicesDiscovered(BluetoothGatt connection,int code){handler.post(()->{
   if(connection!=gatt)return;if(code!=BluetoothGatt.GATT_SUCCESS){status("Impossibile verificare i servizi. Riprova.");return;}
   try{JSONArray supported=new JSONArray();subscriptions.clear();subscriptionFailed=false;
    for(String[] spec:new String[][]{{"1810","2a35","pressure"},{"180d","2a37","heart"}}){BluetoothGattService service=connection.getService(uuid(spec[0]));BluetoothGattCharacteristic c=service==null?null:service.getCharacteristic(uuid(spec[1]));if(c==null)continue;BluetoothGattDescriptor descriptor=c.getDescriptor(uuid("2902"));int properties=c.getProperties();if(descriptor==null||(properties&(BluetoothGattCharacteristic.PROPERTY_INDICATE|BluetoothGattCharacteristic.PROPERTY_NOTIFY))==0)continue;
     if(!connection.setCharacteristicNotification(c,true))continue;descriptor.setValue((properties&BluetoothGattCharacteristic.PROPERTY_INDICATE)!=0?BluetoothGattDescriptor.ENABLE_INDICATION_VALUE:BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);subscriptions.add(descriptor);supported.put(spec[2]);
    }
    listener.event(new JSONObject().put("type","services").put("requestId",requestId).put("name",deviceName).put("supported",supported));if(!subscriptions.isEmpty())writeNext(connection);else status("Questo dispositivo non espone misure standard di pressione o frequenza cardiaca. Usa l’app del produttore e condividi i dati con Health Connect, se supportato.");
   }catch(Exception e){status("Compatibilità non verificata. Prova tramite l’app del produttore.");}
  });}
  @Override public void onDescriptorWrite(BluetoothGatt connection,BluetoothGattDescriptor descriptor,int code){handler.post(()->{if(connection!=gatt)return;if(code!=BluetoothGatt.GATT_SUCCESS){subscriptionFailed=true;status("Il dispositivo non ha autorizzato la lettura. Completa l’associazione o usa l’app del produttore.");}if(!subscriptions.isEmpty())subscriptions.remove();writeNext(connection);});}
  @Override public void onCharacteristicChanged(BluetoothGatt connection,BluetoothGattCharacteristic c){if(Build.VERSION.SDK_INT<33)measurement(connection,c,c.getValue());}
  @Override public void onCharacteristicChanged(BluetoothGatt connection,BluetoothGattCharacteristic c,byte[] value){measurement(connection,c,value);}
 };
 private void writeNext(BluetoothGatt connection){if(subscriptions.isEmpty()){if(!subscriptionFailed)event("ready","Lettura attiva. Esegui una misurazione sul dispositivo: il valore apparirà qui quando viene trasmesso.");return;}try{if(!connection.writeDescriptor(subscriptions.peek())){subscriptionFailed=true;subscriptions.remove();status("Lettura non attivata. Riprova la connessione.");writeNext(connection);}}catch(Exception e){subscriptionFailed=true;subscriptions.clear();status("Lettura non attivata. Controlla le autorizzazioni.");}}
 private void measurement(BluetoothGatt connection,BluetoothGattCharacteristic c,byte[] value){if(connection!=gatt)return;try{JSONObject e=new JSONObject().put("type","measurement").put("requestId",requestId).put("source",deviceName).put("time",java.time.Instant.now().toString());if(c.getUuid().equals(uuid("2a35"))){double[] p=BleMeasurements.pressure(value);if(p==null){status("Misura di pressione incompleta o non valida: ripeti la misurazione.");return;}e.put("metric","pressure").put("value",Math.round(p[0])+" / "+Math.round(p[1])).put("unit","mmHg");if(Double.isFinite(p[3]))e.put("pulse",Math.round(p[3]));}else if(c.getUuid().equals(uuid("2a37"))){int heart=BleMeasurements.heart(value);if(heart<0)return;e.put("metric","heart").put("value",String.valueOf(heart)).put("unit","bpm");}else return;listener.event(e);}catch(Exception ignored){}}
 void disconnect(){handler.removeCallbacksAndMessages(null);subscriptions.clear();if(gatt!=null){BluetoothGatt old=gatt;gatt=null;try{old.disconnect();old.close();}catch(Exception ignored){}}event("disconnected","Nessun dispositivo collegato.");}
 void destroy(){stop();disconnect();}
}
