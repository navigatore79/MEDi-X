package it.meditaly.app.medi;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Local phrase matching only: this is not speaker authentication. */
public final class MediWakePhrase {
    private static final Pattern WAKE = Pattern.compile("(?:^|\\s)(?:hei|hey|ehi|ei)\\s+medi(?:$|\\s)");
    public static boolean matches(String text) {
        if (text == null) return false;
        String normalized = Normalizer.normalize(text.toLowerCase(Locale.ITALIAN), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
        return WAKE.matcher(normalized).find();
    }
    private MediWakePhrase() {}
}
