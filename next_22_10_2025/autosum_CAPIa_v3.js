/* ==========================================================================
 * AUTOSUMĂ CAPIa v3 (robust, delegat pe DOM)
 *  - Rezolvă cazul când se colorează, dar NU calculează/afișează.
 *  - Ascultă orice input cu id care conține `_FILIAL-<row>-<k>` (delegat pe document),
 *    deci funcționează și pentru rânduri dinamice create ulterior.
 *  - Calculează ținta prin înlocuirea `_FILIAL-<row>-<k>` cu `-<row>` pe baza id-ului.
 *  - Afișează 0 când suma e 0; dacă NU există niciun input filial pentru acel target => golește ținta.
 *  - Păstrează readonly + stil cafeniu atâta timp cât există cel puțin o filială pe pagină.
 * ========================================================================== */
(function ($, Drupal) {
  'use strict';

  var BGCOLOR = '#ebe9e6';
  var EVENTS = 'input change keyup blur';

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
  function filialExistsAny() {
    return document.querySelector('[id*="_FILIAL-"]') !== null;
  }

  // Returnează lista de input-uri filial care contribuie la un target de forma:
  //  targetBaseId (fără '#') = "CAPIa_R01_T_C2" sau "CAPIa_R_T_C2-1", etc.
  function listContributors(targetBaseId) {
    // pattern-uri posibile pentru FILIAL:
    //  1) R01 fix:   <base>_FILIAL-<k>        ex: CAPIa_R01_T_C2_FILIAL-1
    //  2) Dinamic:   <base>_FILIAL-<row>-<k>  ex: CAPIa_R_T_C2_FILIAL-3-1
    var sels = [];
    var mDyn = targetBaseId.match(/^(CAPIa_R_[TF]_C\d+)-(\d+)$/); // dinamic
    if (mDyn) {
      var base = mDyn[1]; var row = mDyn[2];
      var i = 1; while (true) {
        var id = base + '_FILIAL-' + row + '-' + i;
        if (!document.getElementById(id)) break;
        sels.push('#' + id); i++;
      }
      return sels;
    }
    // R01 fix (fără -row la final)
    var i2 = 1;
    var base2 = targetBaseId + '_FILIAL-';
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

  function ensureReadonlySkin(targetId) {
    var $t = $(targetId);
    if ($t.length) makeReadOnlyLook($t);
  }

  function updateTarget(targetBaseId) {
    var hasFilial = filialExistsAny();
    var $target = $('#' + targetBaseId);
    if (!$target.length) return;

    if (!hasFilial) { // fără filiale globale -> revenire
      restoreLookAndClear($target);
      return;
    }
    // există filiale undeva pe pagină -> readonly + stil
    makeReadOnlyLook($target);

    var res = sumContributorsFor(targetBaseId);
    if (!res.hasAny) {
      // pentru acest target nu există contribuții -> golim
      $target.val('').trigger('change');
      return;
    }
    // afișează total (inclusiv 0)
    $target.val(res.total).trigger('change');
  }

  // În baza unui ID de contributor FILIAL, determină target-ul (fără '#')
  //  ex: "CAPIa_R_T_C2_FILIAL-1-3" -> "CAPIa_R_T_C2-1"
  //      "CAPIa_R01_T_C2_FILIAL-3" -> "CAPIa_R01_T_C2"
  function filialIdToTargetBaseId(filialId) {
    var mDyn = filialId.match(/^(CAPIa_R_[TF]_C\d+)_FILIAL-(\d+)-(\d+)$/);
    if (mDyn) return mDyn[1] + '-' + mDyn[2];
    var mR01 = filialId.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-(\d+)$/);
    if (mR01) return mR01[1];
    return null;
  }

  function initialSweep() {
    // R01 T
    ['#CAPIa_R01_T_C2','#CAPIa_R01_T_C4','#CAPIa_R01_T_C5','#CAPIa_R01_T_C6','#CAPIa_R01_T_C7','#CAPIa_R01_T_C8','#CAPIa_R01_T_C9','#CAPIa_R01_T_C10',
     '#CAPIa_R01_F_C2','#CAPIa_R01_F_C3','#CAPIa_R01_F_C7','#CAPIa_R01_F_C8'
    ].forEach(function(sel){ if (document.querySelector(sel)) updateTarget(sel.substring(1)); });

    // Dinamice: detectăm din DOM toate țintele posibile prezente la momentul inițial
    document.querySelectorAll('[id^="CAPIa_R_T_C"],[id^="CAPIa_R_F_C"]').forEach(function(el){
      // țintă dacă id-ul se termină în -<row>
      if (/-\d+$/.test(el.id)) updateTarget(el.id);
    });
  }

  // Delegăm pe document toate evenimentele din *_FILIAL-*
  $(document).on(EVENTS, '[id*="_FILIAL-"]', function () {
    var id = this.id;
    var targetBase = filialIdToTargetBaseId(id);
    if (!targetBase) return;
    updateTarget(targetBase);
  });

  // Când se adaugă/șterg rânduri: re-scan + re-calc
  $(function(){
    initialSweep();
    $('#FILIAL_CAPIa, #CAPIa, body').on('row_added row_deleted DOMNodeInserted DOMNodeRemoved', function(){
      initialSweep();
    });
  });

})(jQuery, Drupal);
