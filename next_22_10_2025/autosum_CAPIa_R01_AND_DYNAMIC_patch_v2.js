/* ==========================================================================
 * R01 + DYNAMIC ROWS PATCH v2 (robust): AUTOSUMĂ pentru CAPIa (R01; T & F) + rânduri dinamice (T & F)
 *  - Detectare existență filiale și pe DOM (nu doar din Drupal.settings).
 *  - Setează valoarea și când suma este 0 (nu golește câmpul).
 *  - Recalculează live la modificări; la absența tuturor filialelor -> revine editable + clear.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6'; // cafeniu deschis
  var EVENTS = 'input change keyup blur';

  function getValues() {
    return (Drupal.settings && Drupal.settings.mywebform && Drupal.settings.mywebform.values) || {};
  }

  // --- Existența filialelor: și din settings, și din DOM ---
  function filialExistsGlobal() {
    var v = getValues();
    if (v.CAPIa_CUATM_R_INDEX_FILIAL && Array.isArray(v.CAPIa_CUATM_R_INDEX_FILIAL) && v.CAPIa_CUATM_R_INDEX_FILIAL.length > 0) {
      return true;
    }
    // fallback DOM: există vreun input *_FILIAL-*?
    return $('[id*="_FILIAL-"]').length > 0;
  }

  function toNum(x) { var f = parseFloat(x); return isNaN(f) ? 0 : f; }
  function makeReadOnlyLook($input) {
    if (!$input || !$input.length) return;
    var $cell = $input.closest('td');
    $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
    $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
    $input.prop('readonly', true);
  }
  function restoreLookAndClear($input) {
    if (!$input || !$input.length) return;
    var $cell = $input.closest('td');
    $input.prop('readonly', false);
    $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
    $cell.css({ 'background-color': '', 'padding': '' });
    $input.val('').trigger('change');
  }

  // ---------- R01 (fix) ----------
  var TARGETS_R01 = [
    // T
    { id: '#CAPIa_R01_T_C2',  filialKey: 'CAPIa_R01_T_C2_FILIAL'  },
    { id: '#CAPIa_R01_T_C4',  filialKey: 'CAPIa_R01_T_C4_FILIAL'  },
    { id: '#CAPIa_R01_T_C5',  filialKey: 'CAPIa_R01_T_C5_FILIAL'  },
    { id: '#CAPIa_R01_T_C6',  filialKey: 'CAPIa_R01_T_C6_FILIAL'  },
    { id: '#CAPIa_R01_T_C7',  filialKey: 'CAPIa_R01_T_C7_FILIAL'  },
    { id: '#CAPIa_R01_T_C8',  filialKey: 'CAPIa_R01_T_C8_FILIAL'  },
    { id: '#CAPIa_R01_T_C9',  filialKey: 'CAPIa_R01_T_C9_FILIAL'  },
    { id: '#CAPIa_R01_T_C10', filialKey: 'CAPIa_R01_T_C10_FILIAL' },
    // F
    { id: '#CAPIa_R01_F_C2', filialKey: 'CAPIa_R01_F_C2_FILIAL' },
    { id: '#CAPIa_R01_F_C3', filialKey: 'CAPIa_R01_F_C3_FILIAL' },
    { id: '#CAPIa_R01_F_C7', filialKey: 'CAPIa_R01_F_C7_FILIAL' },
    { id: '#CAPIa_R01_F_C8', filialKey: 'CAPIa_R01_F_C8_FILIAL' }
  ];

  function listFilialInputsFlat(filialKey) {
    // pentru R01: #<filialKey>-<i>
    var sels = [];
    // contăm DOM-ul direct pentru robustețe
    var i = 1, guard = 0;
    while (guard < 1000) {
      var sel = '#' + filialKey + '-' + i;
      if ($(sel).length) { sels.push(sel); i++; guard++; } else { break; }
    }
    return sels;
  }

  function updateSumR01(targetSel, filialKey) {
    var total = 0, found = false;
    listFilialInputsFlat(filialKey).forEach(function (sel) {
      var $el = $(sel);
      if ($el.length) { total += toNum($el.val()); found = true; }
    });
    var $t = $(targetSel);
    if (!$t.length) return;
    if (!found) return; // nu am găsit filiale pentru ținta asta
    // Afișează și 0 (nu goli)
    $t.val(total).trigger('change');
  }

  function wireR01Targets() {
    // curățăm ascultătorii vechi
    TARGETS_R01.forEach(function (t) {
      listFilialInputsFlat(t.filialKey).forEach(function (sel) { $(sel).off(EVENTS); });
    });
    if (filialExistsGlobal()) {
      TARGETS_R01.forEach(function (t) {
        var $t = $(t.id);
        makeReadOnlyLook($t);
        listFilialInputsFlat(t.filialKey).forEach(function (sel) {
          $(sel).on(EVENTS, function () { updateSumR01(t.id, t.filialKey); });
        });
        updateSumR01(t.id, t.filialKey);
      });
    } else {
      TARGETS_R01.forEach(function (t) { restoreLookAndClear($(t.id)); });
    }
  }

  // ---------- Dinamic (pe rânduri) ----------
  var COLS_T = [2,4,5,6,7,8,9,10];
  var COLS_F = [2,3,7,8];

  function getDynRowCount() {
    // determinăm nr. de rânduri din DOM (#CAPIa_R_T_C2-<n>)
    var maxIdx = 0;
    $('[id^="CAPIa_R_T_C2-"]').each(function(){
      var m = this.id.match(/CAPIa_R_T_C2-(\d+)/);
      if (m) { maxIdx = Math.max(maxIdx, parseInt(m[1], 10)); }
    });
    $('[id^="CAPIa_R_F_C2-"]').each(function(){
      var m = this.id.match(/CAPIa_R_F_C2-(\d+)/);
      if (m) { maxIdx = Math.max(maxIdx, parseInt(m[1], 10)); }
    });
    return maxIdx;
  }

  function listFilialInputsDyn(filialBase, row) {
    // selector: #<filialBase>-<row>-<filial>
    var sels = [], j = 1, guard = 0;
    while (guard < 1000) {
      var sel = '#' + filialBase + '-' + row + '-' + j;
      if ($(sel).length) { sels.push(sel); j++; guard++; } else { break; }
    }
    return sels;
  }

  function updateSumDyn(targetBase, filialBase, row) {
    var total = 0, found = false;
    listFilialInputsDyn(filialBase, row).forEach(function (sel) {
      var $el = $(sel);
      if ($el.length) { total += toNum($el.val()); found = true; }
    });
    var $t = $('#' + targetBase + '-' + row);
    if (!$t.length) return;
    if (!found) return;
    $t.val(total).trigger('change');
  }

  function wireDynamicRows() {
    var rows = getDynRowCount();
    // întâi dezlegăm ascultători vechi
    for (var r = 1; r <= rows; r++) {
      COLS_T.forEach(function (c) {
        listFilialInputsDyn('CAPIa_R_T_C' + c + '_FILIAL', r).forEach(function (sel) { $(sel).off(EVENTS); });
      });
      COLS_F.forEach(function (c) {
        listFilialInputsDyn('CAPIa_R_F_C' + c + '_FILIAL', r).forEach(function (sel) { $(sel).off(EVENTS); });
      });
    }
    if (filialExistsGlobal()) {
      for (var i = 1; i <= rows; i++) {
        // T
        COLS_T.forEach(function (c) {
          var $t = $('#CAPIa_R_T_C' + c + '-' + i);
          makeReadOnlyLook($t);
          listFilialInputsDyn('CAPIa_R_T_C' + c + '_FILIAL', i).forEach(function (sel) {
            $(sel).on(EVENTS, (function(row, col){ return function(){ updateSumDyn('CAPIa_R_T_C' + col, 'CAPIa_R_T_C' + col + '_FILIAL', row); }; })(i, c));
          });
          updateSumDyn('CAPIa_R_T_C' + c, 'CAPIa_R_T_C' + c + '_FILIAL', i);
        });
        // F
        COLS_F.forEach(function (c) {
          var $t = $('#CAPIa_R_F_C' + c + '-' + i);
          makeReadOnlyLook($t);
          listFilialInputsDyn('CAPIa_R_F_C' + c + '_FILIAL', i).forEach(function (sel) {
            $(sel).on(EVENTS, (function(row, col){ return function(){ updateSumDyn('CAPIa_R_F_C' + col, 'CAPIa_R_F_C' + col + '_FILIAL', row); }; })(i, c));
          });
          updateSumDyn('CAPIa_R_F_C' + c, 'CAPIa_R_F_C' + c + '_FILIAL', i);
        });
      }
    } else {
      // fără filiale -> revenire & clear
      for (var j = 1; j <= rows; j++) {
        COLS_T.forEach(function (c) { restoreLookAndClear($('#CAPIa_R_T_C' + c + '-' + j)); });
        COLS_F.forEach(function (c) { restoreLookAndClear($('#CAPIa_R_F_C' + c + '-' + j)); });
      }
    }
  }

  // ---------- Puncte de intrare ----------
  window.watchAutoSum_CAPIa_R01_AND_DYNAMIC_v2 = function () {
    wireR01Targets();
    wireDynamicRows();
  };

  $(function () {
    if (typeof window.watchAutoSum_CAPIa_R01_AND_DYNAMIC_v2 === 'function') {
      window.watchAutoSum_CAPIa_R01_AND_DYNAMIC_v2();
    }
    // reatașare la adăugare/ștergere rânduri de filiale sau dinamice
    $('#FILIAL_CAPIa, #CAPIa').on('row_added row_deleted', function () {
      if (typeof window.watchAutoSum_CAPIa_R01_AND_DYNAMIC_v2 === 'function') {
        window.watchAutoSum_CAPIa_R01_AND_DYNAMIC_v2();
      }
    });
  });

})(jQuery, Drupal);
