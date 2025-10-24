/* ==========================================================================
 * AUTOSUMĂ CAPIa v3.7 — fix complet pentru rânduri dinamice 2,3,...
 *  - Mapare directă din id-ul filialei:
 *      CAPIa_R_[T|F]_C<col>_FILIAL-<row>-<k>  ⇒  target: #CAPIa_R_[T|F]_C<col>-<row>
 *  - Suma se face cu querySelectorAll('[id^="<base>_FILIAL-<row>-"]') — prinde 2,3,...
 *  - Delegare pe document pentru toate *_FILIAL-* (input/change/keyup/blur).
 *  - MutationObserver: la adăugare/ștergere de filiale/rânduri ⇒ recalc automat.
 *  - Stil/readonly doar pe targetele din tabelul principal; filiale rămân editabile.
 *  - R01 (fix) rămâne suportat: CAPIa_R01_[T|F]_C<col> = Σ CAPIa_R01_[T|F]_C<col>_FILIAL-*
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

  // ---------- Dinamic: recalc direct din id-ul filialei ----------
  // ex: id = "CAPIa_R_T_C2_FILIAL-2-1"  => base="CAPIa_R_T_C2", row="2", target="#CAPIa_R_T_C2-2"
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

  // ---------- R01 (fix) ----------
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

  // ---------- Sweep inițial ----------
  function initialSweep() {
    // Dinamic: orice filial existent
    document.querySelectorAll('input[id^="CAPIa_R_T_C"][id*="_FILIAL-"],input[id^="CAPIa_R_F_C"][id*="_FILIAL-"]').forEach(function(el){
      recalcFromFilialId(el.id);
    });
    // R01: bazele cunoscute
    R01_TARGETS.forEach(recalcR01Base);
  }

  // ---------- Delegare evenimente ----------
  $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function(){
    var id = this.id;
    if (/^CAPIa_R_[TF]_C\d+_FILIAL-\d+-\d+$/.test(id)) { recalcFromFilialId(id); return; }
    var mR01 = id.match(/^(CAPIa_R01_[TF]_C\d+)_FILIAL-\d+$/);
    if (mR01) { recalcR01Base(mR01[1]); }
  });

  // ---------- MutationObserver pentru adăugări/ștergeri ----------
  try {
    var mo = new MutationObserver(function(muts){
      var needSweep = false;
      for (var i=0;i<muts.length;i++){
        var nds = [].slice.call(muts[i].addedNodes || [])
                    .concat([].slice.call(muts[i].removedNodes || []));
        for (var j=0;j<nds.length;j++){
          var nd = nds[j];
          if (nd && nd.nodeType === 1) {
            var id = nd.id || '';
            if (/_FILIAL-/.test(id) || /^CAPIa_R_INDEX-\d+$/.test(id)) { needSweep = true; break; }
            // dacă nodul conține inputs relevante în interior
            if (nd.querySelector && (nd.querySelector('[id*="_FILIAL-"]') || nd.querySelector('[id^="CAPIa_R_INDEX-"]'))) {
              needSweep = true; break;
            }
          }
        }
        if (needSweep) break;
      }
      if (needSweep) initialSweep();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch(e) {
    // fallback: evenimente DOM vechi
    $(document).on('DOMNodeInserted DOMNodeRemoved', function(e){
      var id = (e.target && e.target.id) || '';
      if (/_FILIAL-/.test(id) || /^CAPIa_R_INDEX-\d+$/.test(id)) { initialSweep(); }
    });
  }

  // start
  $(function(){ initialSweep(); });

})(jQuery, Drupal);
