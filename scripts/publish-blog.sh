#!/usr/bin/env bash
# One command for blog authors: build the Markdown, commit blog files, and push
# main. The existing GitHub Actions OIDC workflow publishes the built site.
set -Eeuo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -gt 1 || ( $# -eq 1 && "$1" != "--dry-run" ) ]]; then
  echo 'Usage: npm run publish-blog [-- --dry-run]' >&2
  exit 2
fi
dry_run="${1:-}"

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/bwtr-blog.XXXXXX")"
trap 'rm -rf "${work_dir}"' EXIT
artifact="${work_dir}/site"

bash scripts/build-site-artifact.sh "${artifact}"
node scripts/test-site-artifact.mjs "${artifact}"
node scripts/test-brand-contract.mjs --artifact "${artifact}"

if [[ "${dry_run}" == "--dry-run" ]]; then
  echo 'Blog built and validated locally; no commit or push was made.'
  exit 0
fi

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo 'Publishing requires the main branch.' >&2
  exit 2
fi
if [[ "$(git remote get-url origin)" != "https://github.com/BreakwaterAI/bwtr.ai.git" ]]; then
  echo 'Publishing requires the BreakwaterAI/bwtr.ai origin.' >&2
  exit 2
fi
if ! git diff --cached --quiet; then
  echo 'The Git index already has staged changes; clear them before publishing the blog.' >&2
  exit 2
fi
git fetch origin main
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo 'Local main must match origin/main before publishing.' >&2
  exit 2
fi

# The first publish also picks up the blog's one-time build integration. Later
# publishes stage only new or edited Markdown, unless the template changes.
git add -A -- \
  .gitignore package.json package-lock.json \
  blog/README.md blog/posts blog/assets blog/blog.css blog/blog.js \
  scripts/blog-public-files.mjs scripts/build-blog.mjs scripts/generate-social-cards.mjs \
  scripts/generate-hero-images.mjs \
  scripts/build-public-site.mjs scripts/build-site-artifact.sh \
  scripts/test-site-artifact.mjs scripts/publish-blog.sh
git diff --cached --check
if git diff --cached --quiet; then
  echo 'No blog changes to publish.'
  exit 0
fi

git commit -m "Publish Breakwater blog $(date -u +%Y-%m-%d)"
git push origin HEAD:main
echo 'Blog commit pushed. GitHub Actions will deploy it to www.bwtr.ai.'
