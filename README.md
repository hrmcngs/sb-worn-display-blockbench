# SB Worn Display Editor

A [Blockbench](https://www.blockbench.net/) plugin that adds menu actions to edit custom display references used by Sophisticated Backpacks addons and the_four_primitives_and_weapons (MAW) saya items.

## Supported Display Keys

| Key | Used for |
|---|---|
| `sophisticatedbackpacks:worn` | SB backpack worn on Curios "back" slot |
| `the_four_primitives_and_weapons:back` | MAW saya worn on Curios "back" slot |
| `the_four_primitives_and_weapons:belt` | MAW saya worn on Curios "belt" slot |

## Why this plugin

Blockbench's display tab UI only supports the 8 vanilla Java display contexts (thirdperson_*, firstperson_*, head, gui, ground, fixed). Custom display keys defined by Forge mods (with `ItemDisplayContext.create(...)`) are preserved in the JSON model file but can't be edited visually in the default Blockbench UI.

This plugin works around that limitation by:

1. Providing a numeric **Edit dialog** for direct value entry
2. Providing a **head slot proxy** workflow — copies the custom key's values into the `head` display slot temporarily so you can edit visually in the 3D viewport, then writes the edited values back to the custom key when you're done

## Installation

1. Open Blockbench
2. Menu → **File → Plugins**
3. Click **"Load Plugin from File"** in the top-right corner of the plugin manager
4. Select `sb_worn_display.js` from this repository
5. "SB Worn Display Editor" should appear in the plugins list with a checkmark

The plugin is persisted in your Blockbench user settings, so it loads automatically on startup.

## Usage

### Workflow A: Numeric dialog

1. Open your Java Item Model JSON in Blockbench
2. Menu → **Tools → "[N] Edit: <key name>"**
3. Adjust Rotation / Translation / Scale via number inputs
4. Click OK
5. Ctrl+S to save the JSON

### Workflow B: Visual editing via head proxy

This is the "edit in 3D viewport" approach.

1. Open your Java Item Model JSON in Blockbench
2. Menu → **Tools → "[N] Load → head: <key name>"**
   - The custom key's current values get copied into the `head` display slot
   - The original `head` slot's values are backed up internally
3. Switch to Display mode (top-right) and select the `head` slot icon (smiley face)
4. Adjust Rotation / Position / Scale visually in the 3D viewport — the player reference shows the item attached to the head, which is the closest visual proxy
5. When done, menu → **Tools → "[N] Save head → <key name>"**
   - The edited values are written back to the custom key
   - The `head` slot is restored to its original backup
6. Ctrl+S to save the JSON

### Workflow C: Reset stuck backup

If you abort the head-proxy workflow (e.g. close the file mid-edit), the `head` slot might be stuck with the custom key's values. To restore:

- Menu → **Tools → "[!] Reset head backup"**

## Tools menu layout

After install, the Tools menu will have 10 entries (3 keys × 3 actions + reset):

```
Edit: SB Worn (背中・SB)
Load → head: SB Worn (背中・SB)
Save head → SB Worn (背中・SB)
Edit: MAW Saya Back (背中・MAW鞘)
Load → head: MAW Saya Back (背中・MAW鞘)
Save head → MAW Saya Back (背中・MAW鞘)
Edit: MAW Saya Belt (ベルト・MAW鞘)
Load → head: MAW Saya Belt (ベルト・MAW鞘)
Save head → MAW Saya Belt (ベルト・MAW鞘)
[!] Reset head backup
```

## Important note about head proxy

The `head` slot in Blockbench shows the item attached to the player's head. The actual worn slot (`sophisticatedbackpacks:worn` etc.) attaches to the back/belt at a different anchor point set by the mod's renderer. **Scale and rotation tuning translates correctly**, but **translation values** position the item relative to the anchor — so the same translation that looks right on the head will appear at a different world location when worn on the back.

For scale/rotation: Blockbench preview is reliable.
For translation: iterate by testing in-game; consider it pixel-relative offsets from the renderer's anchor point.

## Adding more custom display keys

Edit the `TARGETS` array near the top of `sb_worn_display.js`:

```javascript
const TARGETS = [
    { key: 'your_namespace:your_key', label: 'Your Label', description: '...' },
    // existing entries...
];
```

Then reload the plugin in Blockbench (File → Plugins → unload → re-load from file).

## Compatibility

- Blockbench **4.0.0+**
- Java Block/Item Model format only
- Does not modify Blockbench's built-in display slot UI (which is hardcoded to 8 vanilla slots)

## License

MIT — see [LICENSE](LICENSE).

## Related

- [Sophisticated Backpacks](https://github.com/P3pp3rF1y/SophisticatedBackpacks) — the mod whose worn display this targets
- [Blockbench](https://github.com/JannisX11/blockbench) — the model editor this plugin extends
