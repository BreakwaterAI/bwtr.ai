#!/usr/bin/env bash
set -euo pipefail

site_artifact_dir="${1:-}"
if [[ -z "${site_artifact_dir}" || "${site_artifact_dir}" == "/" || -e "${site_artifact_dir}" ]]; then
  echo "usage: $0 NEW_ARTIFACT_DIRECTORY" >&2
  exit 2
fi

mkdir -p \
  "${site_artifact_dir}/.well-known" \
  "${site_artifact_dir}/assets" \
  "${site_artifact_dir}/about" \
  "${site_artifact_dir}/platform" \
  "${site_artifact_dir}/products" \
  "${site_artifact_dir}/research" \
  "${site_artifact_dir}/security"

cp index.html 404.html robots.txt script.js sitemap.xml styles.css "${site_artifact_dir}/"
cp .well-known/security.txt "${site_artifact_dir}/.well-known/"
cp about/index.html "${site_artifact_dir}/about/"
cp platform/index.html "${site_artifact_dir}/platform/"
cp products/index.html "${site_artifact_dir}/products/"
cp research/index.html "${site_artifact_dir}/research/"
cp security/index.html "${site_artifact_dir}/security/"
cp assets/*.jpg assets/*.png "${site_artifact_dir}/assets/"
