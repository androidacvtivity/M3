/* ==========================================================================
 * AUTOSUMĂ CAPIa v3.9 — lock imediat + revert corect
 *  - Când apare o filială pentru un rând dinamic (există CAPIa_R_INDEX_FILIAL-<row>-1),
 *    TOATE câmpurile țintă de pe rândul <row> din tabelul principal devin readonly + cafeniu
 *    și se autocalculează (inclusiv 0).
 *  - Când se șterge ultima filială pentru <row>, țintele redevin editable și se golesc.
 *  - Dacă nu mai există nicio filială în pagină, toate țintele revin la starea inițială.
 *  - Suma pentru dinamice se face ACROS tuturor parentIndex: 
 *      Σ CAPIa_R_[T|F]_C<col>_FILIAL-*-<row>
 *  - R01 (fix) păstrat: CAPIa_R01_*_C<col> = Σ CAPIa_R01_*_C<col>_FILIAL-*
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6';
  var EVENTS = 'input change keyup blur';

  var COLS_T = [2,4,5,6,7,8,9,10];
  var COLS_F = [2,3,7,8];

  var R01_TARGETS = [
    'CAPIa_R01_T_C2','CAPIa_R01_T_C4','CAPIa_R01_T_C5','CAPIa_R01_T_C6','CAPIa_R01_T_C7','CAPIa_R01_T_C8','CAPIa_R01_T_C9','CAPIa_R01_T_C10',
    'CAPIa_R01_F_C2','CAPIa_R01_F_C3','CAPIa_R01_F_C7','CAPIa_R01_F_C8'
  ];

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

  // ----- Helpers globale -----
  function anyFilialExists() {
    return document.querySelector('[id*="_FILIAL-"]') !== null;
  }

  function getDynamicRows() {
    return Array.prototype.map.call(
      document.querySelectorAll('input[id^="CAPIa_R_INDEX-"]'),
      function(el){ var m = el.id.match(/^CAPIa_R_INDEX-(\d+)$/); return m ? parseInt(m[1],10) : null; }
    ).filter(function(x){ return x !== null; }).sort(function(a,b){ return a-b; });
  }

  function hasFilialForRow(row) {
    // dacă există oricare index de filial pe rândul <row>
    return document.getElementById('CAPIa_R_INDEX_FILIAL-' + row + '-1') !== null
        || !!document.querySelector('[id^="CAPIa_R_T_C"][id*="_FILIAL-' + row + '-"]')
        || !!document.querySelector('[id^="CAPIa_R_F_C"][id*="_FILIAL-' + row + '-"]');
  }

  function sumDyn(baseNoRow, row) {
    // Σ pe toate parentIndex: filtrăm după al doilea indice (rowIndex)
    var nodes = Array.prototype.filter.call(
      document.querySelectorAll('[id^="'+baseNoRow+'_FILIAL-"]'),
      function(el){
        var mm = el.id.match(/^[^-]+_FILIAL-(\d+)-(\d+)$/);
        return mm && mm[2] === String(row);
      }
    );
    var total = 0, found = nodes.length > 0;
    if (found) nodes.forEach(function(el){ total += toNum(el.value); });
    return {found: found, total: total};
  }

  function updateDynamicRow(row) {
    // Total (T)
    COLS_T.forEach(function(c){
      var targetId = 'CAPIa_R_T_C' + c + '-' + row;
      var $t = $('#' + targetId);
      if (!$t.length) return;

      if (!hasFilialForRow(row)) { restoreLookAndClear($t); return; }

      var res = sumDyn('CAPIa_R_T_C' + c, row);
      makeReadOnlyLook($t);
      $t.val(res.total).trigger('change'); // afișăm 0 dacă e cazul
    });
    // Femei (F)
    COLS_F.forEach(function(c){
      var targetId = 'CAPIa_R_F_C' + c + '-' + row;
      var $t = $('#' + targetId);
      if (!$t.length) return;

      if (!hasFilialForRow(row)) { restoreLookAndClear($t); return; }

      var res = sumDyn('CAPIa_R_F_C' + c, row);
      makeReadOnlyLook($t);
      $t.val(res.total).trigger('change');
    });
  }

  function updateAllDynamicRows() {
    var rows = getDynamicRows();
    if (!anyFilialExists()) {
      // fără filiale deloc: revenire completă
      rows.forEach(function(r){
        COLS_T.forEach(function(c){ restoreLookAndClear($('#CAPIa_R_T_C' + c + '-' + r)); });
        COLS_F.forEach(function(c){ restoreLookAndClear($('#CAPIa_R_F_C' + c + '-' + r)); });
      });
      return;
    }
    rows.forEach(updateDynamicRow);
  }

  // R01
  function recalcR01Base(base) {
    var $target = $('#'+base);
    if (!$target.length) return;
    var nodes = document.querySelectorAll('[id^="'+base+'_FILIAL-"]');
    if (!anyFilialExists() || !nodes || nodes.length === 0) {
      restoreLookAndClear($target);
      return;
    }
    var total = 0; nodes.forEach(function(el){ total += toNum(el.value); });
    makeReadOnlyLook($target);
    $target.val(total).trigger('change');
  }
  function updateAllR01() {
    if (!anyFilialExists()) {
      R01_TARGETS.forEach(function(b){ restoreLookAndClear($('#'+b)); });
      return;
    }
    R01_TARGETS.forEach(recalcR01Base);
  }

  // ----- Sweep complet -----
  function fullSweep() {
    updateAllDynamicRows();
    updateAllR01();
  }

  // Evenimente: orice input în filiale ⇒ recalc ținta aferentă + rândul
  $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function(){
    var id = this.id;
    // Dinamic: recalc rândul indicat de al doilea indice
    var mDyn = id.match(/^CAPIa_R_[TF]_C\d+_FILIAL-(\d+)-(\d+)$/);
    if (mDyn) { updateDynamicRow(parseInt(mDyn[2],10)); }
    // R01
    var mR01 = id.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-\d+$/);
    if (mR01) { recalcR01Base(mR01[1]); }
  });

  // MutationObserver: când apar/dispar filiale sau rânduri ⇒ sweep complet
  try {
    var mo = new MutationObserver(function(muts){ fullSweep(); });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch(e) {
    $(document).on('DOMNodeInserted DOMNodeRemoved', function(){ fullSweep(); });
  }

  // Start
  $(function(){ fullSweep(); });

})(jQuery, Drupal);
