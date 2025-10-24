/* ==========================================================================
 * AUTOSUMĂ CAPIa v3.8 — dinamic: însumează pe rând (rowIndex) ACROS tuturor parentIndex
 *  Context: id-urile dinamice de filiale sunt CAPIa_R_[T|F]_C<col>_FILIAL-<parentIndex>-<rowIndex>
 *  Cerință: targetul din tabelul principal este pe <rowIndex>, deci suma trebuie să includă
 *           TOATE filiale (indiferent de <parentIndex>) pentru acel <rowIndex>.
 *  Exemplu: pentru target #CAPIa_R_T_C2-2 trebuie să însumăm toate:
 *           CAPIa_R_T_C2_FILIAL-1-2, CAPIa_R_T_C2_FILIAL-2-2, CAPIa_R_T_C2_FILIAL-3-2, ...
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6';
  var EVENTS = 'input change keyup blur';

  function isFilialId(id){ return /_FILIAL-/.test(id || ''); }
  function toNum(x){ var f = parseFloat((''+x).replace(',', '.')); return isNaN(f) ? 0 : f; }

  function makeReadOnlyLook($input) {
    if (!$input || !$input.length) return;
    if (isFilialId($input.attr('id'))) return; // nu stilăm filiale
    var $cell = $input.closest('td');
    $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
    $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
    $input.prop('readonly', true);
  }
  function restoreLookAndClear($input) {
    if (!$input || !$input.length) return;
    if (isFilialId($input.attr('id'))) return; // nu atingem filiale
    var $cell = $input.closest('td');
    $input.prop('readonly', false);
    $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
    $cell.css({ 'background-color': '', 'padding': '' });
    $input.val('').trigger('change');
  }

  // ---------- Dinamic: recalc corect pe rowIndex ACROS tuturor parentIndex ----------
  // Ex.: id filial: CAPIa_R_T_C2_FILIAL-2-1  => base="CAPIa_R_T_C2", row=1, target="#CAPIa_R_T_C2-1"
  function recalcFromFilialId(filialId) {
    var m = filialId.match(/^(CAPIa_R_[TF]_C\d+)_FILIAL-(\d+)-(\d+)$/);
    if (!m) return;
    var base = m[1], row = m[3]; // <== rowIndex = al doilea număr după FILIAL
    var targetId = base + '-' + row;
    var $target = $('#' + targetId);
    if (!$target.length) return;

    // colectăm toate contribuțiile pentru acest base & row, indiferent de parentIndex
    var nodes = Array.prototype.filter.call(
      document.querySelectorAll('[id^="'+base+'_FILIAL-"]'),
      function(el){
        var mm = el.id.match(/^[^-]+_FILIAL-(\d+)-(\d+)$/);
        return mm && mm[2] === row; // rowIndex trebuie să coincidă
      }
    );
    if (!nodes || nodes.length === 0) { restoreLookAndClear($target); return; }

    var total = 0;
    nodes.forEach(function(el){ total += toNum(el.value); });
    makeReadOnlyLook($target);
    $target.val(total).trigger('change');
  }

  // ---------- R01 (fix) rămâne ca înainte ----------
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

  // Sweep inițial: pentru toate filiale, recalc targeturile aferente
  function initialSweep() {
    // Dinamic
    document.querySelectorAll('input[id^="CAPIa_R_T_C"][id*="_FILIAL-"],input[id^="CAPIa_R_F_C"][id*="_FILIAL-"]').forEach(function(el){
      recalcFromFilialId(el.id);
    });
    // R01
    R01_TARGETS.forEach(recalcR01Base);
  }

  // Delegat: orice input în filiale ⇒ recalc doar ținta aferentă
  $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function(){
    var id = this.id;
    if (/^CAPIa_R_[TF]_C\d+_FILIAL-\d+-\d+$/.test(id)) { recalcFromFilialId(id); return; }
    var mR01 = id.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-\d+$/);
    if (mR01) { recalcR01Base(mR01[1]); }
  });

  // La inserări/ștergeri relevante ⇒ sweep scurt
  try {
    var mo = new MutationObserver(function(){ initialSweep(); });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch(e) {
    $(document).on('DOMNodeInserted DOMNodeRemoved', function(){ initialSweep(); });
  }

  $(function(){ initialSweep(); });

})(jQuery, Drupal);
