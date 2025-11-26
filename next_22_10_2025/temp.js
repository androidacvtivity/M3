/**
 * 03-064 (partea pentru Cap. I, static, fără filiale)
 *
 * Dacă există cel puțin o valoare nenulă pe rândul "Total salariați" (R00-T)
 * în coloanele C2..C10 (CAPIa_R00_T_C2 .. CAPIa_R00_T_C10),
 * atunci trebuie să existe cel puțin o valoare nenulă pe rândul "Total salariați" (R01-T)
 * în coloanele C2..C10 (CAPIa_R01_T_C2 .. CAPIa_R01_T_C10).
 *
 * values – obiectul de valori al formularului (this.getValues()).
 */
function validate_rule_03064_1(values, webform) {
    'use strict';

    if (!values) {
        return;
    }

    // Dacă nu se transmite webform, încercăm să-l luăm din this.
    if (!webform && typeof this !== 'undefined') {
        webform = this;
    }

    // Containerul de mesaje – folosim errors sau warnings, ce există.
    var container = null;
    if (webform && Array.isArray(webform.errors)) {
        container = webform.errors;
    } else if (webform && Array.isArray(webform.warnings)) {
        container = webform.warnings;
    } else if (Array.isArray(window.warnings)) {
        container = window.warnings;
    } else {
        // fallback – nu avem unde pune, ieșim fără să stricăm nimic
        return;
    }

    // --- helper numeric: null / undefined / "" -> 0 --------------------------
    function toNumber(v) {
        if (v === null || v === undefined || v === '') {
            return 0;
        }
        var n = +v;
        return isNaN(n) ? 0 : n;
    }

    /**
     * Sumează valorile C<colFrom>..C<colTo> pentru un prefix dat,
     * de forma:
     *   CAPIa_R00_T_C2, CAPIa_R00_T_C3, ...
     *   CAPIa_R01_T_C2, CAPIa_R01_T_C3, ...
     */
    function hasNonZero(prefix, colFrom, colTo) {
        var sum = 0;
        for (var c = colFrom; c <= colTo; c++) {
            var fieldName = prefix + c;
            if (Object.prototype.hasOwnProperty.call(values, fieldName)) {
                sum += toNumber(values[fieldName]);
            }
        }
        return sum !== 0;
    }

    var colFrom = 2;
    var colTo = 10; // C2..C10, conform specificației

    // Cap. I, rând 00-T (Total) – CAEM principal
    var has00 = hasNonZero('CAPIa_R00_T_C', colFrom, colTo);
    // Cap. I, rând 01-T (Total) – CAEM principal
    var has01 = hasNonZero('CAPIa_R01_T_C', colFrom, colTo);

    // Regula: dacă 00-T are date, 01-T trebuie să aibă și el
    if (has00 && !has01) {
        var msgBody = Drupal.t(
            'Cap. I., Rândul "Total salariați" (R01-T) – lipsesc datele în CAEM principal'
        );

        var fullMsg;
        if (typeof generateMessageTitle === 'function') {
            // Ancorăm pe R01, col.2 (CAPIa_R01_T_C2)
            fullMsg = generateMessageTitle('03-064', msgBody, 'CAPIa_R01_T_C2', 0, null);
        } else {
            fullMsg = 'Cod eroare: 03-064 - ' + msgBody;
        }

        container.push(fullMsg);
    }
}
