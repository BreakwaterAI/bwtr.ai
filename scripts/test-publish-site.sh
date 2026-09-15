#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture_root="$(mktemp -d)"
artifact="${fixture_root}/artifact"
rollback_artifact="${fixture_root}/rollback"
mock_bin="${fixture_root}/bin"
remote_state="${fixture_root}/remote-state"
test_log="${fixture_root}/commands.log"
test_output="${fixture_root}/output.log"

cleanup() {
  case "${fixture_root}" in
    /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*)
      [[ -d "${fixture_root}" ]] && rm -rf "${fixture_root}"
      ;;
  esac
}
trap cleanup EXIT

cd "${repo_root}"
bash scripts/build-site-artifact.sh "${artifact}"
mkdir -p "${rollback_artifact}/architecture" "${mock_bin}"
cp "${artifact}/architecture/index.html" "${rollback_artifact}/architecture/index.html"
for revisioned_asset in $(node -e 'const manifest=require(process.argv[1]); console.log(Object.values(manifest).join(" "))' "${artifact}/asset-manifest.json"); do
  cp "${artifact}/${revisioned_asset}" "${rollback_artifact}/${revisioned_asset}"
done

cp scripts/test-fixtures/aws "${mock_bin}/aws"
cp scripts/test-fixtures/curl "${mock_bin}/curl"
chmod +x "${mock_bin}/aws" "${mock_bin}/curl"

run_publish() {
  local injected_phases="${1:-}"
  : >"${test_log}"
  : >"${test_output}"
  printf 'baseline\n' >"${remote_state}"
  set +e
  PATH="${mock_bin}:${PATH}" \
    RUNNER_TEMP="${fixture_root}" \
    BWTR_BUCKET="test-bucket" \
    BWTR_DISTRIBUTION="TEST-DISTRIBUTION" \
    BWTR_ARTIFACT="${artifact}" \
    BWTR_ROLLBACK_ARTIFACT="${rollback_artifact}" \
    BWTR_SITE_BASE_URL="https://preview.example.test" \
    BWTR_TEST_LOG="${test_log}" \
    BWTR_TEST_REMOTE_STATE="${remote_state}" \
    BWTR_INJECT_FAILURE_PHASES="${injected_phases}" \
    bash scripts/publish-site.sh >"${test_output}" 2>&1
  publish_status=$?
  set -e
}

run_publish
test "${publish_status}" -eq 0
grep -qx 'published' "${remote_state}"
grep -q 'https://preview.example.test/' "${test_log}"
if grep -q 'https://www.bwtr.ai/' "${test_log}"; then
  echo "preview publication validated the live production hostname" >&2
  exit 1
fi
if grep -q 'restoring the pre-release site snapshot' "${test_output}"; then
  echo "successful publication unexpectedly invoked rollback" >&2
  exit 1
fi

for failure_phase in \
  immutable-upload \
  supporting-upload \
  homepage-switch \
  publish-invalidation-create \
  publish-invalidation-wait \
  smoke-home \
  smoke-products \
  smoke-architecture \
  cache-unversioned \
  cache-revisioned \
  image-download \
  image-headers; do
  run_publish "${failure_phase}"
  test "${publish_status}" -ne 0
  grep -q 'restoring the pre-release site snapshot' "${test_output}"
  grep -q 'aws s3 cp .*rollback' "${test_log}"
  grep -qx 'baseline' "${remote_state}"
  if grep -q 's3 sync\|--delete' "${test_log}"; then
    echo "${failure_phase}: rollback used a destructive sync" >&2
    exit 1
  fi
done

run_publish "supporting-upload,rollback-restore"
test "${publish_status}" -ne 0
grep -q 'Automatic rollback was incomplete; manual recovery is required.' "${test_output}"

run_publish "supporting-upload,rollback-invalidation-wait"
test "${publish_status}" -ne 0
grep -qx 'baseline' "${remote_state}"
grep -q 'Automatic rollback was incomplete; manual recovery is required.' "${test_output}"

run_publish "supporting-upload,rollback-invalidation-create"
test "${publish_status}" -ne 0
grep -qx 'baseline' "${remote_state}"
grep -q 'Automatic rollback was incomplete; manual recovery is required.' "${test_output}"

missing_dependency="$(node -e 'const manifest=require(process.argv[1]); console.log(manifest["script.js"])' "${artifact}/asset-manifest.json")"
mv "${rollback_artifact}/${missing_dependency}" "${fixture_root}/${missing_dependency}"
run_publish
test "${publish_status}" -ne 0
grep -q "rollback snapshot is missing ${missing_dependency}" "${test_output}"
if grep -q 'restoring the pre-release site snapshot' "${test_output}"; then
  echo "snapshot validation failure must stop before the rollback trap is armed" >&2
  exit 1
fi

echo "Publish state-machine tests passed, including injected release and rollback failures."
