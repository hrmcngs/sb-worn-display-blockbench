# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [4.9.2] – 2026-06-03

### Changed
- verify release.sh end-to-end after fixing eval/awk bugs (no plugin code change)
## [4.9.1] – 2026-06-03

### Fixed
- **Preview now matches in-game appearance.** Added `display_area.rotation.z = π` (180°) alongside the per-slot `anchorY` write. Minecraft's `LivingEntityRenderer` applies `scale(-1, -1, 1)` when drawing entity-attached items, which Blockbench doesn't replicate — so the same display values that look right in-game appeared point-symmetrically wrong (rolled 180°) in the plugin's preview. Z-axis 180° rotation = `(x,y,z) → (-x,-y,z)` = equivalent to that scale flip, restoring 1:1 visual parity.

## [4.9.0] – 2026-06-03

### Added
- **Per-slot `anchorY` for the player-reference preview.** Each `TARGETS` entry now has an `anchorY: number` field that overrides where the model sits on the player reference in Display mode. `loadHead()` puts the model at head height (~24), which is unnatural when you're editing a backpack or belt slot. Defaults:
  - `sophisticatedbackpacks:worn`: `y = 18` (chest)
  - `the_four_primitives_and_weapons:back`: `y = 18` (chest/back center)
  - `the_four_primitives_and_weapons:belt`: `y = 12` (waist)
- Applied right after `loadHead()` by writing directly to the global `display_area.position.y` (with `DisplayMode.display_area` / `DisplayMode.display_base` as fallbacks).

### Quick reference for `anchorY` values (32 px-tall Steve)
- `28` head/face center
- `24` neck / head bone pivot
- `18` chest
- `12` waist / belt
- `8`  thighs
- `0`  feet

## [4.8.0] – 2026-06-02

### Changed
- **Bulk import now covers vanilla slots too** (`gui`, `head`, `ground`, `firstperson_righthand`, `firstperson_lefthand`, `thirdperson_righthand`, `thirdperson_lefthand`, `fixed`, `on_shelf`, `embedded`) — not just the plugin's three custom keys. The dialog enumerates **every key present in the source file's `display` section** as a target candidate, tagged with `(vanilla)` / `(custom)` / `(other)` so it's obvious at a glance.
- Keys are listed in Blockbench's canonical slot-row order (vanilla first, then custom, then anything else).
- All candidates default to checked, so the dialog still works as a "import everything" one-click flow.

### Partial replace remains intact
- Per-axis 9-checkbox grid from v4.7.0 (Rotation X/Y/Z, Translation X/Y/Z, Scale X/Y/Z) is applied uniformly across the chosen target slots — vanilla and custom alike.

## [4.7.0] – 2026-06-02

### Changed
- **True per-axis partial replace.** The bulk-import dialog's 3 channel-level checkboxes (Rotation / Translation / Scale) are split into **9 per-axis checkboxes** (Rotation X / Y / Z, Translation X / Y / Z, Scale X / Y / Z). Each can be toggled independently, so you can copy e.g. only Scale Y from a sibling model while leaving everything else untouched. Combined with the per-slot checkboxes from v4.6.0, the dialog now exposes (3 slots × 9 axes) = up to 27 independent decisions per Confirm.
- Confirmation message now reports exactly which axes were written per slot, e.g. `sophisticatedbackpacks:worn ← rotation.XZ + scale.Y`.

## [4.6.1] – 2026-06-02

### Added
- **Import button directly in the "Custom Slot" section header.** The bulk-import dialog is now reachable straight from the Display panel — small download icon (Material `file_download`) next to the "Custom Slot" label, styled the same as Blockbench's native `.tool.head_right` buttons (e.g. the Reset arrow next to Rotation). Click → opens the same dialog as `Tools → Bulk import display values…`.

## [4.6.0] – 2026-06-02

### Changed
- **Import display values is now true bulk-replace.** v4.3.0's dialog only replaced one slot per Confirm — to import three custom slots you had to repeat the whole flow three times. New dialog shows all `TARGETS` keys with their own checkbox (auto-checked when the source file has the same key) plus the shared Rotation / Translation / Scale checkboxes, so one Confirm overwrites every checked slot × every checked field.
- The custom slot used for source is now always "same key as target" (match by name). If you need to copy across differently-named slots, edit the source file's key first.
- Tools menu label updated to **"Bulk import display values from another model…"** to reflect the new behavior.

### Fixed
- **Slider UI not reflecting imported values for the currently-edited slot.** After overwriting, if the active `DisplayMode.display_slot` was one of the replaced ones, the plugin now re-binds `DisplayMode.slot` and `DisplayMode.vue._data.slot` to the freshly-mutated `display_settings[key]` and calls `$forceUpdate()` — so the sliders snap to the new values immediately instead of looking unchanged.

## [4.5.0] – 2026-06-02

### Fixed
- **Ctrl/Cmd+Z now reverts Center Model at Origin.** v4.4.0 called `Undo.initEdit({ elements, group: groups })` — passing an array to the `group` field, which Blockbench's Undo API doesn't recognize, so group-origin diffs were silently dropped and the undo entry was incomplete. Replaced with `{ elements, outliner: true }` which snapshots the full outliner state including all group origins. Standard Undo now correctly reverts the entire centering operation in one step.

### Added
- **Center Pivot of Groups** (Tools menu + outliner right-click menu). Non-destructive companion to Center Model: sets each group's `origin` to the bounding-box center of its children, leaving the model geometry where it is. Useful when you want rotation to pivot around each group's visual center without moving the model.
  - If a group is selected, only that group's pivot is centered.
  - If nothing is selected, all groups are centered.
  - Wrapped in `Undo.initEdit({ outliner: true })` so Ctrl/Cmd+Z reverts.

### Changed
- **Center View now delegates to Blockbench's built-in `focus_on_selection`** (Japanese label: "センタービュー") instead of using a custom implementation. The outliner right-click menu now references the native action directly, so behavior is 1:1 with the existing View menu / preview context-menu entry. Removed the v4.4.0 custom `centerViewOnSelection` function and its supporting helpers.

## [4.4.0] – 2026-06-02

### Added
- **Center Model at Origin** (Tools menu + outliner right-click menu). Computes the bounding box of all elements (cube `from`/`to`, mesh `vertices`, locator `position`), then shifts every element and group `origin` so the bbox center sits at world (0,0,0). Display-mode rotation then orbits around the model's visual center instead of an off-origin point. Wrapped in `Undo.initEdit` / `Undo.finishEdit` so Ctrl+Z reverts. Shows a confirm dialog with the computed offset before applying.
- **Center View on Selection** (Tools menu + outliner right-click menu). Non-destructive: just sets the active preview's `controls.target` to the bbox center of the current selection (or all elements if nothing is selected). Works in both Edit mode (`main_preview`) and Display mode (`display_preview`).
- Both new actions are added to the right-click context menu of Cube / Group / Mesh in the Outliner, so they're reachable from the same menu as Copy / Paste / Duplicate / etc.

## [4.3.0] – 2026-06-02

### Added
- **Import display values from another model file.** New Tools menu action `Import display values from another model…` opens a file picker (accepts `.json` and `.bbmodel`), then shows a dialog where you choose:
  - Source slot (any key found in the source file's `display` section, including vanilla slots and other custom keys)
  - Target slot (one of the plugin's registered custom keys)
  - **Which fields to overwrite** via three independent checkboxes — Rotation (X/Y/Z), Translation (X/Y/Z), Scale (X/Y/Z). Partial-replace is the point: e.g. tick only Scale to copy just sizing from a sibling model without touching rotation.
- Source values are shown as a live preview in the dialog before you confirm, so you can sanity-check what's about to be written.

## [4.2.3] – 2026-05-31

### Fixed
- **Reference Model (player figure + reference-model bar) was reset on tab switch.** v4.2.2 skipped `DisplayMode.loadHead()` entirely on `select_project` to avoid the jarring camera reset, but loadHead also re-populates the reference-model bar via `displayReferenceObjects.bar([...])`. Skipping it meant the player/zombie/armor_stand reference figure vanished after every tab switch.
- New approach: still call loadHead on tab switch (so the reference bar is correctly re-populated for the new project), but **save the camera position/target before, and restore them after** — so the user's viewing angle is preserved.

## [4.2.2] – 2026-05-31

### Fixed
- **Tab switch with a custom slot active no longer leaves the viewport in a broken state** (model floating off-center, reference model gone). On `select_project`, `DisplayMode.slot` and `DisplayMode.vue._data.slot` were still pointing at the *previous* project's slot object, so `updateDisplayBase` read stale data after the tab swap. Now we listen for `select_project` and, if the active slot key is one of ours, silently rebind to the new project's `display_settings[key]` — without forcing display mode or resetting the camera (which would have been jarring on every tab change).

### Changed
- `loadCustomSlot` now accepts an options object (`silent`, `autoEnterDisplay`, `skipCameraReset`) so it can be reused for the project-switch rebind path without side effects.

## [4.2.1] – 2026-05-31

### Changed
- Metadata harmonization for submission to the official JannisX11/blockbench-plugins repository:
  - `description` rewritten in English (was Japanese-only) for broader discoverability on the in-app plugin store
  - `about` field removed from the `Plugin.register` manifest — moved to `about.md` per the new-structure (min_version 4.8.0+) convention
  - `creation_date` added
- No functional changes — same behavior as v4.2.0.

## [4.2.0] – 2026-05-31

### Changed
- **Design simplified to match Blockbench's native UI conventions.** v4.1.0's tinted background, accent border, color dots, colored icons, and text labels are all removed. The injected section now uses Blockbench's own `panel_toolbar_label` + `bar tabs_small icon_bar` + `label.tool` markup — visually identical in style to the built-in "Slot" and "Reference Model" rows.
- Section is labeled simply "Custom Slot" using the standard label class.
- Icons only (no per-button text label) — matches vanilla slot row layout.
- Active highlight is inherited from Blockbench's native `:checked` CSS for the shared `name="display"` radios — no custom CSS needed.

### Removed
- Custom `<style>` injection.
- Per-target `color` field.

## [4.1.0] – 2026-05-31

### Changed
- **Switched from slot-bar injection to a dedicated "Custom Display Slots" section** placed under Reference Model. The previous approach injected radio buttons into the vanilla 8-icon slot row, which on narrow panels caused the custom tabs to wrap off-screen or get visually lost among the standard icons.
- New section design:
  - Each slot is a button with both an **icon and a text label** (no more icon-only ambiguity)
  - Per-slot **accent color dot** + colored icon for at-a-glance identification (SB Worn = blue, MAW Back = orange, MAW Belt = yellow)
  - Active slot gets a clear highlight (border + background tint + bottom bar)
  - Whole section has a tinted background and border so it's visually distinct from the vanilla panel
- Buttons auto-flex-wrap on narrow panels, so all 3 are always visible.
- Selecting a custom slot now auto-enters Display mode if you're not already in it.

### Fixed
- Vue-rebuild edge case where the active highlight could fall out of sync — the MutationObserver now also re-syncs the highlight.

## [4.0.1] – 2026-05-31

### Changed
- `min_version` bumped to `4.8.0` to align with the recommended new-structure plugin format required for submission to the official Blockbench plugin repository (JannisX11/blockbench-plugins).

## [4.0.0] – 2026-05-31

### Added
- **Slot bar integration** — Custom display keys now appear as tabs directly in the Display panel's Slot row, next to the vanilla `head` / `gui` / `ground` tabs. No more workarounds: click the tab and edit the same way as a vanilla slot.
- `DisplayMode.slots` registration — custom keys are properly registered so values persist through JSON save/reload.
- MutationObserver watchdog that re-injects custom slot tabs if Blockbench's Vue layer wipes them (mode switch, format change, etc.).
- Web variant support (`variant: 'both'`) — usable on both the desktop app and `blockbench.net` web version.
- URL-based auto-update via raw GitHub URL — see [README](README.md#installation).
- `website` field linking back to this repo for the in-app plugin info.

### Changed
- Major UX shift: editing is now done from the Slot row, not via the head-proxy round-trip.
- Tools menu is now a single Edit dialog per key (numeric direct entry), used as a fallback if the DOM injection ever breaks.

### Removed
- `Load → head` / `Save head → key` workflow actions (no longer needed).
- `Reset head backup` action (no longer needed).

### Known risks
- Implementation relies on DOM injection into Blockbench's hardcoded `DisplayModePanel.vue` slot row. A future Blockbench update that restructures that template can break the tabs. The Tools menu Edit dialogs remain as fallback.

## [3.0.0] – previous

- Three Tools-menu actions per key (Edit / Load→head / Save head→) + reset.
- Head-slot proxy workflow for visual editing.
- Initial public version.
