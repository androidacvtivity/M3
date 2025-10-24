/* ==========================================================================
 * UNIFIED PATCH: AUTOSUMĂ pentru CAPIa (R00 & R01; Total & Femei)
 *  - Dacă există cel puțin o secțiune filială (CAPIa_CUATM_R_INDEX_FILIAL-1),
 *    câmpurile țintă devin sumă automată a valorilor corespunzătoare din filiale,
 *    capătă fundal cafeniu și devin readonly.
 *  - La modificări în filiale, sumele se recalculează live.
 *  - Dacă NU mai există filiale, câmpurile revin la starea inițială (editable) și se golesc.
 *
 * Acoperire:
 *  - Total (T), R01: C2, C4, C5, C6, C7, C8, C9, C10
 *  - Total (T), R00: C2, C4, C5, C6, C7, C8, C9, C10
 *  - Femei (F), R01: C2, C3, C7, C8
 *  - Femei (F), R00: C2, C3, C7, C8
 *
 * Integrare: include acest fișier după fișierul principal M3_C_*.js sau lipește-l la finalul lui.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6'; // cafeniu deschis
  var EVENTS = 'input change keyup blur';

  var TARGETS = [
    // --- TOTAL (T) ---
    // R01
    { id: '#CAPIa_R01_T_C2',  filialKey: 'CAPIa_R01_T_C2_FILIAL'  },
    { id: '#CAPIa_R01_T_C4',  filialKey: 'CAPIa_R01_T_C4_FILIAL'  },
    { id: '#CAPIa_R01_T_C5',  filialKey: 'CAPIa_R01_T_C5_FILIAL'  },
    { id: '#CAPIa_R01_T_C6',  filialKey: 'CAPIa_R01_T_C6_FILIAL'  },
    { id: '#CAPIa_R01_T_C7',  filialKey: 'CAPIa_R01_T_C7_FILIAL'  },
    { id: '#CAPIa_R01_T_C8',  filialKey: 'CAPIa_R01_T_C8_FILIAL'  },
    { id: '#CAPIa_R01_T_C9',  filialKey: 'CAPIa_R01_T_C9_FILIAL'  },
    { id: '#CAPIa_R01_T_C10', filialKey: 'CAPIa_R01_T_C10_FILIAL' },
    // // R00
    // { id: '#CAPIa_R00_T_C2',  filialKey: 'CAPIa_R00_T_C2_FILIAL'  },
    // { id: '#CAPIa_R00_T_C4',  filialKey: 'CAPIa_R00_T_C4_FILIAL'  },
    // { id: '#CAPIa_R00_T_C5',  filialKey: 'CAPIa_R00_T_C5_FILIAL'  },
    // { id: '#CAPIa_R00_T_C6',  filialKey: 'CAPIa_R00_T_C6_FILIAL'  },
    // { id: '#CAPIa_R00_T_C7',  filialKey: 'CAPIa_R00_T_C7_FILIAL'  },
    // { id: '#CAPIa_R00_T_C8',  filialKey: 'CAPIa_R00_T_C8_FILIAL'  },
    // { id: '#CAPIa_R00_T_C9',  filialKey: 'CAPIa_R00_T_C9_FILIAL'  },
    // { id: '#CAPIa_R00_T_C10', filialKey: 'CAPIa_R00_T_C10_FILIAL' },
    // --- FEMEI (F) ---
    // R01
    { id: '#CAPIa_R01_F_C2', filialKey: 'CAPIa_R01_F_C2_FILIAL' },
    { id: '#CAPIa_R01_F_C3', filialKey: 'CAPIa_R01_F_C3_FILIAL' },
    { id: '#CAPIa_R01_F_C7', filialKey: 'CAPIa_R01_F_C7_FILIAL' },
    { id: '#CAPIa_R01_F_C8', filialKey: 'CAPIa_R01_F_C8_FILIAL' }

  ];

  function getValues() {
    return (Drupal.settings && Drupal.settings.mywebform && Drupal.settings.mywebform.values) || {};
  }

  function filialExists() {
    var v = getValues();
    return v.CAPIa_CUATM_R_INDEX_FILIAL && Array.isArray(v.CAPIa_CUATM_R_INDEX_FILIAL) && v.CAPIa_CUATM_R_INDEX_FILIAL.length > 0;
  }

  function listFilialInputs(filialKey) {
    var v = getValues();
    var sels = [];
    var arr = v[filialKey];
    if (!arr || !Array.isArray(arr)) return sels;
    for (var i = 1; i <= arr.length; i++) {
      sels.push('#' + filialKey + '-' + i);
    }
    return sels;
  }

  function toNum(x) { var f = parseFloat(x); return isNaN(f) ? 0 : f; }

  function updateSumFor(targetId, filialKey) {
    if (!filialExists()) return;
    var total = 0, found = false;
    listFilialInputs(filialKey).forEach(function (sel) {
      var $el = $(sel);
      if ($el.length) { total += toNum($el.val()); found = true; }
    });
    if (!$(targetId).length) return;
    $(targetId).val(found && total !== 0 ? total : (found ? '' : $(targetId).val())).trigger('change');
  }

  function makeReadOnlyLook(targetId) {
    var $input = $(targetId);
    if (!$input.length) return;
    var $cell = $input.closest('td');
    $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
    $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
    $input.prop('readonly', true);
  }

  function restoreLookAndClear(targetId) {
    var $input = $(targetId);
    if (!$input.length) return;
    var $cell = $input.closest('td');
    $input.prop('readonly', false);
    $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
    $cell.css({ 'background-color': '', 'padding': '' });
    $input.val('').trigger('change');
  }

  // Expunem global pentru (re)activare după schimbări în rândurile de filiale
  window.watchAutoSum_CAPIa_UNIFIED = function () {
    // curățăm ascultătorii vechi pentru toate țintele
    TARGETS.forEach(function (t) {
      listFilialInputs(t.filialKey).forEach(function (sel) { $(sel).off(EVENTS); });
    });

    if (filialExists()) {
      TARGETS.forEach(function (t) {
        makeReadOnlyLook(t.id);
        listFilialInputs(t.filialKey).forEach(function (sel) {
          $(sel).on(EVENTS, function(){ updateSumFor(t.id, t.filialKey); });
        });
        updateSumFor(t.id, t.filialKey);
      });
    } else {
      TARGETS.forEach(function (t) { restoreLookAndClear(t.id); });
    }
  };

  // Inițializare + reatașare la adăugare/ștergere rânduri filiale
  $(function () {
    if (typeof window.watchAutoSum_CAPIa_UNIFIED === 'function') {
      window.watchAutoSum_CAPIa_UNIFIED();
    }
    $('#FILIAL_CAPIa').on('row_added row_deleted', function () {
      if (typeof window.watchAutoSum_CAPIa_UNIFIED === 'function') {
        window.watchAutoSum_CAPIa_UNIFIED();
      }
    });
  });

})(jQuery, Drupal);
