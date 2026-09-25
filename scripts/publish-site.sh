#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -n "${BWTR_LOCAL_CANDIDATE:-}" ]]; then
  echo 'Local candidate mode cannot be used for publication.' >&2
  exit 2
fi

for required_variable in \
  BWTR_BUCKET \
  BWTR_DISTRIBUTION \
  BWTR_ARTIFACT \
  BWTR_ROLLBACK_ARTIFACT \
  BWTR_SITE_BASE_URL; do
  if [[ -z "${!required_variable:-}" ]]; then
    echo "missing required environment variable: ${required_variable}" >&2
    exit 2
  fi
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bucket="${BWTR_BUCKET}"
distribution="${BWTR_DISTRIBUTION}"
artifact="${BWTR_ARTIFACT}"
rollback_artifact="${BWTR_ROLLBACK_ARTIFACT}"
site_base_url="${BWTR_SITE_BASE_URL}"
site_base_url="${site_base_url%/}"

case "${site_base_url}" in
  https://*) ;;
  *) echo "BWTR_SITE_BASE_URL must be an https URL" >&2; exit 2 ;;
esac

test -d "${artifact}"
test -d "${rollback_artifact}"

should_inject_failure() {
  local phase="$1"
  case ",${BWTR_INJECT_FAILURE_PHASES:-}," in
    *",${phase},"*) return 0 ;;
    *) return 1 ;;
  esac
}

run_phase() {
  local phase="$1"
  shift
  if should_inject_failure "${phase}"; then
    echo "Injected deployment failure: ${phase}" >&2
    return 97
  fi
  "$@"
}

invalidate_and_wait() {
  local purpose="$1"
  local invalidation_id
  local create_status=0
  invalidation_id="$(run_phase "${purpose}-invalidation-create" aws cloudfront create-invalidation \
    --distribution-id "${distribution}" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)" || create_status=$?
  if [[ ${create_status} -ne 0 ]]; then
    return "${create_status}"
  fi
  run_phase "${purpose}-invalidation-wait" aws cloudfront wait invalidation-completed \
    --distribution-id "${distribution}" \
    --id "${invalidation_id}"
}

# The edge route may already point /platform/ at /architecture/. Validate the actual S3
# snapshot and its content-addressed dependencies—not a potentially cached viewer response—
# before any release object is changed.
run_phase "snapshot-validation" node "${script_dir}/validate-rollback-artifact.mjs" \
  "${rollback_artifact}"

rollback() {
  local exit_code=$?
  trap - ERR
  set +e
  echo "Publish failed; restoring the pre-release site snapshot."
  local restore_status=0
  run_phase "rollback-restore" aws s3 cp "${rollback_artifact}" "s3://${bucket}" \
    --recursive \
    --exclude "assets/videos/*" \
    --cache-control "no-cache" || restore_status=$?
  invalidate_and_wait "rollback"
  local invalidation_status=$?
  if [[ ${restore_status} -ne 0 || ${invalidation_status} -ne 0 ]]; then
    echo "Automatic rollback was incomplete; manual recovery is required." >&2
  fi
  exit "${exit_code}"
}
trap rollback ERR

# Publish content-addressed dependencies first, supporting documents second, and the
# homepage entry point last. Superseded objects are retained through the soak window.
run_phase "immutable-upload" aws s3 cp "${artifact}" "s3://${bucket}" \
  --recursive \
  --exclude "*" \
  --include "styles.*.css" \
  --include "script.*.js" \
  --include "assets/site-ui/*" \
  --cache-control "public, max-age=31536000, immutable"
run_phase "public-assets-upload" aws s3 cp "${artifact}/assets" "s3://${bucket}/assets" \
  --recursive \
  --exclude "videos/*" \
  --exclude "site-ui/*" \
  --cache-control "no-cache"
run_phase "supporting-upload" aws s3 cp "${artifact}" "s3://${bucket}" \
  --recursive \
  --exclude "assets/videos/*" \
  --exclude "index.html" \
  --exclude "styles.*.css" \
  --exclude "script.*.js" \
  --exclude "assets/*" \
  --cache-control "no-cache"
run_phase "homepage-switch" aws s3 cp "${artifact}/index.html" "s3://${bucket}/index.html" \
  --content-type "text/html" \
  --cache-control "no-cache"

invalidate_and_wait "publish"

verification_body="${RUNNER_TEMP:-/tmp}/bwtr-site-verification.html"
run_phase "smoke-home" curl -fsS --output "${verification_body}" "${site_base_url}/"
grep -F "Understand exposure across connected operations." "${verification_body}" >/dev/null
grep -F "See what the connection is based on." "${verification_body}" >/dev/null
run_phase "smoke-products" curl -fsS --output "${verification_body}" "${site_base_url}/products/"
grep -F "Put security findings in operational context." \
  "${verification_body}" >/dev/null
run_phase "smoke-architecture" curl -fsS --output "${verification_body}" \
  "${site_base_url}/architecture/"
grep -F "How Breakwater connects to your environment." "${verification_body}" >/dev/null

# Verify exact released documents and UI bytes, not merely a matching headline.
while IFS= read -r relative_path; do
  case "${relative_path}" in
    index.html) public_path="/" ;;
    platform/index.html) continue ;; # CloudFront intentionally redirects this route.
    */index.html) public_path="/${relative_path%index.html}" ;;
    *) public_path="/${relative_path}" ;;
  esac
  run_phase "smoke-release" curl -fsS --output "${verification_body}" "${site_base_url}${public_path}"
  cmp "${verification_body}" "${artifact}/${relative_path}"
done < <(node -e 'const fs=require("fs"); const m=JSON.parse(fs.readFileSync(process.argv[1]+"/asset-manifest.json")); function walk(d,p=""){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory())walk(d+"/"+e.name,p+e.name+"/");else if(e.name.endsWith(".html")) console.log(p+e.name)}} walk(process.argv[1]); console.log(Object.values(m).join("\n"))' "${artifact}")

cache_headers="${RUNNER_TEMP:-/tmp}/bwtr-site-cache-headers.txt"
for cache_url in \
  "${site_base_url}/"; do
  run_phase "cache-unversioned" curl -fsSI --output "${cache_headers}" "${cache_url}"
  grep -qi '^cache-control: no-cache' "${cache_headers}"
done
for revisioned_asset in $(node -e 'const manifest=require(process.argv[1]); console.log(Object.values(manifest).join(" "))' "${artifact}/asset-manifest.json"); do
  run_phase "cache-revisioned" curl -fsSI --output "${cache_headers}" \
    "${site_base_url}/${revisioned_asset}"
  grep -qi '^cache-control: public, max-age=31536000, immutable' "${cache_headers}"
done
for image in \
  infrastructure-substation.jpg \
  infrastructure-airport.jpg \
  infrastructure-utility-worker.jpg \
  infrastructure-hmi.jpg \
  product-demo-poster.jpg; do
  target="${RUNNER_TEMP:-/tmp}/${image}"
  run_phase "image-download" curl -fsS --output "${target}" \
    "${site_base_url}/assets/${image}"
  test "$(wc -c < "${target}")" -gt 10000
  run_phase "image-headers" curl -fsSI --output "${cache_headers}" \
    "${site_base_url}/assets/${image}"
  grep -qi '^content-type: image/jpeg' "${cache_headers}"
  grep -qi '^cache-control: no-cache' "${cache_headers}"
done

trap - ERR
