#!/usr/bin/env bash
# Bump the plugin version field in sb_worn_display.js.
#
# Usage: ./scripts/bump-version.sh patch|minor|major
#
# After this:
#   1. Edit CHANGELOG.md to add a new section for the bumped version
#   2. git add + commit + push to main
#   3. .github/workflows/release.yml will tag and create a GitHub Release
#   4. Blockbench will auto-update users on their next launch
set -euo pipefail

cd "$(dirname "$0")/.."

PART="${1:-}"
if [[ ! "$PART" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 patch|minor|major" >&2
  exit 1
fi

FILE="sb_worn_display.js"
CURRENT=$(grep -oE "version:\s*'[^']+'" "$FILE" | head -1 | sed -E "s/version:[[:space:]]*'([^']+)'/\1/")
if ! [[ "$CURRENT" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "error: current version '$CURRENT' is not semver" >&2
  exit 1
fi
MAJOR="${BASH_REMATCH[1]}"
MINOR="${BASH_REMATCH[2]}"
PATCH="${BASH_REMATCH[3]}"

case "$PART" in
  patch) PATCH=$((PATCH + 1));;
  minor) MINOR=$((MINOR + 1)); PATCH=0;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0;;
esac
NEW="${MAJOR}.${MINOR}.${PATCH}"

# Replace the FIRST version: '...' occurrence (the manifest one) — use awk to
# avoid sed's BSD/GNU differences.
awk -v new="$NEW" '
  !done && /version:[[:space:]]*'\''[0-9]+\.[0-9]+\.[0-9]+'\''/ {
    sub(/version:[[:space:]]*'\''[0-9]+\.[0-9]+\.[0-9]+'\''/, "version: '\''" new "'\''")
    done = 1
  }
  { print }
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

echo "Bumped: $CURRENT  ->  $NEW"
echo
echo "Next steps:"
echo "  1. Add a '## [$NEW] – $(date +%Y-%m-%d)' section to CHANGELOG.md"
echo "  2. git add sb_worn_display.js CHANGELOG.md"
echo "  3. git commit -m \"v$NEW\""
echo "  4. git push origin main   # triggers release workflow"
