#!/usr/bin/env bash
# Semi-automatic release flow for sb_worn_display.
#
# Does:
#   1. Bump version in sb_worn_display.js (patch / minor / major)
#   2. Prepend a CHANGELOG.md entry stub (or use -m "message")
#   3. Open $EDITOR so you can polish the CHANGELOG entry (skip with -y)
#   4. Commit + push to own repo  ─► release.yml auto-creates the GitHub Release
#   5. Sync to fork workdir of JannisX11/blockbench-plugins (also bump the
#      plugins.json sb_worn_display entry's version), run validator
#   6. Commit + push fork branch  ─► PR #914 auto-updates
#
# Usage:
#   ./scripts/release.sh patch
#   ./scripts/release.sh minor -m "Add foo / fix bar"
#   ./scripts/release.sh major -m "Breaking: rename X" -y
#   ./scripts/release.sh patch --skip-fork           # only own repo, skip PR sync
#   ./scripts/release.sh patch --dry-run             # show what would happen
#
# Flags:
#   -m "message"   one-line summary that becomes both the commit subject and
#                  the CHANGELOG section body. If omitted, a stub is created
#                  and your editor opens for the CHANGELOG.
#   -y             non-interactive: skip the editor + skip the "press enter
#                  to push" confirmation. Implies you trust the inputs.
#   --skip-fork    don't touch the blockbench-plugins fork (only release on
#                  your own repo). Useful when you don't have the workdir.
#   --dry-run      print every step but execute nothing destructive.
#
# Environment:
#   FORK_WORKDIR   path to local clone of <user>/blockbench-plugins fork. If
#                  unset, falls back to /tmp/bbplugin_workdir's contents
#                  (the file used by the in-conversation flow).
#                  If still unset or the path doesn't exist, --skip-fork is
#                  assumed and a warning is printed.
#   PLUGIN_ID      defaults to "sb_worn_display".
#   FORK_BRANCH    defaults to "add-sb-worn-display".
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

# ── arg parsing ─────────────────────────────────────────────────────
PART=""
MESSAGE=""
YES=0
SKIP_FORK=0
DRY_RUN=0

while (($#)); do
  case "$1" in
    patch|minor|major) PART="$1"; shift;;
    -m) MESSAGE="${2:-}"; shift 2;;
    -y) YES=1; shift;;
    --skip-fork) SKIP_FORK=1; shift;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help)
      sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
      exit 0;;
    *) echo "unknown arg: $1" >&2; exit 1;;
  esac
done

if [[ -z "$PART" ]]; then
  echo "Usage: $0 patch|minor|major [-m \"message\"] [-y] [--skip-fork] [--dry-run]" >&2
  exit 1
fi

PLUGIN_ID="${PLUGIN_ID:-sb_worn_display}"
FORK_BRANCH="${FORK_BRANCH:-add-sb-worn-display}"
JS_FILE="${PLUGIN_ID}.js"
CHANGELOG="CHANGELOG.md"

run() {
  # Execute argv directly — DO NOT eval. eval breaks on any shell-special
  # character in the args (parens, quotes, etc.), which is fatal for commit
  # messages that mention things like "scale(-1,-1,1)".
  if (( DRY_RUN )); then
    printf '  [dry-run]'
    for arg in "$@"; do printf ' %q' "$arg"; done
    printf '\n'
  else
    "$@"
  fi
}

# ── 1. version bump ─────────────────────────────────────────────────
CURRENT=$(grep -oE "version:\s*'[^']+'" "$JS_FILE" | head -1 | sed -E "s/version:[[:space:]]*'([^']+)'/\1/")
if ! [[ "$CURRENT" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "error: current version '$CURRENT' is not semver (x.y.z)" >&2
  exit 1
fi
MAJOR="${BASH_REMATCH[1]}"
MINOR_V="${BASH_REMATCH[2]}"
PATCH_V="${BASH_REMATCH[3]}"
case "$PART" in
  patch) PATCH_V=$((PATCH_V + 1));;
  minor) MINOR_V=$((MINOR_V + 1)); PATCH_V=0;;
  major) MAJOR=$((MAJOR + 1)); MINOR_V=0; PATCH_V=0;;
esac
NEW="${MAJOR}.${MINOR_V}.${PATCH_V}"

echo "=== Release ${CURRENT} → ${NEW} (${PART}) ==="
echo

# Replace the FIRST version: '...' (the manifest one)
echo "[1/7] bumping version in ${JS_FILE}"
if (( DRY_RUN )); then
  printf '  [dry-run] would rewrite: version: '\''%s'\'' → version: '\''%s'\''\n' "$CURRENT" "$NEW"
else
  awk -v new="$NEW" '
    !done && /version:[[:space:]]*'\''[0-9]+\.[0-9]+\.[0-9]+'\''/ {
      sub(/version:[[:space:]]*'\''[0-9]+\.[0-9]+\.[0-9]+'\''/, "version: '\''" new "'\''")
      done = 1
    }
    { print }
  ' "$JS_FILE" > "$JS_FILE.tmp" && mv "$JS_FILE.tmp" "$JS_FILE"
fi

# ── 2. CHANGELOG entry ──────────────────────────────────────────────
echo "[2/7] prepending CHANGELOG.md entry for [${NEW}]"
TODAY=$(date +%Y-%m-%d)
if [[ -n "$MESSAGE" ]]; then
  ENTRY="## [${NEW}] – ${TODAY}

### Changed
- ${MESSAGE}

"
else
  ENTRY="## [${NEW}] – ${TODAY}

### Changed
- TODO: describe what changed in v${NEW}

"
fi

if (( DRY_RUN )); then
  printf '  [dry-run] would prepend:\n%s\n' "$ENTRY" | sed 's/^/    /'
else
  # Insert ENTRY just before the first existing "## [" line.
  # awk -v can't carry newline-containing strings cleanly, so feed ENTRY via
  # a temp file and read it inside awk on the first match.
  ENTRY_FILE=$(mktemp)
  printf '%s' "$ENTRY" > "$ENTRY_FILE"
  TMP=$(mktemp)
  awk -v ef="$ENTRY_FILE" '
    function emit_entry(   line) {
      while ((getline line < ef) > 0) print line
      close(ef)
    }
    BEGIN { inserted=0 }
    /^## \[/ && !inserted { emit_entry(); inserted=1 }
    { print }
    END { if (!inserted) { print ""; emit_entry() } }
  ' "$CHANGELOG" > "$TMP" && mv "$TMP" "$CHANGELOG"
  rm -f "$ENTRY_FILE"
fi

# ── 3. open editor for polish ───────────────────────────────────────
if (( ! YES && ! DRY_RUN )); then
  echo "[3/7] opening ${CHANGELOG} in \${EDITOR:-vi} (save & quit to continue, abort with ctrl-c)"
  "${EDITOR:-vi}" "$CHANGELOG"
else
  echo "[3/7] skipping editor (-y or --dry-run)"
fi

# ── 4. own repo: commit + push ──────────────────────────────────────
SUBJECT="${MESSAGE:-v${NEW}}"
echo "[4/7] commit + push to own repo (subject: v${NEW}: ${SUBJECT})"
run git add "${JS_FILE}" "${CHANGELOG}"
run git commit -m "v${NEW}: ${SUBJECT}"
if (( ! YES && ! DRY_RUN )); then
  echo "  → ready to push to origin/main (release.yml will auto-tag + release)"
  read -r -p "  press Enter to push, Ctrl-C to abort: " _
fi
run git push origin main

# ── 5. fork workdir locate ──────────────────────────────────────────
if (( SKIP_FORK )); then
  echo "[5/7] --skip-fork: not touching blockbench-plugins fork"
  echo
  echo "Done. v${NEW} pushed to own repo."
  echo "release.yml will create the GitHub Release shortly."
  exit 0
fi

WORK="${FORK_WORKDIR:-}"
if [[ -z "$WORK" && -f /tmp/bbplugin_workdir ]]; then
  WORK=$(cat /tmp/bbplugin_workdir)
fi
if [[ -z "$WORK" || ! -d "$WORK" ]]; then
  echo
  echo "warning: fork workdir not found."
  echo "  set FORK_WORKDIR to your local clone of <user>/blockbench-plugins,"
  echo "  or write its path to /tmp/bbplugin_workdir, then re-run with"
  echo "  $0 ${PART} --skip-fork  to acknowledge."
  echo
  echo "Own-repo release succeeded (v${NEW}). Skipping fork step."
  exit 0
fi

echo "[5/7] fork workdir: ${WORK}"

# ── 6. sync plugin file + plugins.json version, validate ────────────
echo "[6/7] copy ${JS_FILE} into fork & bump plugins.json"
run cp "${REPO_ROOT}/${JS_FILE}" "${WORK}/plugins/${PLUGIN_ID}/${JS_FILE}"
if (( DRY_RUN )); then
  printf '  [dry-run] would rewrite plugins.json: %s → %s for "%s"\n' "$CURRENT" "$NEW" "$PLUGIN_ID"
else
  python3 - "$WORK/plugins.json" "$PLUGIN_ID" "$CURRENT" "$NEW" <<'PY'
import sys, re
p, pid, cur, new = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
with open(p) as f: c = f.read()
pat = r'("' + re.escape(pid) + r'":\s*\{[^}]*"version":\s*")' + re.escape(cur) + r'(")'
new_c = re.sub(pat, r'\g<1>' + new + r'\g<2>', c, count=1, flags=re.DOTALL)
if new_c == c:
    print(f"ERROR: no replacement made in plugins.json for {pid} version {cur}", file=sys.stderr)
    sys.exit(1)
with open(p, 'w') as f: f.write(new_c)
print(f"  plugins.json: {pid} {cur} -> {new}")
PY
fi

echo "  → validating"
if (( DRY_RUN )); then
  printf '  [dry-run] would run: npm run validate %s\n' "$PLUGIN_ID"
else
  (cd "$WORK" && npm run validate "$PLUGIN_ID" 2>&1 | tail -3)
fi

# ── 7. fork: commit + push ──────────────────────────────────────────
echo "[7/7] commit + push to fork branch ${FORK_BRANCH}"
run git -C "${WORK}" add plugins.json "plugins/${PLUGIN_ID}/${JS_FILE}"
run git -C "${WORK}" commit -m "sb_worn_display: v${NEW} — ${SUBJECT}"
if (( ! YES && ! DRY_RUN )); then
  echo "  → ready to push to fork (PR #914 will auto-update)"
  read -r -p "  press Enter to push, Ctrl-C to abort: " _
fi
run git -C "${WORK}" push origin "${FORK_BRANCH}"

echo
echo "Done. v${NEW} pushed to both own repo and fork."
echo "  - own repo release: https://github.com/hrmcngs/sb-worn-display-blockbench/releases/tag/v${NEW}"
echo "  - PR #914: https://github.com/JannisX11/blockbench-plugins/pull/914"
