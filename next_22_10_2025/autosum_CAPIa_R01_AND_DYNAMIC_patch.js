/* ==========================================================================
 * R01 + DYNAMIC ROWS PATCH: AUTOSUMĂ pentru CAPIa (R01; T & F) + rânduri dinamice (T & F)
 *  - Dacă există cel puțin o filială (CAPIa_CUATM_R_INDEX_FILIAL-1),
 *    câmpurile țintă devin sumă automată a valorilor corespunzătoare din filiale,
 *    capătă fundal cafeniu și devin readonly.
 *  - La modificări în filiale sau în rândurile dinamice, sumele se recalculează live.
 *  - Dacă NU mai există filiale, câmpurile revin la starea inițială (editable) și se golesc.
 *
 * Acoperire:
 *  - R01_T: C2, C4, C5, C6, C7, C8, C9, C10
 *  - R01_F: C2, C3, C7, C8
 *  - Dinamic T: C2, C4, C5, C6, C7, C8, C9, C10  (ID-uri: CAPIa_R_T_CX-<row>)
 *  - Dinamic F: C2, C3, C7, C8                     (ID-uri: CAPIa_R_F_CX-<row>)
 *  - Filiale dinamice: CAPIa_R_T_CX_FILIAL-<row>-<filial>, CAPIa_R_F_CX_FILIAL-<row>-<filial>
 *
 * Integrare: include acest fișier după fișierul principal M3_C_*.js sau lipește-l la finalul lui.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6'; // cafeniu deschis
  var EVENTS = 'input change keyup blur';

  // ---------- Utilitare comune ----------
  function getValues() {
    return (Drupal.settings && Drupal.settings.mywebform && Drupal.settings.mywebform.values) || {};
  }
  function filialExists() {
    var v = getValues();
    return v.CAPIa_CUATM_R_INDEX_FILIAL && Array.isArray(v.CAPIa_CUATM_R_INDEX_FILIAL) && v.CAPIa_CUATM_R_INDEX_FILIAL.length > 0;
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
    // pentru R01: selector simplu: #<filialKey>-<i>
    var v = getValues(), sels = [], arr = v[filialKey];
    if (!arr || !Array.isArray(arr)) return sels;
    for (var i = 1; i <= arr.length; i++) sels.push('#' + filialKey + '-' + i);
    return sels;
  }
  function updateSumR01(targetSel, filialKey) {
    if (!filialExists()) return;
    var total = 0, found = false;
    listFilialInputsFlat(filialKey).forEach(function (sel) {
      var $el = $(sel);
      if ($el.length) { total += toNum($el.val()); found = true; }
    });
    var $t = $(targetSel);
    if (!$t.length) return;
    $t.val(found && total !== 0 ? total : (found ? '' : $t.val())).trigger('change');
  }
  function wireR01Targets() {
    // curățăm ascultătorii vechi
    TARGETS_R01.forEach(function (t) {
      listFilialInputsFlat(t.filialKey).forEach(function (sel) { $(sel).off(EVENTS); });
    });
    if (filialExists()) {
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
    // încercăm din settings; fallback pe DOM
    var v = getValues(), maxIdx = 0;
    if (Array.isArray(v.CAPIa_R_INDEX)) {
      maxIdx = v.CAPIa_R_INDEX.length;
    } else {
      // cautăm elemente de forma #CAPIa_R_T_C2-<n>
      $('[id^="CAPIa_R_T_C2-"]').each(function(){
        var m = this.id.match(/CAPIa_R_T_C2-(\d+)/);
        if (m) { maxIdx = Math.max(maxIdx, parseInt(m[1], 10)); }
      });
    }
    return maxIdx;
  }

  function listFilialInputsDyn(filialBase, row) {
    // selector: #<filialBase>-<row>-<filial>
    var sels = [], i = 1, guard = 0;
    while (guard < 500) { // protecție
      var sel = '#' + filialBase + '-' + row + '-' + i;
      if ($(sel).length) { sels.push(sel); i++; guard++; }
      else break;
    }
    return sels;
  }

  function updateSumDyn(targetBase, filialBase, row) {
    if (!filialExists()) return;
    var total = 0, found = false;
    listFilialInputsDyn(filialBase, row).forEach(function (sel) {
      var $el = $(sel);
      if ($el.length) { total += toNum($el.val()); found = true; }
    });
    var $t = $('#' + targetBase + '-' + row);
    if (!$t.length) return;
    $t.val(found && total !== 0 ? total : (found ? '' : $t.val())).trigger('change');
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
    if (filialExists()) {
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
  window.watchAutoSum_CAPIa_R01_AND_DYNAMIC = function () {
    wireR01Targets();
    wireDynamicRows();
  };

  $(function () {
    if (typeof window.watchAutoSum_CAPIa_R01_AND_DYNAMIC === 'function') {
      window.watchAutoSum_CAPIa_R01_AND_DYNAMIC();
    }
    // reatașare la adăugare/ștergere rânduri de filiale sau dinamice
    $('#FILIAL_CAPIa, #CAPIa').on('row_added row_deleted', function () {
      if (typeof window.watchAutoSum_CAPIa_R01_AND_DYNAMIC === 'function') {
        window.watchAutoSum_CAPIa_R01_AND_DYNAMIC();
      }
    });
  });

})(jQuery, Drupal);
