#!/usr/bin/env bash
# Publishes dist/ to branch gh-pages using a git worktree (avoids git clone + hooks issues
# seen with the gh-pages npm package on some macOS / editor environments).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d "$ROOT/dist" ]]; then
  echo "dist/ missing. Run: npm run build" >&2
  exit 1
fi

WT="$ROOT/.gh-pages-worktree"
if [[ ! -f "$WT/.git" ]]; then
  git fetch origin gh-pages
  git worktree add -f "$WT" origin/gh-pages
fi

rsync -a --filter='protect .git' --delete "$ROOT/dist/" "$WT/"
cd "$WT"
git add -A
if git diff --staged --quiet; then
  echo "gh-pages: nothing to commit (already up to date with dist/)."
  exit 0
fi

git commit -m "Deploy: $(date -u +%Y-%m-%dT%H:%MZ)"
git push origin HEAD:gh-pages --force
