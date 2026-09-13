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
  "${site_artifact_dir}/architecture" \
  "${site_artifact_dir}/products" \
  "${site_artifact_dir}/research" \
  "${site_artifact_dir}/security" \
  "${site_artifact_dir}/airports" \
  "${site_artifact_dir}/power-utilities" \
  "${site_artifact_dir}/connected-industry" \
  "${site_artifact_dir}/healthcare"

cp index.html 404.html robots.txt script.js sitemap.xml styles.css "${site_artifact_dir}/"
cp .well-known/security.txt "${site_artifact_dir}/.well-known/"
cp about/index.html "${site_artifact_dir}/about/"
cp platform/index.html "${site_artifact_dir}/platform/"
cp architecture/index.html "${site_artifact_dir}/architecture/"
cp products/index.html "${site_artifact_dir}/products/"
cp research/index.html "${site_artifact_dir}/research/"
cp security/index.html "${site_artifact_dir}/security/"
cp airports/index.html "${site_artifact_dir}/airports/"
cp power-utilities/index.html "${site_artifact_dir}/power-utilities/"
cp connected-industry/index.html "${site_artifact_dir}/connected-industry/"
cp healthcare/index.html "${site_artifact_dir}/healthcare/"
cp assets/*.jpg assets/*.png "${site_artifact_dir}/assets/"
node scripts/hash-site-assets.mjs "${site_artifact_dir}"
