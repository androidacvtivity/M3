/* ==========================================================================
 * AUTOSUMĂ CAPIa v3.6 — mapare directă target <- din id-ul FILIAL
 *  - Funcționează pentru T & F, orice coloană configurată, orice rând (1,2,3,...).
 *  - La eveniment pe '..._FILIAL-<row>-<k>', derivăm targetul '...-<row>' și recalc.
 *  - Suma se face cu querySelectorAll('[id^="<base>_FILIAL-<row>-"]') (robust la 2+ filiale).
 *  - Stil/readonly exclusiv pe targete (tabel principal); filiale rămân editabile.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6';
  var EVENTS = 'input change keyup blur';

  function isFilialId(id){ return id.indexOf('_FILIAL-') !== -1; }
  function toNum(x){ var f = parseFloat((''+x).replace(',', '.')); return isNaN(f) ? 0 : f; }

  function makeReadOnlyLook($input) {
    if (!$input || !$input.length) return;
    if (isFilialId($input.attr('id') || '')) return;
    var $cell = $input.closest('td');
    $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
    $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
    $input.prop('readonly', true);
  }
  function restoreLookAndClear($input) {
    if (!$input || !$input.length) return;
    if (isFilialId($input.attr('id') || '')) return;
    var $cell = $input.closest('td');
    $input.prop('readonly', false);
    $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
    $cell.css({ 'background-color': '', 'padding': '' });
    $input.val('').trigger('change');
  }

  // Derive base & row from a filial id, then compute & write sum into target
  // Ex.: CAPIa_R_T_C2_FILIAL-2-1 => base = CAPIa_R_T_C2, row = 2, target = #CAPIa_R_T_C2-2
  //      CAPIa_R_F_C2_FILIAL-1-3 => base = CAPIa_R_F_C2, row = 1, target = #CAPIa_R_F_C2-1
  function recalcFromFilialId(filialId) {
    var m = filialId.match(/^(CAPIa_R_[TF]_C\d+)_FILIAL-(\d+)-(\d+)$/);
    if (!m) return;
    var base = m[1], row = m[2];
    var targetId = base + '-' + row;
    var $target = $('#' + targetId);
    if (!$target.length) return;

    var nodes = document.querySelectorAll('[id^="'+base+'_FILIAL-'+row+'-"]');
    if (!nodes || nodes.length === 0) { restoreLookAndClear($target); return; }

    var total = 0;
    nodes.forEach(function(el){ total += toNum(el.value); });
    makeReadOnlyLook($target);
    $target.val(total).trigger('change');
  }

  // R01 (fix) — rămâne suportat
  var R01_TARGETS = [
    'CAPIa_R01_T_C2','CAPIa_R01_T_C4','CAPIa_R01_T_C5','CAPIa_R01_T_C6','CAPIa_R01_T_C7','CAPIa_R01_T_C8','CAPIa_R01_T_C9','CAPIa_R01_T_C10',
    'CAPIa_R01_F_C2','CAPIa_R01_F_C3','CAPIa_R01_F_C7','CAPIa_R01_F_C8'
  ];
  function recalcR01Base(base) {
    var $target = $('#'+base);
    if (!$target.length) return;
    var nodes = document.querySelectorAll('[id^="'+base+'_FILIAL-"]');
    if (!nodes || nodes.length === 0) { restoreLookAndClear($target); return; }
    var total = 0; nodes.forEach(function(el){ total += toNum(el.value); });
    makeReadOnlyLook($target);
    $target.val(total).trigger('change');
  }

  // Evenimente (delegat) — calculează direct din id-ul FILIAL
  $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function(){
    var id = this.id;
    // Dinamic?
    if (/^CAPIa_R_[TF]_C\d+_FILIAL-\d+-\d+$/.test(id)) {
      recalcFromFilialId(id);
      return;
    }
    // R01 fix
    var mR01 = id.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-\d+$/);
    if (mR01) { recalcR01Base(mR01[1]); }
  });

  // Sweep inițial: pentru toate filiale existente, calculează targetul aferent
  function initialSweep() {
    // Dinamic
    document.querySelectorAll('input[id^="CAPIa_R_T_C"][id*="_FILIAL-"],input[id^="CAPIa_R_F_C"][id*="_FILIAL-"]').forEach(function(el){
      recalcFromFilialId(el.id);
    });
    // R01 fix
    R01_TARGETS.forEach(recalcR01Base);
  }

  // La inserări/ștergeri de noduri relevante, refacem un sweep scurt
  $(document).on('DOMNodeInserted DOMNodeRemoved', function(e){
    var id = (e.target && e.target.id) || '';
    if (/_FILIAL-/.test(id)) { initialSweep(); }
  });

  $(function(){ initialSweep(); });

})(jQuery, Drupal);
