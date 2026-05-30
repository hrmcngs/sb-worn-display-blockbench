/**
 * Custom Display Reference Editor Plugin for Blockbench
 *
 * 何をするか:
 *   Tools メニューに以下の各カスタム display reference を編集する action を追加:
 *     - sophisticatedbackpacks:worn       (SB の Curios back 装備時)
 *     - the_four_primitives_and_weapons:back  (MAW saya の Curios back 装備時)
 *     - the_four_primitives_and_weapons:belt  (MAW saya の Curios belt 装備時)
 *
 *   各キーごとに「ダイアログで数値編集」「head スロット経由で視覚編集」両方を提供。
 *
 * 視覚編集ワークフロー (Workflow B):
 *   1. Tools → "Load <key> → head slot"
 *   2. 自動で Display モードに切り替わり、head スロットに対象キーの値が入る
 *   3. 3D ビューポートで人形と一緒に視覚編集 (head スロットの sliders を使う)
 *   4. 編集後 Tools → "Save head slot → <key>" で書き戻し
 *   5. Ctrl+S で JSON 保存
 *
 * Author: Backpack Arsenal mod project
 * Compatible with Blockbench 4.x
 */
(function () {
    const PLUGIN_ID = 'sb_worn_display';
    const HEAD_KEY = 'head';

    /**
     * 編集対象のカスタム display key 一覧。ここに追加すれば自動で
     * Tools メニューに 3 種類のアクション (Edit / Load / Save) が出る。
     */
    const TARGETS = [
        {
            key: 'sophisticatedbackpacks:worn',
            label: 'SB Worn (背中・SB)',
            description: 'Sophisticated Backpacks Curios back 装備時の表示',
        },
        {
            key: 'the_four_primitives_and_weapons:back',
            label: 'MAW Saya Back (背中・MAW鞘)',
            description: 'MAW saya を Curios back に装備した時の表示',
        },
        {
            key: 'the_four_primitives_and_weapons:belt',
            label: 'MAW Saya Belt (ベルト・MAW鞘)',
            description: 'MAW saya を Curios belt に装備した時の表示',
        },
    ];

    const actions = []; // 登録した Action を unload で消すための一覧

    // ─── helpers ─────────────────────────────────────────────────────────

    function getProject() {
        return (typeof Project !== 'undefined') ? Project : null;
    }

    function getDisplayContainer() {
        const p = getProject();
        if (!p) return null;
        if (!p.display_settings) p.display_settings = {};
        return p.display_settings;
    }

    function getSlotValues(key) {
        const ds = getDisplayContainer();
        const def = { rotation: [0, 0, 0], translation: [0, 0, 0], scale: [1, 1, 1] };
        if (!ds) return def;
        const s = ds[key];
        if (!s) return def;
        return {
            rotation: (s.rotation || [0, 0, 0]).slice(),
            translation: (s.translation || [0, 0, 0]).slice(),
            scale: (s.scale || [1, 1, 1]).slice(),
        };
    }

    function setSlotValues(key, v) {
        const ds = getDisplayContainer();
        if (!ds) {
            Blockbench.showQuickMessage('Open a model first', 1500);
            return false;
        }
        ds[key] = {
            rotation: v.rotation.slice(),
            translation: v.translation.slice(),
            scale: v.scale.slice(),
        };
        const p = getProject();
        if (p && p.saved !== undefined) p.saved = false;
        return true;
    }

    function refreshUI() {
        try {
            if (typeof DisplayMode !== 'undefined' && DisplayMode.updateDisplay) DisplayMode.updateDisplay();
            if (typeof main_preview !== 'undefined' && main_preview.render) main_preview.render();
            if (typeof updateInterface === 'function') updateInterface();
        } catch (e) { }
    }

    function openEditDialog(target) {
        const cur = getSlotValues(target.key);
        const dlg = new Dialog({
            id: 'edit_' + target.key.replace(/[^a-z0-9]/gi, '_'),
            title: 'Edit: ' + target.label,
            width: 480,
            form: {
                _info: { type: 'info', text: target.description + '\n\n' + target.key },
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

    function loadToHead(target) {
        const ds = getDisplayContainer();
        if (!ds) {
            Blockbench.showQuickMessage('モデルを開いてください', 1500);
            return;
        }
        // 連続ロードを避けるため、既存バックアップが他キーのものなら警告
        if (ds.__head_backup_key__ && ds.__head_backup_key__ !== target.key) {
            Blockbench.showMessageBox({
                title: '警告',
                message: '他のキー (' + ds.__head_backup_key__ + ') の head 編集が未保存です。\n' +
                    '先に "Save head slot → ' + ds.__head_backup_key__ + '" するか、Reset してください。',
            });
            return;
        }
        // head の現在値をバックアップ (まだ無ければ)
        if (!ds.__head_backup__) {
            ds.__head_backup__ = getSlotValues(HEAD_KEY);
            ds.__head_backup_key__ = target.key;
        }
        const cur = getSlotValues(target.key);
        setSlotValues(HEAD_KEY, cur);
        try {
            if (typeof Modes !== 'undefined' && Modes.options && Modes.options.display) {
                Modes.options.display.select();
            }
            if (typeof DisplayMode !== 'undefined' && DisplayMode.slot) {
                DisplayMode.slot = HEAD_KEY;
            }
        } catch (e) { }
        refreshUI();
        Blockbench.showQuickMessage(
            target.label + ' を head スロットにロード。視覚編集後 "Save head → ' + target.label + '" で書き戻し', 3500);
    }

    function saveFromHead(target) {
        const ds = getDisplayContainer();
        if (!ds) {
            Blockbench.showQuickMessage('モデルを開いてください', 1500);
            return;
        }
        if (ds.__head_backup_key__ && ds.__head_backup_key__ !== target.key) {
            Blockbench.showMessageBox({
                title: 'キーが不一致',
                message: 'head にロード中のキーは "' + ds.__head_backup_key__ + '" です。\n' +
                    '対応する "Save head → ..." を使ってください。',
            });
            return;
        }
        const headNow = getSlotValues(HEAD_KEY);
        setSlotValues(target.key, headNow);
        if (ds.__head_backup__) {
            setSlotValues(HEAD_KEY, ds.__head_backup__);
            delete ds.__head_backup__;
            delete ds.__head_backup_key__;
        }
        refreshUI();
        Blockbench.showQuickMessage(
            target.label + ' に保存 (head 復元済み)。Ctrl+S で永続化', 2500);
    }

    function resetHeadBackup() {
        const ds = getDisplayContainer();
        if (!ds) return;
        if (ds.__head_backup__) {
            setSlotValues(HEAD_KEY, ds.__head_backup__);
            delete ds.__head_backup__;
            delete ds.__head_backup_key__;
            refreshUI();
            Blockbench.showQuickMessage('head スロットを元の値に復元しました', 2000);
        } else {
            Blockbench.showQuickMessage('バックアップ無し', 1500);
        }
    }

    // ─── plugin registration ────────────────────────────────────────────

    Plugin.register(PLUGIN_ID, {
        title: 'Custom Display Reference Editor',
        author: 'Backpack Arsenal',
        description: 'カスタム display reference (SB worn / MAW back / MAW belt) を ' +
            '数値ダイアログ or head スロット経由で視覚編集する Tools メニュー追加。',
        about:
            'Tools メニュー追加内容 (3 キー × 3 アクション = 9 個 + 1 reset):\n' +
            '  SB Worn:    Edit / Load → head / Save head → SB\n' +
            '  MAW Back:   Edit / Load → head / Save head → MAW Back\n' +
            '  MAW Belt:   Edit / Load → head / Save head → MAW Belt\n' +
            '  Reset head backup (head バックアップを手動復元)\n\n' +
            '視覚編集フロー:\n' +
            '  1. Tools → "Load <key> → head slot"\n' +
            '  2. Display モード + head スロットで 3D 編集\n' +
            '  3. Tools → "Save head slot → <key>" で書き戻し\n' +
            '  4. Ctrl+S で JSON 保存',
        version: '3.0.0',
        variant: 'desktop',
        min_version: '4.0.0',
        tags: ['Minecraft: Java Edition', 'Modeling'],

        onload() {
            TARGETS.forEach((target, idx) => {
                const safeId = target.key.replace(/[^a-z0-9]/gi, '_').toLowerCase();

                const aEdit = new Action('custom_disp_edit_' + safeId, {
                    name: '[' + (idx + 1) + '] Edit: ' + target.label,
                    description: 'ダイアログで ' + target.key + ' を数値編集',
                    icon: 'tune',
                    category: 'edit',
                    click() { openEditDialog(target); },
                });
                const aLoad = new Action('custom_disp_load_' + safeId, {
                    name: '[' + (idx + 1) + '] Load → head: ' + target.label,
                    description: target.key + ' を head スロットにロードして視覚編集モードへ',
                    icon: 'login',
                    category: 'edit',
                    click() { loadToHead(target); },
                });
                const aSave = new Action('custom_disp_save_' + safeId, {
                    name: '[' + (idx + 1) + '] Save head → ' + target.label,
                    description: 'head の現在値を ' + target.key + ' に書き戻し、head 復元',
                    icon: 'save',
                    category: 'edit',
                    click() { saveFromHead(target); },
                });
                try {
                    MenuBar.addAction(aEdit, 'tools');
                    MenuBar.addAction(aLoad, 'tools');
                    MenuBar.addAction(aSave, 'tools');
                } catch (e) {
                    console.error('[custom_disp] addAction failed for', target.key, e);
                }
                actions.push(aEdit, aLoad, aSave);
            });

            const aReset = new Action('custom_disp_reset_head', {
                name: '[!] Reset head backup',
                description: 'バックアップから head を強制復元 (緊急用)',
                icon: 'restart_alt',
                category: 'edit',
                click() { resetHeadBackup(); },
            });
            try { MenuBar.addAction(aReset, 'tools'); } catch (e) { }
            actions.push(aReset);

            console.log('[custom_disp] v3.0 Loaded — Tools menu に '
                + (TARGETS.length * 3 + 1) + ' actions 追加');
        },

        onunload() {
            actions.forEach((a) => {
                try { a.delete(); } catch (e) { }
            });
            actions.length = 0;
        },
    });
})();
