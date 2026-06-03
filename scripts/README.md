# scripts/

Release tooling for the SB Worn Display Editor plugin.

## `release.sh` — semi-automatic end-to-end release

Wraps the full release flow into one command:

```bash
./scripts/release.sh patch -m "fix slider race condition"
```

### What it does (7 steps)

| # | Step | Notes |
|---|---|---|
| 1 | Bump version in `sb_worn_display.js` | `patch` / `minor` / `major` (semver) |
| 2 | Prepend a new `## [x.y.z]` section to `CHANGELOG.md` | Uses `-m "..."` if given; otherwise inserts a `TODO:` stub |
| 3 | Open `$EDITOR` on `CHANGELOG.md` for polishing | Skipped with `-y` or `--dry-run` |
| 4 | `git add` + `commit` + `push origin main` (own repo) | `release.yml` workflow auto-creates the GitHub Release + tag |
| 5 | Copy the plugin file into the fork workdir + bump `plugins.json` entry | Located via `$FORK_WORKDIR` or `/tmp/bbplugin_workdir` |
| 6 | Run `npm run validate <plugin-id>` in the fork | Fails fast if the entry is malformed |
| 7 | `git add` + `commit` + `push` to the fork branch | PR #914 (`add-sb-worn-display`) auto-updates |

### Flags

| Flag | Meaning |
|---|---|
| `-m "message"` | One-line summary. Becomes both the commit subject and the CHANGELOG bullet. If omitted, a `TODO:` placeholder is inserted and `$EDITOR` opens for you to fill it in. |
| `-y` | Non-interactive: skip the editor + skip the "press Enter to push" prompts. |
| `--skip-fork` | Don't touch the blockbench-plugins fork — release on own repo only. Useful when you don't have the fork checked out. |
| `--dry-run` | Print every step but execute nothing destructive. No file write, no git, no push. |

### Common patterns

```bash
# Casual: write a one-liner, then polish CHANGELOG in editor, then confirm push
./scripts/release.sh patch -m "fix slider race condition"

# Full automatic (CI-style): no editor, no confirm prompts
./scripts/release.sh minor -m "add foo feature" -y

# Preview only — nothing is written or pushed
./scripts/release.sh patch -m "test" --dry-run

# Only release on own repo, skip the blockbench-plugins PR sync
./scripts/release.sh patch -m "wip fix" --skip-fork
```

### Fork workdir resolution

The script needs a local clone of `<your-user>/blockbench-plugins` (the fork) to keep PR #914 in sync. It tries, in order:

1. `$FORK_WORKDIR` environment variable.
2. The path written inside `/tmp/bbplugin_workdir` (the file used by the in-conversation flow when working with Claude).
3. If neither resolves to an existing directory, prints a warning and acts as if `--skip-fork` was passed.

So both of these work:

```bash
FORK_WORKDIR=~/code/blockbench-plugins-fork ./scripts/release.sh patch -m "fix"

# or
echo "/Users/me/code/blockbench-plugins-fork" > /tmp/bbplugin_workdir
./scripts/release.sh patch -m "fix"
```

### Environment variables

| Var | Default | Purpose |
|---|---|---|
| `FORK_WORKDIR` | (unset) | Absolute path to local clone of `<user>/blockbench-plugins`. |
| `PLUGIN_ID` | `sb_worn_display` | Used for the `plugins.json` entry key and the directory under `plugins/`. |
| `FORK_BRANCH` | `add-sb-worn-display` | Branch in the fork that PR #914 is built from. |
| `EDITOR` | `vi` | Used in step 3 to open `CHANGELOG.md`. Set to `code -w`, `nano`, etc. as you prefer. |

## `bump-version.sh` — version-only bump

Just bumps the version field in `sb_worn_display.js`. Doesn't touch the CHANGELOG, doesn't commit, doesn't push. Use this when you want to write the CHANGELOG entry manually or stage multiple changes before committing.

```bash
./scripts/bump-version.sh patch
# then edit CHANGELOG.md, git add ..., git commit, git push by hand
```

For most cases, prefer `release.sh` — it does this plus everything else.

## Workflow integration

After step 4 of `release.sh` (push to own repo's `main`), the following GitHub Actions kick in automatically:

- **`.github/workflows/ci.yml`** — syntax + manifest lint on every push.
- **`.github/workflows/release.yml`** — when `sb_worn_display.js` changes on `main`, extracts the new version, creates a `v{version}` tag, and publishes a GitHub Release with `sb_worn_display.js` attached. The release notes are extracted from the matching `## [{version}]` section in `CHANGELOG.md`.

URL-installed users (those who installed via `File → Plugins → Load Plugin from URL` with `https://raw.githubusercontent.com/hrmcngs/sb-worn-display-blockbench/main/sb_worn_display.js`) will be prompted to update on their next Blockbench launch, because Blockbench compares the `version:` field in the served JS against the locally installed version.

After step 7 (push to fork), PR #914 against `JannisX11/blockbench-plugins` auto-updates with the new plugin + new `plugins.json` version. Once a maintainer merges, the new version becomes available in Blockbench's in-app "Available plugins" store.
