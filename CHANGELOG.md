# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

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
