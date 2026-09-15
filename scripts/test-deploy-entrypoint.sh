#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dirty_marker="${repo_root}/.deploy-entrypoint-test-dirty"

cleanup() {
  [[ -f "${dirty_marker}" ]] && rm -f "${dirty_marker}"
}
trap cleanup EXIT

cd "${repo_root}"

set +e
wrong_account_output="$(PATH="${repo_root}/scripts/test-fixtures:${PATH}" \
  BWTR_TEST_ACCOUNT_ID=000000000000 AWS_PROFILE=test \
  bash deploy/aws/deploy.sh check preview 2>&1)"
wrong_account_status=$?
set -e
test "${wrong_account_status}" -eq 2
grep -F "Refusing AWS account 000000000000; expected 506126099258." \
  <<<"${wrong_account_output}" >/dev/null

set +e
confirmation_output="$(AWS_PROFILE=test bash deploy/aws/deploy.sh publish production 2>&1)"
confirmation_status=$?
set -e
test "${confirmation_status}" -eq 2
grep -F "Production publication requires --confirm-production." \
  <<<"${confirmation_output}" >/dev/null

touch "${dirty_marker}"
set +e
dirty_output="$(AWS_PROFILE=test bash deploy/aws/deploy.sh publish preview 2>&1)"
dirty_status=$?
set -e
test "${dirty_status}" -eq 2
grep -F "Publication requires a clean main branch." <<<"${dirty_output}" >/dev/null

echo "Deployment entrypoint refusal tests passed."
