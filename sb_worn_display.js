/**
 * SB Worn Display Editor — Custom Display Reference Editor for Blockbench
 *
 * Display パネル内、Reference Model の下に "Custom Display Slots" 専用バーを
 * 追加し、カスタム display key を視覚的に明示してクリック一発で編集モードに
 * 入れるようにする。スライダー (Rotation/Translation/Scale) は本体の Display
 * パネルそのままを流用するので、操作感は標準スロットと完全に同じ。
 *
 * カスタム display key:
 *   - sophisticatedbackpacks:worn       (SB の Curios back 装備時)
 *   - the_four_primitives_and_weapons:back  (MAW saya の Curios back 装備時)
 *   - the_four_primitives_and_weapons:belt  (MAW saya の Curios belt 装備時)
 *
 * 仕組み:
 *   1. displayReferenceObjects.slots (= DisplayMode.slots) に key を push
 *      → JSON 保存/読込で必須
 *   2. Display パネルの DOM に "Custom Display Slots" セクションを注入
 *      ─ アイコン + テキストラベル + アクセントカラーで明示
 *      ─ Reference Model の下に出るので折り返しに埋もれない
 *   3. ボタン click 時は DisplayMode.loadHead() を踏み台にカメラ/Reference
 *      バーをセットアップ、その後 DisplayMode.slot をカスタムキーに上書き
 *   4. MutationObserver で Vue 再レンダ時も自動再注入
 *
 * Author: hrmcngs
 * Source: https://github.com/hrmcngs/sb-worn-display-blockbench
 * License: MIT
 */
(function () {
    const PLUGIN_ID = 'sb_worn_display';

    const TARGETS = [
        {
            key: 'sophisticatedbackpacks:worn',
            label: 'SB Worn',
            tooltip: 'Sophisticated Backpacks - Curios back slot (SB worn 背中)',
            icon: 'backpack',
            color: '#5db8ff',
        },
        {
            key: 'the_four_primitives_and_weapons:back',
            label: 'MAW Back',
            tooltip: 'MAW saya - Curios back slot (MAW 鞘・背中)',
            icon: 'straighten',
            color: '#ff9659',
        },
        {
            key: 'the_four_primitives_and_weapons:belt',
            label: 'MAW Belt',
            tooltip: 'MAW saya - Curios belt slot (MAW 鞘・ベルト)',
            icon: 'linear_scale',
            color: '#ffcd5a',
        },
    ];

    const SLOT_BAR_ID = 'display_bar';
    const REF_BAR_ID = 'display_ref_bar';
    const CUSTOM_PANEL_ID = 'sb-custom-display-panel';
    const STYLE_ID = 'sb-custom-display-style';
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

        // Display モードに居ない場合は切替
        try {
            if (typeof Modes !== 'undefined' && Modes.options && Modes.options.display && !Modes.display) {
                Modes.options.display.select();
            }
        } catch (e) { }

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

        // 標準スロット radio をすべて未選択にして、自分の radio を check
        document.querySelectorAll('input[name="display"]').forEach((r) => { r.checked = false; });
        const radio = document.getElementById(safeId(target.key));
        if (radio) radio.checked = true;

        updateActiveHighlight();

        Blockbench.showQuickMessage(target.label + ' を編集中 (Ctrl+S で保存)', 1800);
    }

    function updateActiveHighlight() {
        const panel = document.getElementById(CUSTOM_PANEL_ID);
        if (!panel) return;
        const current = (typeof DisplayMode !== 'undefined') ? DisplayMode.display_slot : null;
        panel.querySelectorAll('[' + INJECTED_ATTR + '-key]').forEach((el) => {
            const key = el.getAttribute(INJECTED_ATTR + '-key');
            if (key === current) el.classList.add('sb-active');
            else el.classList.remove('sb-active');
        });
    }

    // ─── style injection ───────────────────────────────────────────────

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const css = `
            #${CUSTOM_PANEL_ID} {
                margin: 4px 0 6px 0;
                padding: 6px 6px 8px 6px;
                background: rgba(80, 160, 240, 0.05);
                border: 1px solid rgba(80, 160, 240, 0.35);
                border-radius: 4px;
            }
            #${CUSTOM_PANEL_ID} .sb-section-label {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #5db8ff;
                margin: 0 0 6px 0;
                padding: 0 2px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            #${CUSTOM_PANEL_ID} .sb-section-label .material-icons {
                font-size: 14px;
            }
            #${CUSTOM_PANEL_ID} .sb-bar {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
            }
            #${CUSTOM_PANEL_ID} .sb-tool {
                flex: 1 1 70px;
                min-width: 60px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 6px 4px;
                min-height: 52px;
                border-radius: 3px;
                cursor: pointer;
                position: relative;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid transparent;
                color: var(--color-text);
                transition: background 0.1s ease, border-color 0.1s ease;
            }
            #${CUSTOM_PANEL_ID} .sb-tool:hover {
                background: rgba(80, 160, 240, 0.18);
                border-color: rgba(80, 160, 240, 0.6);
            }
            #${CUSTOM_PANEL_ID} .sb-tool.sb-active {
                background: rgba(80, 160, 240, 0.30);
                border-color: #5db8ff;
                box-shadow: inset 0 -2px 0 0 #5db8ff;
            }
            #${CUSTOM_PANEL_ID} .sb-tool .material-icons {
                font-size: 22px;
                line-height: 1;
            }
            #${CUSTOM_PANEL_ID} .sb-tool .sb-text {
                font-size: 10px;
                line-height: 1.1;
                margin-top: 3px;
                white-space: nowrap;
                opacity: 0.9;
            }
            #${CUSTOM_PANEL_ID} .sb-tool .sb-dot {
                position: absolute;
                top: 3px;
                right: 3px;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
            }
        `;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function removeStyles() {
        const el = document.getElementById(STYLE_ID);
        if (el) el.remove();
    }

    // ─── DOM injection: dedicated "Custom Display Slots" section ───────

    function buildCustomPanel() {
        const wrapper = document.createElement('div');
        wrapper.id = CUSTOM_PANEL_ID;
        wrapper.setAttribute(INJECTED_ATTR, 'panel');

        const label = document.createElement('p');
        label.className = 'sb-section-label';
        const labelIcon = document.createElement('i');
        labelIcon.className = 'material-icons';
        labelIcon.textContent = 'extension';
        label.appendChild(labelIcon);
        label.appendChild(document.createTextNode(' Custom Display Slots'));
        wrapper.appendChild(label);

        const bar = document.createElement('div');
        bar.className = 'sb-bar';

        TARGETS.forEach((target) => {
            const id = safeId(target.key);

            // 非表示 radio（標準スロットと name 共有で排他切替）
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'display';
            input.id = id;
            input.style.display = 'none';
            input.setAttribute(INJECTED_ATTR, target.key);

            const tool = document.createElement('label');
            tool.className = 'sb-tool';
            tool.htmlFor = id;
            tool.setAttribute(INJECTED_ATTR, target.key);
            tool.setAttribute(INJECTED_ATTR + '-key', target.key);
            tool.title = target.tooltip;

            const dot = document.createElement('div');
            dot.className = 'sb-dot';
            dot.style.background = target.color;
            tool.appendChild(dot);

            const icon = document.createElement('i');
            icon.className = 'material-icons';
            icon.textContent = target.icon;
            icon.style.color = target.color;
            tool.appendChild(icon);

            const textLabel = document.createElement('span');
            textLabel.className = 'sb-text';
            textLabel.textContent = target.label;
            tool.appendChild(textLabel);

            tool.addEventListener('click', (ev) => {
                ev.preventDefault();
                loadCustomSlot(target);
            });

            bar.appendChild(input);
            bar.appendChild(tool);
        });

        wrapper.appendChild(bar);
        return wrapper;
    }

    function injectCustomPanel() {
        if (document.getElementById(CUSTOM_PANEL_ID)) {
            updateActiveHighlight();
            return;
        }
        const refBar = document.getElementById(REF_BAR_ID);
        if (!refBar || !refBar.parentNode) return;
        const panel = buildCustomPanel();
        // Reference Model バーの直後に挿入
        refBar.parentNode.insertBefore(panel, refBar.nextSibling);
        updateActiveHighlight();
    }

    function removeInjected() {
        document.querySelectorAll('[' + INJECTED_ATTR + ']').forEach((el) => el.remove());
    }

    function setupObserver() {
        if (observer) return;
        observer = new MutationObserver(() => {
            const refBar = document.getElementById(REF_BAR_ID);
            if (!refBar) return;
            if (!document.getElementById(CUSTOM_PANEL_ID)) {
                injectCustomPanel();
            } else {
                updateActiveHighlight();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function teardownObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // ─── Edit dialog (Tools menu, numeric direct entry) ────────────────

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
        description: 'Display パネル内に "Custom Display Slots" セクションを追加し、' +
            'カスタム display key (SB worn / MAW back / MAW belt) を視覚的に明示して ' +
            '標準スロットと同じ感覚で 3D 編集できるようにします。',
        about:
            'Display パネルの Reference Model の下に専用セクションを追加します:\n\n' +
            '  ● SB Worn   (sophisticatedbackpacks:worn)\n' +
            '  ● MAW Back  (the_four_primitives_and_weapons:back)\n' +
            '  ● MAW Belt  (the_four_primitives_and_weapons:belt)\n\n' +
            'アイコン + テキストラベル + 色アクセントで一目で識別できます。\n' +
            'ボタンをクリックすると標準スロットと同じスライダー (Rotation /\n' +
            'Translation / Scale) でその key を編集できます。\n\n' +
            'Tools メニューには数値直接入力用の Edit ダイアログも追加されます。\n\n' +
            '## インストール (auto-update)\n' +
            'File → Plugins → "Load Plugin from URL" に以下を貼ると以降\n' +
            'バージョン更新を自動で取得します:\n' +
            '  https://raw.githubusercontent.com/hrmcngs/sb-worn-display-blockbench/main/sb_worn_display.js\n\n' +
            '## ソース / 変更履歴\n' +
            '  https://github.com/hrmcngs/sb-worn-display-blockbench\n' +
            '  https://github.com/hrmcngs/sb-worn-display-blockbench/blob/main/CHANGELOG.md',
        version: '4.1.0',
        variant: 'both',
        min_version: '4.8.0',
        website: 'https://github.com/hrmcngs/sb-worn-display-blockbench',
        repository: 'https://github.com/hrmcngs/sb-worn-display-blockbench',
        bug_tracker: 'https://github.com/hrmcngs/sb-worn-display-blockbench/issues',
        tags: ['Minecraft: Java Edition', 'Modeling'],

        onload() {
            registerSlotsInDisplayMode();
            injectStyles();

            // Tools メニューに Edit ダイアログ (fallback / 数値入力用)
            TARGETS.forEach((target, idx) => {
                const aEdit = new Action('custom_disp_edit_' + safeId(target.key), {
                    name: '[' + (idx + 1) + '] Edit (numbers): ' + target.label,
                    description: 'ダイアログで ' + target.key + ' を数値編集',
                    icon: 'tune',
                    category: 'edit',
                    click() { openEditDialog(target); },
                });
                try { MenuBar.addAction(aEdit, 'tools'); } catch (e) { }
                actions.push(aEdit);
            });

            setupObserver();
            injectCustomPanel();

            try {
                modeListener = () => setTimeout(() => {
                    injectStyles();
                    injectCustomPanel();
                }, 50);
                Blockbench.on('select_mode', modeListener);
                Blockbench.on('select_project', modeListener);
            } catch (e) { }

            console.log('[' + PLUGIN_ID + '] v4.1.0 loaded — '
                + TARGETS.length + ' custom display slots available');
        },

        onunload() {
            teardownObserver();
            removeInjected();
            removeStyles();
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
