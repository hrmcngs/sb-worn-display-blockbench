/**
 * Custom Display Reference Editor Plugin for Blockbench
 *
 * Display パネルの Slot 行に直接カスタムキーのタブを追加し、
 * 標準スロット (head 等) と同じ感覚で 3D 視覚編集できるようにする。
 *
 * 追加されるカスタム display key:
 *   - sophisticatedbackpacks:worn       (SB の Curios back 装備時)
 *   - the_four_primitives_and_weapons:back  (MAW saya の Curios back 装備時)
 *   - the_four_primitives_and_weapons:belt  (MAW saya の Curios belt 装備時)
 *
 * 仕組み (DOM 注入ハック):
 *   Blockbench 本体の DisplayModePanel.vue は slot 行を v-for ではなく
 *   ベタ書きしているので公式 API では拡張できない。よって
 *     1. displayReferenceObjects.slots (= DisplayMode.slots) に key を push
 *        → JSON の保存/読込に必須
 *     2. MutationObserver で #display_bar が現れる/書き換わるたびに
 *        <input type="radio">/<label> を注入
 *     3. ラベル click 時は DisplayMode.loadHead() を実行してカメラと
 *        Reference Model バーをセットアップしてから slot を上書き
 *
 * 注意:
 *   - Blockbench 本体の更新で内部構造が変わると壊れる可能性あり
 *   - Tools メニューの Edit ダイアログは数値直接入力用に残してある
 *
 * Author: Backpack Arsenal mod project
 * Compatible with Blockbench 4.x (desktop / web)
 */
(function () {
    const PLUGIN_ID = 'sb_worn_display';

    const TARGETS = [
        {
            key: 'sophisticatedbackpacks:worn',
            label: 'SB Worn',
            tooltip: 'SB Worn (背中・SB)',
            icon: 'backpack',
        },
        {
            key: 'the_four_primitives_and_weapons:back',
            label: 'MAW Back',
            tooltip: 'MAW Saya Back (背中・MAW鞘)',
            icon: 'arrow_upward',
        },
        {
            key: 'the_four_primitives_and_weapons:belt',
            label: 'MAW Belt',
            tooltip: 'MAW Saya Belt (ベルト・MAW鞘)',
            icon: 'linear_scale',
        },
    ];

    const SLOT_BAR_ID = 'display_bar';
    const INJECTED_ATTR = 'data-sb-custom-slot';

    const actions = [];
    let observer = null;
    let modeListener = null;

    function safeId(key) {
        return 'sbcd_' + key.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    function getProject() {
        return (typeof Project !== 'undefined') ? Project : null;
    }

    // ─── custom slot loader ────────────────────────────────────────────
    // DisplayMode.loadHead() を踏み台にカメラ/Reference バーを設定し
    // その後 slot をカスタムキーに差し替える。
    function loadCustomSlot(target) {
        const p = getProject();
        if (!p) {
            Blockbench.showQuickMessage('モデルを開いてください', 1500);
            return;
        }
        if (typeof DisplayMode === 'undefined' || !DisplayMode.loadHead) {
            Blockbench.showQuickMessage('DisplayMode が利用できません', 1500);
            return;
        }

        if (!p.display_settings) p.display_settings = {};
        if (!p.display_settings[target.key]) {
            p.display_settings[target.key] = new DisplaySlot(target.key);
        }

        try {
            DisplayMode.loadHead();
        } catch (e) {
            console.warn('[' + PLUGIN_ID + '] loadHead failed', e);
        }

        DisplayMode.display_slot = target.key;
        DisplayMode.slot = p.display_settings[target.key];
        if (DisplayMode.vue && DisplayMode.vue._data) {
            DisplayMode.vue._data.slot = p.display_settings[target.key];
        }

        try { DisplayMode.updateDisplayBase(); } catch (e) { }
        try { if (DisplayMode.vue && DisplayMode.vue.$forceUpdate) DisplayMode.vue.$forceUpdate(); } catch (e) { }

        const radio = document.getElementById(safeId(target.key));
        if (radio) radio.checked = true;
    }

    // ─── DOM injection ─────────────────────────────────────────────────

    function buildSlotElements(target) {
        const id = safeId(target.key);
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'display';
        input.id = id;
        input.className = 'hidden';
        input.setAttribute(INJECTED_ATTR, target.key);

        const label = document.createElement('label');
        label.className = 'tool';
        label.htmlFor = id;
        label.setAttribute(INJECTED_ATTR, target.key);

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = target.tooltip;
        label.appendChild(tooltip);

        const icon = document.createElement('i');
        icon.className = 'material-icons';
        icon.textContent = target.icon;
        label.appendChild(icon);

        label.addEventListener('click', () => loadCustomSlot(target));

        return { input, label };
    }

    function injectSlots() {
        const bar = document.getElementById(SLOT_BAR_ID);
        if (!bar) return;
        TARGETS.forEach((target) => {
            const id = safeId(target.key);
            if (document.getElementById(id)) return;
            const { input, label } = buildSlotElements(target);
            bar.appendChild(input);
            bar.appendChild(label);
        });
        // 現在の display_slot がカスタムキーなら radio を checked に
        try {
            if (typeof DisplayMode !== 'undefined' && DisplayMode.display_slot) {
                const radio = document.getElementById(safeId(DisplayMode.display_slot));
                if (radio) radio.checked = true;
            }
        } catch (e) { }
    }

    function removeInjectedSlots() {
        document.querySelectorAll('[' + INJECTED_ATTR + ']').forEach((el) => el.remove());
    }

    function setupObserver() {
        if (observer) return;
        observer = new MutationObserver(() => {
            const bar = document.getElementById(SLOT_BAR_ID);
            if (!bar) return;
            const need = TARGETS.some((t) => !document.getElementById(safeId(t.key)));
            if (need) injectSlots();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function teardownObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // ─── Edit dialog (Tools menu fallback for typing exact values) ─────

    function getSlotValues(key) {
        const p = getProject();
        const def = { rotation: [0, 0, 0], translation: [0, 0, 0], scale: [1, 1, 1] };
        if (!p || !p.display_settings) return def;
        const s = p.display_settings[key];
        if (!s) return def;
        return {
            rotation: (s.rotation || [0, 0, 0]).slice(),
            translation: (s.translation || [0, 0, 0]).slice(),
            scale: (s.scale || [1, 1, 1]).slice(),
        };
    }

    function setSlotValues(key, v) {
        const p = getProject();
        if (!p) {
            Blockbench.showQuickMessage('モデルを開いてください', 1500);
            return false;
        }
        if (!p.display_settings) p.display_settings = {};
        if (!p.display_settings[key]) p.display_settings[key] = new DisplaySlot(key);
        const slot = p.display_settings[key];
        slot.rotation = v.rotation.slice();
        slot.translation = v.translation.slice();
        slot.scale = v.scale.slice();
        if (p.saved !== undefined) p.saved = false;
        try { DisplayMode.updateDisplayBase(); } catch (e) { }
        return true;
    }

    function openEditDialog(target) {
        const cur = getSlotValues(target.key);
        const dlg = new Dialog({
            id: 'edit_' + safeId(target.key),
            title: 'Edit: ' + target.tooltip,
            width: 480,
            form: {
                _info: { type: 'info', text: target.tooltip + '\n\n' + target.key },
                _div1: '_',
                rotX: { label: 'Rotation X', type: 'number', value: cur.rotation[0], step: 1 },
                rotY: { label: 'Rotation Y', type: 'number', value: cur.rotation[1], step: 1 },
                rotZ: { label: 'Rotation Z', type: 'number', value: cur.rotation[2], step: 1 },
                _div2: '_',
                transX: { label: 'Translation X', type: 'number', value: cur.translation[0], step: 0.1 },
                transY: { label: 'Translation Y', type: 'number', value: cur.translation[1], step: 0.1 },
                transZ: { label: 'Translation Z', type: 'number', value: cur.translation[2], step: 0.1 },
                _div3: '_',
                scaleX: { label: 'Scale X', type: 'number', value: cur.scale[0], step: 0.05 },
                scaleY: { label: 'Scale Y', type: 'number', value: cur.scale[1], step: 0.05 },
                scaleZ: { label: 'Scale Z', type: 'number', value: cur.scale[2], step: 0.05 },
            },
            buttons: ['dialog.confirm', 'dialog.cancel'],
            onConfirm(result) {
                setSlotValues(target.key, {
                    rotation: [result.rotX, result.rotY, result.rotZ],
                    translation: [result.transX, result.transY, result.transZ],
                    scale: [result.scaleX, result.scaleY, result.scaleZ],
                });
                Blockbench.showQuickMessage(target.label + ' を更新しました (Ctrl+S で保存)', 2000);
                dlg.hide();
            },
        });
        dlg.show();
    }

    // ─── DisplayMode.slots registration ────────────────────────────────
    // 保存/読込時に DisplayMode.slots に含まれる key だけが処理されるので
    // ここで push しておかないと開き直したとき値が消える。

    function registerSlotsInDisplayMode() {
        if (typeof DisplayMode === 'undefined' || !Array.isArray(DisplayMode.slots)) return;
        TARGETS.forEach((t) => {
            if (!DisplayMode.slots.includes(t.key)) DisplayMode.slots.push(t.key);
        });
    }

    function unregisterSlotsFromDisplayMode() {
        if (typeof DisplayMode === 'undefined' || !Array.isArray(DisplayMode.slots)) return;
        TARGETS.forEach((t) => {
            const i = DisplayMode.slots.indexOf(t.key);
            if (i >= 0) DisplayMode.slots.splice(i, 1);
        });
    }

    // ─── plugin registration ───────────────────────────────────────────

    Plugin.register(PLUGIN_ID, {
        title: 'SB Worn Display Editor',
        author: 'hrmcngs',
        icon: 'backpack',
        description: 'Display パネルの Slot 行にカスタムキー (SB worn / MAW back / MAW belt) ' +
            'のタブを直接追加し、標準スロットと同じ感覚で 3D 視覚編集できるようにします。',
        about:
            'Display パネルの Slot 行に 3 個のカスタムタブを追加します:\n' +
            '  - SB Worn   (sophisticatedbackpacks:worn)\n' +
            '  - MAW Back  (the_four_primitives_and_weapons:back)\n' +
            '  - MAW Belt  (the_four_primitives_and_weapons:belt)\n\n' +
            'クリックすると標準スロットと同じく 3D ビューで編集できます。\n' +
            'Tools メニューには数値直接入力用の Edit ダイアログも追加されます。\n\n' +
            '## インストール (auto-update)\n' +
            'File → Plugins → "Load Plugin from URL" に以下を貼ると以降\n' +
            'バージョン更新を自動で取得します:\n' +
            '  https://raw.githubusercontent.com/hrmcngs/sb-worn-display-blockbench/main/sb_worn_display.js\n\n' +
            '## ソース / 変更履歴\n' +
            '  https://github.com/hrmcngs/sb-worn-display-blockbench\n' +
            '  https://github.com/hrmcngs/sb-worn-display-blockbench/blob/main/CHANGELOG.md\n\n' +
            '注意: Blockbench 本体の DOM に介入する実装のため、本体更新で\n' +
            '壊れる可能性があります。その場合 Tools メニューの Edit ダイアログ\n' +
            'を fallback として使ってください。',
        version: '4.0.0',
        variant: 'both',
        min_version: '4.0.0',
        website: 'https://github.com/hrmcngs/sb-worn-display-blockbench',
        repository: 'https://github.com/hrmcngs/sb-worn-display-blockbench',
        bug_tracker: 'https://github.com/hrmcngs/sb-worn-display-blockbench/issues',
        tags: ['Minecraft: Java Edition', 'Modeling'],

        onload() {
            registerSlotsInDisplayMode();

            // Tools メニューに Edit ダイアログだけ追加 (Load/Save head ワークフローは廃止)
            TARGETS.forEach((target, idx) => {
                const aEdit = new Action('custom_disp_edit_' + safeId(target.key), {
                    name: '[' + (idx + 1) + '] Edit (numbers): ' + target.tooltip,
                    description: 'ダイアログで ' + target.key + ' を数値編集',
                    icon: 'tune',
                    category: 'edit',
                    click() { openEditDialog(target); },
                });
                try { MenuBar.addAction(aEdit, 'tools'); } catch (e) { }
                actions.push(aEdit);
            });

            setupObserver();
            // 既に display モードに居る場合の初回注入
            injectSlots();

            // モード切替時にも明示的に注入を試みる (Observer の保険)
            try {
                modeListener = () => setTimeout(injectSlots, 50);
                Blockbench.on('select_mode', modeListener);
                Blockbench.on('select_project', modeListener);
            } catch (e) { }

            console.log('[' + PLUGIN_ID + '] v4.0 loaded — '
                + TARGETS.length + ' custom slot tabs registered');
        },

        onunload() {
            teardownObserver();
            removeInjectedSlots();
            unregisterSlotsFromDisplayMode();
            try {
                if (modeListener) {
                    Blockbench.removeListener('select_mode', modeListener);
                    Blockbench.removeListener('select_project', modeListener);
                }
            } catch (e) { }
            modeListener = null;
            actions.forEach((a) => { try { a.delete(); } catch (e) { } });
            actions.length = 0;
        },
    });
})();
