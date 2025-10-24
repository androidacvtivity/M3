/* ==========================================================================
 * AUTOSUMĂ CAPIa v3.1 (cu index-uri de rând) — robust pentru rânduri dinamice & filiale
 *  - Folosește index-urile de rând:
 *      Principal: CAPIa_R_INDEX-<row>
 *      Filiale:   CAPIa_R_INDEX_FILIAL-<row>-<k>
 *  - Pentru fiecare rând dinamic <row>, dacă există cel puțin un index filial
 *      CAPIa_R_INDEX_FILIAL-<row>-1, atunci coloanele de pe rândul principal devin
 *      sumă automată a valorilor din filiale (…_FILIAL-<row>-<k>), readonly + cafeniu.
 *  - Dacă nu mai există filiale pentru <row>, câmpurile revin editable și se golesc.
 *  - Delegare pe DOM pentru orice input de tip *_FILIAL-*, precum și monitorizare a
 *      apariției/ștergerii de rânduri prin ID-urile de index.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6';
  var EVENTS = 'input change keyup blur';
  var COLS_T = [2,4,5,6,7,8,9,10];
  var COLS_F = [2,3,7,8];

  function toNum(x){ var f = parseFloat(x); return isNaN(f) ? 0 : f; }
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

  // ==== Helpers pentru rânduri dinamice ====
  function getDynamicRows() {
    // colectăm toate id-urile CAPIa_R_INDEX-<row> prezente
    var rows = [];
    document.querySelectorAll('input[id^="CAPIa_R_INDEX-"]').forEach(function(el){
      var m = el.id.match(/^CAPIa_R_INDEX-(\d+)$/);
      if (m) rows.push(parseInt(m[1], 10));
    });
    rows.sort(function(a,b){ return a-b; });
    return rows;
  }
  function hasFilialForRow(row) {
    // există cel puțin un index filial pentru acest row?
    return !!document.getElementById('CAPIa_R_INDEX_FILIAL-' + row + '-1');
  }
  function listContribForDynamic(baseNoRow, row) {
    // ex: baseNoRow='CAPIa_R_T_C2' => căutăm #CAPIa_R_T_C2_FILIAL-<row>-<k>
    var sels = [], k = 1;
    while (true) {
      var id = baseNoRow + '_FILIAL-' + row + '-' + k;
      if (!document.getElementById(id)) break;
      sels.push('#' + id); k++;
    }
    return sels;
  }
  function sumContribList(list) {
    var total = 0, found = false;
    list.forEach(function(sel){
      var el = document.querySelector(sel);
      if (el) { total += toNum(el.value); found = true; }
    });
    return { found: found, total: total };
  }

  function updateDynamicRow(row) {
    // T
    COLS_T.forEach(function(c){
      var targetId = 'CAPIa_R_T_C' + c + '-' + row;
      var $t = $('#' + targetId);
      if (!$t.length) return;
      if (!hasFilialForRow(row)) { restoreLookAndClear($t); return; }
      makeReadOnlyLook($t);
      var res = sumContribList(listContribForDynamic('CAPIa_R_T_C' + c, row));
      if (!res.found) { $t.val('').trigger('change'); } else { $t.val(res.total).trigger('change'); }
    });
    // F
    COLS_F.forEach(function(c){
      var targetId = 'CAPIa_R_F_C' + c + '-' + row;
      var $t = $('#' + targetId);
      if (!$t.length) return;
      if (!hasFilialForRow(row)) { restoreLookAndClear($t); return; }
      makeReadOnlyLook($t);
      var res = sumContribList(listContribForDynamic('CAPIa_R_F_C' + c, row));
      if (!res.found) { $t.val('').trigger('change'); } else { $t.val(res.total).trigger('change'); }
    });
  }

  // ==== R01 (fix) — rămâne suportat ca în v3 ====
  var R01_TARGETS = [
    '#CAPIa_R01_T_C2','#CAPIa_R01_T_C4','#CAPIa_R01_T_C5','#CAPIa_R01_T_C6','#CAPIa_R01_T_C7','#CAPIa_R01_T_C8','#CAPIa_R01_T_C9','#CAPIa_R01_T_C10',
    '#CAPIa_R01_F_C2','#CAPIa_R01_F_C3','#CAPIa_R01_F_C7','#CAPIa_R01_F_C8'
  ];
  function listContribForR01(baseNoHash){ // ex: 'CAPIa_R01_T_C2'
    var sels = [], i = 1;
    while (true) {
      var id = baseNoHash + '_FILIAL-' + i;
      if (!document.getElementById(id)) break;
      sels.push('#' + id); i++;
    }
    return sels;
  }
  function updateR01() {
    R01_TARGETS.forEach(function(sel){
      var el = document.querySelector(sel);
      if (!el) return;
      var $t = $(el);
      // există măcar o filială global?
      var anyFilialIndex = document.querySelector('input[id^="CAPIa_R_INDEX_FILIAL-"]') !== null;
      if (!anyFilialIndex) { restoreLookAndClear($t); return; }
      makeReadOnlyLook($t);
      var res = sumContribList(listContribForR01(sel.substring(1)));
      if (!res.found) { $t.val('').trigger('change'); } else { $t.val(res.total).trigger('change'); }
    });
  }

  // ==== Delegări și inițializări ====
  function initialSweep() {
    // Dinamic: calculează pe toate rândurile existente
    getDynamicRows().forEach(updateDynamicRow);
    // R01 fix
    updateR01();
  }

  // când se modifică vreo filială (valoare) => recalculează targetul aferent
  $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function(){
    var id = this.id;
    var mDyn = id.match(/^(CAPIa_R_[TF]_C\d+)_FILIAL-(\d+)-(\d+)$/);
    if (mDyn) {
      var row = parseInt(mDyn[2], 10);
      updateDynamicRow(row);
      return;
    }
    var mR01 = id.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-(\d+)$/);
    if (mR01) { updateR01(); return; }
  });

  // când apar/dispar rânduri principale sau filiale => refacem tot
  $(document).on('DOMNodeInserted DOMNodeRemoved', function(e){
    var t = e.target && e.target.id ? e.target.id : '';
    if (/^CAPIa_R_INDEX-\d+$/.test(t) || /^CAPIa_R_INDEX_FILIAL-\d+-\d+$/.test(t) || /_FILIAL-/.test(t)) {
      initialSweep();
    }
  });

  $(function(){ initialSweep(); });

})(jQuery, Drupal);
