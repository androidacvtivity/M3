/* ==========================================================================
 * AUTOSUMĂ CAPIa v3.2 — fix: NU mai stilăm / NU mai facem readonly rândurile din filiale
 *  - Se aplică DOAR pe rândurile din tabelul principal (targets), niciodată pe *_FILIAL-*
 *  - Restul comportamentelor rămân: sumă live, 0 afișat, revenire la editable când nu există filiale.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6';
  var EVENTS = 'input change keyup blur';

  function isFilialId(id){ return id.indexOf('_FILIAL-') !== -1; }
  function toNum(x){ var f = parseFloat(x); return isNaN(f) ? 0 : f; }

  function makeReadOnlyLook($input) {
    if (!$input || !$input.length) return;
    // Siguranță: NU stilăm niciodată un input filial
    if (isFilialId($input.attr('id') || '')) return;
    var $cell = $input.closest('td');
    $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
    $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
    $input.prop('readonly', true);
  }
  function restoreLookAndClear($input) {
    if (!$input || !$input.length) return;
    // Siguranță: NU intervenim pe filial
    if (isFilialId($input.attr('id') || '')) return;
    var $cell = $input.closest('td');
    $input.prop('readonly', false);
    $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
    $cell.css({ 'background-color': '', 'padding': '' });
    $input.val('').trigger('change');
  }

  // Returnează lista de input-uri filial care contribuie la un target de forma:
  //  targetBaseId (fără '#') = "CAPIa_R01_T_C2" sau "CAPIa_R_T_C2-1", etc.
  function listContributors(targetBaseId) {
    var sels = [];
    var mDyn = targetBaseId.match(/^(CAPIa_R_[TF]_C\d+)-(\d+)$/); // dinamic
    if (mDyn) {
      var base = mDyn[1], row = mDyn[2], i = 1;
      while (true) {
        var id = base + '_FILIAL-' + row + '-' + i;
        if (!document.getElementById(id)) break;
        sels.push('#' + id); i++;
      }
      return sels;
    }
    // R01 fix (fără -row la final)
    var i2 = 1, base2 = targetBaseId + '_FILIAL-';
    while (true) {
      var id2 = base2 + i2;
      if (!document.getElementById(id2)) break;
      sels.push('#' + id2); i2++;
    }
    return sels;
  }

  function sumContributorsFor(targetBaseId) {
    var list = listContributors(targetBaseId);
    if (list.length === 0) return { hasAny: false, total: 0 };
    var total = 0;
    list.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) total += toNum(el.value);
    });
    return { hasAny: true, total: total };
  }

  function updateTarget(targetBaseId) {
    // Siguranță: targetul NU trebuie să fie un id filial
    if (isFilialId(targetBaseId)) return;

    var $target = $('#' + targetBaseId);
    if (!$target.length) return;

    var res = sumContributorsFor(targetBaseId);

    if (!res.hasAny) {
      // pentru acest target nu există contribuții -> revenire la editable + clear
      restoreLookAndClear($target);
      return;
    }
    // există contribuții -> readonly + stil + total (inclusiv 0)
    makeReadOnlyLook($target);
    $target.val(res.total).trigger('change');
  }

  // Dintr-un id filial, derivăm targetul principal (fără '#')
  function filialIdToTargetBaseId(filialId) {
    var mDyn = filialId.match(/^(CAPIa_R_[TF]_C\d+)_FILIAL-(\d+)-(\d+)$/);
    if (mDyn) return mDyn[1] + '-' + mDyn[2];
    var mR01 = filialId.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-(\d+)$/);
    if (mR01) return mR01[1];
    return null;
  }

  function initialSweep() {
    // R01 (fix): actualizează DOAR targetele (fără _FILIAL)
    [
      'CAPIa_R01_T_C2','CAPIa_R01_T_C4','CAPIa_R01_T_C5','CAPIa_R01_T_C6','CAPIa_R01_T_C7','CAPIa_R01_T_C8','CAPIa_R01_T_C9','CAPIa_R01_T_C10',
      'CAPIa_R01_F_C2','CAPIa_R01_F_C3','CAPIa_R01_F_C7','CAPIa_R01_F_C8'
    ].forEach(function(id){
      if (document.getElementById(id)) updateTarget(id);
    });

    // Dinamic (T & F): doar targete (id care se termină cu -<row>) și NU conțin _FILIAL
    document.querySelectorAll('[id^="CAPIa_R_T_C"],[id^="CAPIa_R_F_C"]').forEach(function(el){
      if (!isFilialId(el.id) && /-\d+$/.test(el.id)) {
        updateTarget(el.id);
      }
    });
  }

  // Delegăm pe document: când se schimbă o filială, recalculează DOAR targetul aferent
  $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function () {
    var id = this.id;
    var targetBase = filialIdToTargetBaseId(id);
    if (!targetBase) return;
    updateTarget(targetBase);
  });

  // Când apar/dispar noduri relevante, refacem o scanare
  $(document).on('DOMNodeInserted DOMNodeRemoved', function(e){
    var t = e.target && e.target.id ? e.target.id : '';
    if (/_FILIAL-/.test(t) || /^CAPIa_R01_[TF]_C\d+(_FILIAL-\d+)?$/.test(t) || /^CAPIa_R_[TF]_C\d+-\d+$/.test(t)) {
      initialSweep();
    }
  });

  $(function(){ initialSweep(); });

})(jQuery, Drupal);
