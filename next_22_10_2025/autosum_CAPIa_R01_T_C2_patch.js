/* ==========================================================================
 * PATCH: AUTOSUMĂ pentru CAPIa_R01_T_C2 (Total)
 * - Dacă există cel puțin o secțiune filială (CAPIa_CUATM_R_INDEX_FILIAL-1),
 *   CAPIa_R01_T_C2 devine sumă automată a CAPIa_R01_T_C2_FILIAL-1..n,
 *   capătă fundal cafeniu și devine readonly.
 * - Dacă NU există filiale, revine la parametrii inițiali.
 * Integrare: se poate include ca fișier separat după M3_C_11.js
 *            sau se poate lipi la finalul M3_C_11.js.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var TARGET_ID = '#CAPIa_R01_T_C2';
  var BGCOLOR = '#ebe9e6'; // cafeniu deschis
  var EVENTS = 'input change keyup blur';

  function getValues() {
    return (Drupal.settings && Drupal.settings.mywebform && Drupal.settings.mywebform.values) || {};
  }

  function filialExists() {
    var v = getValues();
    return v.CAPIa_CUATM_R_INDEX_FILIAL && Array.isArray(v.CAPIa_CUATM_R_INDEX_FILIAL) && v.CAPIa_CUATM_R_INDEX_FILIAL.length > 0;
  }

  function listFilialInputs() {
    var v = getValues();
    var sels = [];
    var arr = v.CAPIa_R01_T_C2_FILIAL;
    if (!arr || !Array.isArray(arr)) return sels;
    for (var i = 1; i <= arr.length; i++) {
      sels.push('#CAPIa_R01_T_C2_FILIAL-' + i);
    }
    return sels;
  }

  function toNum(x) { var f = parseFloat(x); return isNaN(f) ? 0 : f; }

  function updateSum() {
    if (!filialExists()) return;
    var total = 0;
    var found = false;
    listFilialInputs().forEach(function (sel) {
      var $el = $(sel);
      if ($el.length) { total += toNum($el.val()); found = true; }
    });
    if (!$(TARGET_ID).length) return;
    $(TARGET_ID).val(found && total !== 0 ? total : (found ? '' : $(TARGET_ID).val())).trigger('change');
  }

  function makeReadOnlyLook() {
    var $input = $(TARGET_ID);
    if (!$input.length) return;
    var $cell = $input.closest('td');
    $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
    $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
    $input.prop('readonly', true);
  }

  function restoreLook() {
    var $input = $(TARGET_ID);
    if (!$input.length) return;
    var $cell = $input.closest('td');
    $input.prop('readonly', false);
    $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
    $cell.css({ 'background-color': '', 'padding': '' });
  }

  // Expunem global pentru a putea fi reapelată după schimbări în rândurile de filiale
  window.watchAutoSum_CAPIa_R01_T_C2 = function () {
    // curățăm ascultătorii vechi
    listFilialInputs().forEach(function (sel) { $(sel).off(EVENTS, updateSum); });

    if (filialExists()) {
      makeReadOnlyLook();
      listFilialInputs().forEach(function (sel) { $(sel).on(EVENTS, updateSum); });
      updateSum();
    } else {
      restoreLook();
    }
  };

  // Integrare non-invazivă: dacă comportamentul munca3 e deja atașat, doar abonăm evenimentele
  $(function () {
    if (typeof window.watchAutoSum_CAPIa_R01_T_C2 === 'function') {
      window.watchAutoSum_CAPIa_R01_T_C2();
    }
    // reatașăm la adăugare/ștergere rânduri în FILIAL_CAPIa
    $('#FILIAL_CAPIa').on('row_added row_deleted', function () {
      if (typeof window.watchAutoSum_CAPIa_R01_T_C2 === 'function') {
        window.watchAutoSum_CAPIa_R01_T_C2();
      }
    });
  });

})(jQuery, Drupal);
