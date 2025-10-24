/* ==========================================================================
 * PATCH: AUTOSUMĂ pentru CAPIa_R01_F_C2, CAPIa_R01_F_C3, CAPIa_R01_F_C7, CAPIa_R01_F_C8 (Femei)
 * - Dacă există cel puțin o secțiune filială (CAPIa_CUATM_R_INDEX_FILIAL-1),
 *   fiecare țintă devine sumă automată a valorilor corespunzătoare din filiale:
 *     CAPIa_R01_F_CX = SUM(CAPIa_R01_F_CX_FILIAL-1..n), pentru X ∈ {2,3,7,8}
 *   capătă fundal cafeniu și devin readonly.
 * - Dacă NU există filiale, revin la parametrii inițiali **și se golește valoarea**.
 * - La adăugare/ștergere filială, suma se recalculează imediat; dacă a rămas 0 filiale, câmpul autosumă se golește.
 * Integrare: include acest fișier după fișierul principal M3_C_*.js sau lipește-l la finalul lui.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6'; // cafeniu deschis
  var EVENTS = 'input change keyup blur';
  var TARGETS_F = [
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
  window.watchAutoSum_CAPIa_R01_F_MULTI = function () {
    // curățăm ascultătorii vechi pentru toate țintele
    TARGETS_F.forEach(function (t) {
      listFilialInputs(t.filialKey).forEach(function (sel) { $(sel).off(EVENTS); });
    });

    if (filialExists()) {
      TARGETS_F.forEach(function (t) {
        makeReadOnlyLook(t.id);
        listFilialInputs(t.filialKey).forEach(function (sel) {
          $(sel).on(EVENTS, function(){ updateSumFor(t.id, t.filialKey); });
        });
        updateSumFor(t.id, t.filialKey);
      });
    } else {
      TARGETS_F.forEach(function (t) { restoreLookAndClear(t.id); });
    }
  };

  // Inițializare + reatașare la adăugare/ștergere rânduri filiale
  $(function () {
    if (typeof window.watchAutoSum_CAPIa_R01_F_MULTI === 'function') {
      window.watchAutoSum_CAPIa_R01_F_MULTI();
    }
    $('#FILIAL_CAPIa').on('row_added row_deleted', function () {
      if (typeof window.watchAutoSum_CAPIa_R01_F_MULTI === 'function') {
        window.watchAutoSum_CAPIa_R01_F_MULTI();
      }
    });
  });

})(jQuery, Drupal);
