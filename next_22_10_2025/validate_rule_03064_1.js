function validate_rule_03064_1(value) {
    'use strict';

    // "value" este obiectul cu toate câmpurile formularului static
    var values = value || {};
    if (!values) {
        return;
    }

    // verificăm că există webform.errors (ca în ceilalți validatori statici)
    if (typeof webform === 'undefined' || !Array.isArray(webform.errors)) {
        return;
    }

    // --- Sumăm C2..C10 pentru R00-T (Total salariați, CAEM principal) --------
    var result00_T = 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C2) || 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C3) || 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C4) || 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C5) || 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C6) || 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C7) || 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C8) || 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C9) || 0;
    result00_T += parseFloat(values.CAPIa_R00_T_C10) || 0;

    result00_T = parseFloat(result00_T.toFixed(1));

    // --- Sumăm C2..C10 pentru R01-T (Total salariați, CAEM principal) --------
    var result01_T = 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C2) || 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C3) || 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C4) || 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C5) || 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C6) || 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C7) || 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C8) || 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C9) || 0;
    result01_T += parseFloat(values.CAPIa_R01_T_C10) || 0;

    result01_T = parseFloat(result01_T.toFixed(1));

    // Dacă ceva e NaN, nu facem nimic (defensiv)
    if (isNaN(result00_T) || isNaN(result01_T)) {
        console.error('03-064_1: valori invalide pentru R00-T sau R01-T', result00_T, result01_T);
        return;
    }

    // Regula 03-064 (Cap. I, static):
    // Dacă pe R00-T, C2..C10 există cel puțin o valoare nenulă,
    // atunci pe R01-T, C2..C10 trebuie să existe cel puțin o valoare nenulă.
    if (result00_T !== 0 && result01_T === 0) {
        webform.errors.push({
            fieldName: 'CAPIa_R01_T_C2',   // ancorăm pe primul câmp din R01-T
            index: 0,
            weight: 64,                    // ajustează dacă ai altă convenție
            options: {
                hide_title: true
            },
            msg: Drupal.t(
                'Cod eroare: 03-064, Cap. I., Rândul "Total salariați" (R01-T), ' +
                'coloanele 2-10 – lipsesc datele în CAEM principal, ' +
                'deși există date pe rândul "Total salariați" (R00-T), coloanele 2-10.'
            )
        });
    }
}
