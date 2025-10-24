/* ==========================================================================
 * AUTOSUMĂ CAPIa v3.5 — fix corect pentru rândul din tabelul principal (row = PRIMUL indice după FILIAL)
 *  Ex.: CAPIa_R_F_C2_FILIAL-2-1  => row principal = 2 (nu 1)
 *  - Delegare pe toate *_FILIAL-*
 *  - Sume robuste cu querySelectorAll prefix
 *  - Stil/readonly DOAR pe targetele din tabelul principal
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6';
  var EVENTS = 'input change keyup blur';

  function isFilialId(id){ return id.indexOf('_FILIAL-') !== -1; }
  function toNum(x){ var f = parseFloat((''+x).replace(',', '.')); return isNaN(f) ? 0 : f; }

  function makeReadOnlyLook($input) {
    if (!$input || !$input.length) return;
    if (isFilialId($input.attr('id') || '')) return; // nu stilăm filiale
    var $cell = $input.closest('td');
    $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
    $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
    $input.prop('readonly', true);
  }
  function restoreLookAndClear($input) {
    if (!$input || !$input.length) return;
    if (isFilialId($input.attr('id') || '')) return; // nu atingem filiale
    var $cell = $input.closest('td');
    $input.prop('readonly', false);
    $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
    $cell.css({ 'background-color': '', 'padding': '' });
    $input.val('').trigger('change');
  }

  // ---- R01 (fix) ----
  var R01_TARGETS = [
    'CAPIa_R01_T_C2','CAPIa_R01_T_C4','CAPIa_R01_T_C5','CAPIa_R01_T_C6','CAPIa_R01_T_C7','CAPIa_R01_T_C8','CAPIa_R01_T_C9','CAPIa_R01_T_C10',
    'CAPIa_R01_F_C2','CAPIa_R01_F_C3','CAPIa_R01_F_C7','CAPIa_R01_F_C8'
  ];

  function listContribR01(base) {
    return Array.prototype.map.call(
      document.querySelectorAll('[id^="'+base+'_FILIAL-"]'),
      function(el){ return '#'+el.id; }
    );
  }

  function updateR01Target(base) {
    var $t = $('#'+base);
    if (!$t.length) return;
    var list = listContribR01(base);
    if (list.length === 0) { restoreLookAndClear($t); return; }
    var total = 0;
    list.forEach(function(sel){ var el = document.querySelector(sel); if (el) total += toNum(el.value); });
    makeReadOnlyLook($t);
    $t.val(total).trigger('change');
  }

  // ---- Dinamic ----
  var COLS_T = [2,4,5,6,7,8,9,10];
  var COLS_F = [2,3,7,8];

  function getDynamicRows() {
    return Array.prototype.map.call(
      document.querySelectorAll('input[id^="CAPIa_R_INDEX-"]'),
      function(el){ var m = el.id.match(/^CAPIa_R_INDEX-(\d+)$/); return m ? parseInt(m[1],10) : null; }
    ).filter(function(x){ return x !== null; }).sort(function(a,b){ return a-b; });
  }

  function listContribDyn(baseNoRow, row) {
    return Array.prototype.map.call(
      document.querySelectorAll('[id^="'+baseNoRow+'_FILIAL-'+row+'-"]'),
      function(el){ return '#'+el.id; }
    );
  }

  function updateDynamicRow(row) {
    // T
    COLS_T.forEach(function(c){
      var targetId = 'CAPIa_R_T_C'+c+'-'+row;
      var $t = $('#'+targetId);
      if (!$t.length) return;
      var list = listContribDyn('CAPIa_R_T_C'+c, row);
      if (list.length === 0) { restoreLookAndClear($t); return; }
      var total = 0; list.forEach(function(sel){ var el = document.querySelector(sel); if (el) total += toNum(el.value); });
      makeReadOnlyLook($t);
      $t.val(total).trigger('change');
    });
    // F
    COLS_F.forEach(function(c){
      var targetId = 'CAPIa_R_F_C'+c+'-'+row;
      var $t = $('#'+targetId);
      if (!$t.length) return;
      var list = listContribDyn('CAPIa_R_F_C'+c, row);
      if (list.length === 0) { restoreLookAndClear($t); return; }
      var total = 0; list.forEach(function(sel){ var el = document.querySelector(sel); if (el) total += toNum(el.value); });
      makeReadOnlyLook($t);
      $t.val(total).trigger('change');
    });
  }

  function initialSweep() {
    R01_TARGETS.forEach(updateR01Target);
    getDynamicRows().forEach(updateDynamicRow);
  }

  // Delegare — dinamic: row = PRIMUL indice după FILIAL (parentIndex)
  $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function(){
    var id = this.id;
    var mDyn = id.match(/^CAPIa_R_[TF]_C(\d+)_FILIAL-(\d+)-(\d+)$/);
    if (mDyn) {
      var row = parseInt(mDyn[2],10); // <== corect: PRIMUL indice = row principal
      updateDynamicRow(row);
      return;
    }
    var mR01 = id.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-\d+$/);
    if (mR01) {
      updateR01Target(mR01[1]);
    }
  });

  $(document).on('DOMNodeInserted DOMNodeRemoved', function(e){
    var id = (e.target && e.target.id) || '';
    if (/_FILIAL-/.test(id) || /^CAPIa_R_INDEX-\d+$/.test(id)) {
      initialSweep();
    }
  });

  $(function(){ initialSweep(); });

})(jQuery, Drupal);
