import it.meditaly.app.medi.MediWakePhrase;
public class MediWakePhraseTest {
 public static void main(String[] args) {
  String[] positive={"Hei Medi", "EHI MEDI!", "hey medi", "ei Medi", "per favore ehi medi ascolta", "ehi medì"};
  String[] negative={"", "medi", "ehi medico", "hey meditaly", "intermediario", "hei mediana", "ehi medina", "medico", "sistema rimedi"};
  for(String text:positive)if(!MediWakePhrase.matches(text))throw new AssertionError("Missed: "+text);
  for(String text:negative)if(MediWakePhrase.matches(text))throw new AssertionError("False trigger: "+text);
  if(MediWakePhrase.matches(null))throw new AssertionError("null trigger");
  System.out.println("PASS: 16 phrase matcher cases (not acoustic/device tests)");
 }
}
