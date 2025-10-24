/* ==========================================================================
 * R01 + DYNAMIC PATCH: AUTOSUMĂ pentru CAPIa (R01; T & F) + rânduri dinamice
 *  - Dacă există rânduri de filiale pentru un rând principal (<row>):
 *      CAPIa_R_INDEX_FILIAL-<row>-1 există ⇒ pe rândul <row> coloanele țintă devin
 *      SUM(…_FILIAL-<row>-<k>), readonly + cafeniu.
 *  - La modificări în filiale, sumele se recalculează live.
 *  - Dacă NU mai există filiale pentru <row>, câmpurile revin editable și se golesc.
 *
 * Acoperire:
 *  - R01_T: C2, C4, C5, C6, C7, C8, C9, C10
 *  - R01_F: C2, C3, C7, C8
 *  - Dinamic T: C2, C4, C5, C6, C7, C8, C9, C10  (CAPIa_R_T_CX-<row> = Σ CAPIa_R_T_CX_FILIAL-<row>-<k>)
 *  - Dinamic F: C2, C3, C7, C8                     (CAPIa_R_F_CX-<row> = Σ CAPIa_R_F_CX_FILIAL-<row>-<k>)
 * ========================================================================== */
(function ($, Drupal) {
    'use strict';

    var BGCOLOR = '#ebe9e6'; // cafeniu deschis
    var EVENTS = 'input change keyup blur';

    // ---------------- R01 (fix) ----------------
    var TARGETS = [
        // --- TOTAL (T) — R01 ---
        { id: '#CAPIa_R01_T_C2', filialKey: 'CAPIa_R01_T_C2_FILIAL' },
        { id: '#CAPIa_R01_T_C4', filialKey: 'CAPIa_R01_T_C4_FILIAL' },
        { id: '#CAPIa_R01_T_C5', filialKey: 'CAPIa_R01_T_C5_FILIAL' },
        { id: '#CAPIa_R01_T_C6', filialKey: 'CAPIa_R01_T_C6_FILIAL' },
        { id: '#CAPIa_R01_T_C7', filialKey: 'CAPIa_R01_T_C7_FILIAL' },
        { id: '#CAPIa_R01_T_C8', filialKey: 'CAPIa_R01_T_C8_FILIAL' },
        { id: '#CAPIa_R01_T_C9', filialKey: 'CAPIa_R01_T_C9_FILIAL' },
        { id: '#CAPIa_R01_T_C10', filialKey: 'CAPIa_R01_T_C10_FILIAL' },
        // --- FEMEI (F) — R01 ---
        { id: '#CAPIa_R01_F_C2', filialKey: 'CAPIa_R01_F_C2_FILIAL' },
        { id: '#CAPIa_R01_F_C3', filialKey: 'CAPIa_R01_F_C3_FILIAL' },
        { id: '#CAPIa_R01_F_C7', filialKey: 'CAPIa_R01_F_C7_FILIAL' },
        { id: '#CAPIa_R01_F_C8', filialKey: 'CAPIa_R01_F_C8_FILIAL' }
    ];

    function listFilialInputsR01(filialKey) {
        var sels = [], i = 1;
        while (true) {
            var id = '#' + filialKey + '-' + i;
            if (!document.querySelector(id)) break;
            sels.push(id); i++;
        }
        return sels;
    }

    function toNum(x) { var f = parseFloat(x); return isNaN(f) ? 0 : f; }

    function makeReadOnlyLook(targetId) {
        var $input = $(targetId);
        if (!$input.length) return;
        var $cell = $input.closest('td');
        $cell.css({ 'background-color': BGCOLOR, 'padding': '4px' });
        $input.css({ 'background-color': 'transparent', 'border': 'none', 'text-align': 'right' });
        $input.prop('readonly', true);
    }

    function restoreLookAndClear(targetId) {
        var $input = $(targetId);
        if (!$input.length) return;
        var $cell = $input.closest('td');
        $input.prop('readonly', false);
        $input.css({ 'background-color': '', 'border': '', 'text-align': '' });
        $cell.css({ 'background-color': '', 'padding': '' });
        $input.val('').trigger('change');
    }

    function updateSumForR01(targetId, filialKey) {
        var total = 0, found = false;
        listFilialInputsR01(filialKey).forEach(function (sel) {
            var $el = $(sel);
            if ($el.length) { total += toNum($el.val()); found = true; }
        });
        if (!$(targetId).length) return;
        if (!found) { restoreLookAndClear(targetId); return; }
        makeReadOnlyLook(targetId);
        $(targetId).val(total).trigger('change'); // afișăm și 0
    }

    // ---------------- Dinamic (pe rânduri) ----------------
    var COLS_T = [2, 4, 5, 6, 7, 8, 9, 10];
    var COLS_F = [2, 3, 7, 8];

    function getDynamicRows() {
        // id: CAPIa_R_INDEX-<row>
        var rows = [];
        document.querySelectorAll('input[id^="CAPIa_R_INDEX-"]').forEach(function (el) {
            var m = el.id.match(/^CAPIa_R_INDEX-(\d+)$/);
            if (m) rows.push(parseInt(m[1], 10));
        });
        rows.sort(function (a, b) { return a - b; });
        return rows;
    }

    function hasFilialForRow(row) {
        // există cel puțin un index filial pentru acest row?
        return !!document.getElementById('CAPIa_R_INDEX_FILIAL-' + row + '-1');
    }

    function listFilialInputsDyn(baseNoRow, row) {
        // ex: baseNoRow='CAPIa_R_T_C2' ⇒ #CAPIa_R_T_C2_FILIAL-<row>-<k>
        var sels = [], k = 1;
        while (true) {
            var id = '#' + baseNoRow + '_FILIAL-' + row + '-' + k;
            if (!document.querySelector(id)) break;
            sels.push(id); k++;
        }
        return sels;
    }

    function updateDynamicRow(row) {
        // T
        COLS_T.forEach(function (c) {
            var targetSel = '#CAPIa_R_T_C' + c + '-' + row;
            var $t = $(targetSel);
            if (!$t.length) return;
            if (!hasFilialForRow(row)) { restoreLookAndClear(targetSel); return; }

            var total = 0, found = false;
            listFilialInputsDyn('CAPIa_R_T_C' + c, row).forEach(function (sel) {
                var $el = $(sel); if ($el.length) { total += toNum($el.val()); found = true; }
            });
            if (!found) { restoreLookAndClear(targetSel); return; }
            makeReadOnlyLook(targetSel);
            $(targetSel).val(total).trigger('change'); // inclusiv 0
        });

        // F
        COLS_F.forEach(function (c) {
            var targetSel = '#CAPIa_R_F_C' + c + '-' + row;
            var $t = $(targetSel);
            if (!$t.length) return;
            if (!hasFilialForRow(row)) { restoreLookAndClear(targetSel); return; }

            var total = 0, found = false;
            listFilialInputsDyn('CAPIa_R_F_C' + c, row).forEach(function (sel) {
                var $el = $(sel); if ($el.length) { total += toNum($el.val()); found = true; }
            });
            if (!found) { restoreLookAndClear(targetSel); return; }
            makeReadOnlyLook(targetSel);
            $(targetSel).val(total).trigger('change');
        });
    }

    // ---------------- Puncte de intrare ----------------
    window.watchAutoSum_CAPIa_R01_AND_DYNAMIC = function () {
        // R01 fix
        TARGETS.forEach(function (t) {
            // dezlegăm ascultători vechi
            listFilialInputsR01(t.filialKey).forEach(function (sel) { $(sel).off(EVENTS); });
            // (re)legăm
            listFilialInputsR01(t.filialKey).forEach(function (sel) {
                $(sel).on(EVENTS, function () { updateSumForR01(t.id, t.filialKey); });
            });
            updateSumForR01(t.id, t.filialKey);
        });

        // Dinamic: toate rândurile existente
        getDynamicRows().forEach(updateDynamicRow);
    };

    // Inițializare + reatașare la adăugare/ștergere rânduri filiale & dinamice
    $(function () {
        if (typeof window.watchAutoSum_CAPIa_R01_AND_DYNAMIC === 'function') {
            window.watchAutoSum_CAPIa_R01_AND_DYNAMIC();
        }

        // când se modifică o valoare pe filiale ⇒ recalculează
        $(document).on(EVENTS, 'input[id*="_FILIAL-"]', function () {
            var id = this.id;
            // dacă e dinamic: CAPIa_R_?_C?_FILIAL-<row>-<k> ⇒ updateDynamicRow(<row>)
            var mDyn = id.match(/^CAPIa_R_[TF]_C\d+_FILIAL-(\d+)-\d+$/);
            if (mDyn) { updateDynamicRow(parseInt(mDyn[1], 10)); return; }
            // dacă e R01 fix ⇒ refacem R01
            TARGETS.forEach(function (t) { updateSumForR01(t.id, t.filialKey); });
        });

        // la adăugare/ștergere rânduri principale/filiale ⇒ reatașăm & recalc.
        $('#FILIAL_CAPIa, #CAPIa, body').on('row_added row_deleted DOMNodeInserted DOMNodeRemoved', function () {
            if (typeof window.watchAutoSum_CAPIa_R01_AND_DYNAMIC === 'function') {
                window.watchAutoSum_CAPIa_R01_AND_DYNAMIC();
            }
        });
    });

})(jQuery, Drupal);
