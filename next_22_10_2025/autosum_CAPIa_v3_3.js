/* ==========================================================================
 * AUTOSUMĂ CAPIa v3.3 — dynamic multi-filial fix
 *  - Colectează contribuțiile cu querySelectorAll('[id^="<base>_FILIAL-<row>-"]') ⇒ nu se mai oprește la primul gol.
 *  - Delegare de evenimente pe toate *_FILIAL-* ⇒ filiala 2, 3, ... se calculează imediat.
 *  - Stil/readonly DOAR pe targetele principale; filiale rămân editabile.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6';
  var EVENTS = 'input change keyup blur';

  function isFilialId(id){ return id.indexOf('_FILIAL-') !== -1; }
  function toNum(x){ var f = parseFloat((''+x).replace(',', '.')); return isNaN(f) ? 0 : f; }

  function makeReadOnlyLook($input) {
    if (!$input || !$input.length) return;
    if (isFilialId($input.attr('id') || '')) return; // never style filial
    var $cell = $input.closest('td');
    $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
    $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
    $input.prop('readonly', true);
  }
  function restoreLookAndClear($input) {
    if (!$input || !$input.length) return;
    if (isFilialId($input.attr('id') || '')) return; // never touch filial
    var $cell = $input.closest('td');
    $input.prop('readonly', false);
    $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
    $cell.css({ 'background-color': '', 'padding': '' });
    $input.val('').trigger('change');
  }

  // ---- Helpers R01 (fix) ----
  var R01_TARGETS = [
    'CAPIa_R01_T_C2','CAPIa_R01_T_C4','CAPIa_R01_T_C5','CAPIa_R01_T_C6','CAPIa_R01_T_C7','CAPIa_R01_T_C8','CAPIa_R01_T_C9','CAPIa_R01_T_C10',
    'CAPIa_R01_F_C2','CAPIa_R01_F_C3','CAPIa_R01_F_C7','CAPIa_R01_F_C8'
  ];

  function listContribR01(base) {
    // toate id-urile care încep cu "<base>_FILIAL-"
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

  // ---- Helpers Dinamic ----
  var COLS_T = [2,4,5,6,7,8,9,10];
  var COLS_F = [2,3,7,8];

  function getDynamicRows() {
    return Array.prototype.map.call(
      document.querySelectorAll('input[id^="CAPIa_R_INDEX-"]'),
      function(el){ var m = el.id.match(/^CAPIa_R_INDEX-(\d+)$/); return m ? parseInt(m[1],10) : null; }
    ).filter(function(x){ return x !== null; }).sort(function(a,b){ return a-b; });
  }

  function listContribDyn(baseNoRow, row) {
    // toate id-urile care încep cu "<baseNoRow>_FILIAL-<row>-"
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

  // ---- Bootstrap & Events ----
  function initialSweep() {
    // R01
    R01_TARGETS.forEach(updateR01Target);
    // Dinamic
    getDynamicRows().forEach(updateDynamicRow);
  }

  // Recalc pe orice modificare în filiale (delegat — funcționează pentru filiala 2+ create ulterior)
  $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function(){
    var id = this.id;
    // Dinamic?
    var mDyn = id.match(/^CAPIa_R_[TF]_C(\d+)_FILIAL-(\d+)-\d+$/);
    if (mDyn) {
      var row = parseInt(mDyn[2],10);
      updateDynamicRow(row);
      return;
    }
    // R01 (fix)
    var mR01 = id.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-\d+$/);
    if (mR01) {
      updateR01Target(mR01[1]);
    }
  });

  // Când apar/dispar elemente relevante, refacem o scanare
  $(document).on('DOMNodeInserted DOMNodeRemoved', function(e){
    var id = (e.target && e.target.id) || '';
    if (/_FILIAL-/.test(id) || /^CAPIa_R_INDEX-\d+$/.test(id)) {
      initialSweep();
    }
  });

  $(function(){ initialSweep(); });

})(jQuery, Drupal);
