# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

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
