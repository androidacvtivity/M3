// 03-064-F – Cap. I, filiale (CAEM principal pe filiale)
function validate_rule_03064_1_F(values) {
    'use strict';

    // "values" este obiectul cu toate câmpurile formularului static
    values = values || {};

    if (typeof webform === 'undefined' || !Array.isArray(webform.errors)) {
        return;
    }

    // Lista filialelor CUATM – în cazul nostru: CAPIa_CUATM_R_INDEX_FILIAL
    var filList = values.CAPIa_CUATM_R_INDEX_FILIAL;
    if (!Array.isArray(filList) || filList.length === 0) {
        return;
    }

    // pentru fiecare filială j
    for (var j = 0; j < filList.length; j++) {

        // CUATM pentru filiala j
        var CAPIa_CUATM_R_FILIAL = isNaN(String(values.CAPIa_CUATM_R_FILIAL[j]))
            ? ""
            : String(values.CAPIa_CUATM_R_FILIAL[j]);

        // numărul tab-ului (tab. №1, №2, ...), presupunem j+1
        var tabNr = j + 1;

        // --- Sumăm C2..C10 pentru R00-T (Total salariați, FILIAL) ---
        var result00_T_F = 0;
        for (var c = 2; c <= 10; c++) {
            var arr00 = values['CAPIa_R00_T_C' + c + '_FILIAL'];
            var v00 = (arr00 && !isNaN(Number(arr00[j]))) ? Number(arr00[j]) : 0;
            result00_T_F += v00;
        }
        result00_T_F = parseFloat(result00_T_F.toFixed(1));

        // --- Sumăm C2..C10 pentru R01-T (Total salariați, FILIAL) ---
        var result01_T_F = 0;
        for (var c2 = 2; c2 <= 10; c2++) {
            var arr01 = values['CAPIa_R01_T_C' + c2 + '_FILIAL'];
            var v01 = (arr01 && !isNaN(Number(arr01[j]))) ? Number(arr01[j]) : 0;
            result01_T_F += v01;
        }
        result01_T_F = parseFloat(result01_T_F.toFixed(1));

        if (isNaN(result00_T_F) || isNaN(result01_T_F)) {
            console.error('03-064_1_F: valori invalide pentru filiala', j);
            continue;
        }

        // Regula 03-064-F:
        // Dacă R00-T are valori ≠ 0 și R01-T = 0 → eroare
        if (result00_T_F !== 0 && result01_T_F === 0) {
            webform.errors.push({
                fieldName: 'CAPIa_R01_T_C2_FILIAL',
                index: j,
                weight: 64,
                options: { hide_title: true },
                msg: Drupal.t(
                    'Cod eroare: 03-064, Cap. I. (tab. №@TAB). ' +
                    'Rândul "Total salariați" (R01-T), coloanele 2–10 – lipsesc ' +
                    'datele în CAEM principal, deși pe rândul "Total salariați" ' +
                    '(R00-T) există valori pe coloanele 2–10 (filiala CUATM @CUATM).',
                    {
                        '@TAB': tabNr,
                        '@CUATM': CAPIa_CUATM_R_FILIAL
                    }
                )
            });
        }
    }
}
