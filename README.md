# SB Worn Display Editor

A [Blockbench](https://www.blockbench.net/) plugin that lets you **edit custom display references** (`sophisticatedbackpacks:worn`, `the_four_primitives_and_weapons:back`, `the_four_primitives_and_weapons:belt`) **directly from the Display panel's Slot row**, just like the vanilla `head` / `gui` / `ground` tabs.

Works on both **desktop Blockbench** and the **web version** (blockbench.net).

## Supported display keys

| Key | Used for |
|---|---|
| `sophisticatedbackpacks:worn` | SB backpack worn on Curios "back" slot |
| `the_four_primitives_and_weapons:back` | MAW saya worn on Curios "back" slot |
| `the_four_primitives_and_weapons:belt` | MAW saya worn on Curios "belt" slot |

## Why this plugin

Blockbench's Display panel only ships with the 8 vanilla Java display contexts (`thirdperson_*`, `firstperson_*`, `head`, `gui`, `ground`, `fixed`). Custom display keys defined by Forge mods (with `ItemDisplayContext.create(...)`) are preserved in the JSON model file, but the default Blockbench UI gives you no way to edit them visually — and worse, **values for unknown keys are silently stripped on save** because Blockbench's exporter iterates `DisplayMode.slots`.

This plugin:

1. **Registers the custom keys** in `DisplayMode.slots` so values round-trip through save / reload safely.
2. **Injects extra tabs into the Slot row** so you can pick a custom key and edit rotation / translation / scale in the 3D viewport, with the player reference model visible — same UX as vanilla slots.
3. Provides a **numeric Edit dialog** under Tools as a fallback for typing exact values.

## Installation

### Option A — URL install (recommended, auto-updates)

This is the easiest path. Blockbench will re-check the URL on startup and prompt you to update whenever the `version` field bumps.

1. Open Blockbench
2. **File → Plugins**
3. Click the **`</>` "Load Plugin from URL"** button in the top-right of the plugin manager
4. Paste:
   ```
   https://raw.githubusercontent.com/hrmcngs/sb-worn-display-blockbench/main/sb_worn_display.js
   ```
5. Confirm. "SB Worn Display Editor" appears in the list.

From now on Blockbench checks this URL automatically and notifies you of new versions.

### Option B — From local file

1. Download [`sb_worn_display.js`](sb_worn_display.js)
2. Blockbench → **File → Plugins → "Load Plugin from File"**
3. Select the downloaded file

This does **not** auto-update — you have to repeat the steps when a new version drops.

## Usage

1. Open your Java Item Model JSON in Blockbench
2. Switch to **Display mode** (top toolbar)
3. In the right panel's **Slot** row, three new tabs appear at the end:
   - `backpack` icon → SB Worn
   - `↑` icon → MAW Back
   - `─` icon → MAW Belt
4. Click any of them and edit rotation / translation / scale the same way as `head`
5. Ctrl+S to save the JSON

The player reference model is shown for orientation. Note: the actual worn-slot anchor in-game is on the back/belt, not the head — see [Translation caveat](#translation-caveat) below.

### Tools menu (fallback)

If the slot tabs ever break (e.g. after a Blockbench update), the Tools menu still has:

- `Edit (numbers): SB Worn`
- `Edit (numbers): MAW Back`
- `Edit (numbers): MAW Belt`

for direct numeric entry.

## Translation caveat

The 3D preview uses the `head` slot's camera and player reference model. **Scale and rotation translate accurately** to in-game appearance. **Translation values** are pixel-relative offsets from the anchor point set by the mod's renderer (back / belt), which is not the head — so a translation that looks right in the preview will appear at a different world location in-game. Iterate by testing in-game for translation tuning.

## Adding more custom display keys

Edit the `TARGETS` array near the top of [`sb_worn_display.js`](sb_worn_display.js):

```javascript
const TARGETS = [
    { key: 'your_namespace:your_key', label: 'Short', tooltip: 'Tooltip text', icon: 'inventory_2' },
    // existing entries...
];
```

Reload the plugin (File → Plugins → uninstall → re-install). `icon` is a [Material Icons](https://fonts.google.com/icons) name.

## Compatibility

- Blockbench **4.0.0+**
- Both **desktop** and **web** variants
- Java Block/Item Model format (other formats untested but the plugin no-ops gracefully)

## How it works internally

The Display panel's Slot row in Blockbench's `DisplayModePanel.vue` is hardcoded (no `v-for`), so there's no official extension API. This plugin works around that by:

1. Pushing custom keys into `DisplayMode.slots` (required for save/load round-trip — see [`java_block.js:237`](https://github.com/JannisX11/blockbench/blob/master/js/formats/java/java_block.js#L237) and [`display_mode.js:1010`](https://github.com/JannisX11/blockbench/blob/master/js/display_mode.js#L1010))
2. DOM-injecting `<input type="radio">` + `<label>` into `#display_bar`
3. Watching with a MutationObserver to re-inject after Vue re-renders
4. On click, calling `DisplayMode.loadHead()` to set up camera + reference bar, then overriding `DisplayMode.slot` to the custom key

This is fragile by nature — a Blockbench update that restructures `DisplayModePanel.vue` will break the tabs. The Tools menu Edit dialogs remain as fallback.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).

## Related

- [Sophisticated Backpacks](https://github.com/P3pp3rF1y/SophisticatedBackpacks)
- [Blockbench](https://github.com/JannisX11/blockbench)
- [Blockbench plugin store](https://www.blockbench.net/plugins) (submission to the in-app store requires a PR to [`JannisX11/blockbench-plugins`](https://github.com/JannisX11/blockbench-plugins) — currently distributed via URL only)
