#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -n "${BWTR_LOCAL_CANDIDATE:-}" ]]; then
  echo 'Local candidate mode cannot be used for deployment.' >&2
  exit 2
fi

readonly EXPECTED_ACCOUNT_ID="506126099258"
readonly REGION="us-east-1"
readonly BUCKET_NAME="bwtr-ai-site-prod-506126099258"
readonly DISTRIBUTION_ID="E173Y881SRDFT0"
readonly CLOUDFRONT_DOMAIN="d363eyllse1zcb.cloudfront.net"
readonly CERTIFICATE_ARN="arn:aws:acm:us-east-1:506126099258:certificate/3ba2f2a9-fb4e-44a9-a9ae-fa6456fbaff4"
readonly SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd "${SCRIPT_ROOT}/../.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  AWS_PROFILE=breakwater-prod deploy/aws/deploy.sh check preview
  AWS_PROFILE=breakwater-prod deploy/aws/deploy.sh publish preview
  AWS_PROFILE=breakwater-prod deploy/aws/deploy.sh check production
  AWS_PROFILE=breakwater-prod deploy/aws/deploy.sh publish production --confirm-production

This command publishes site content only. It never changes CloudFront configuration,
Route 53, ACM, Google Workspace records, or any product application.
EOF
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage >&2
  exit 2
fi

readonly OPERATION="$1"
readonly TARGET="$2"
readonly CONFIRMATION="${3:-}"

case "${OPERATION}" in
  check|publish) ;;
  *) usage >&2; exit 2 ;;
esac

case "${TARGET}" in
  preview)
    readonly SITE_BASE_URL="https://${CLOUDFRONT_DOMAIN}"
    readonly EXPECTED_ALIASES=""
    ;;
  production)
    readonly SITE_BASE_URL="https://www.bwtr.ai"
    readonly EXPECTED_ALIASES="bwtr.ai,www.bwtr.ai"
    ;;
  *) usage >&2; exit 2 ;;
esac

if [[ "${OPERATION}" == "publish" && "${TARGET}" == "production" && "${CONFIRMATION}" != "--confirm-production" ]]; then
  echo "Production publication requires --confirm-production." >&2
  exit 2
fi
if [[ -n "${CONFIRMATION}" && "${CONFIRMATION}" != "--confirm-production" ]]; then
  usage >&2
  exit 2
fi

: "${AWS_PROFILE:?Set AWS_PROFILE to the intended Breakwater production profile}"
command -v aws >/dev/null
command -v curl >/dev/null
command -v git >/dev/null
command -v node >/dev/null

cd "${REPO_ROOT}"

if [[ "${OPERATION}" == "publish" ]]; then
  if [[ "$(git branch --show-current)" != "main" || -n "$(git status --porcelain)" ]]; then
    echo "Publication requires a clean main branch." >&2
    exit 2
  fi
  readonly REMOTE_MAIN="$(git ls-remote --exit-code origin refs/heads/main | awk '{print $1}')"
  readonly LOCAL_HEAD="$(git rev-parse HEAD)"
  if [[ "${LOCAL_HEAD}" != "${REMOTE_MAIN}" ]]; then
    echo "Publication requires local HEAD to equal origin/main." >&2
    exit 2
  fi
fi

readonly ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
if [[ "${ACCOUNT_ID}" != "${EXPECTED_ACCOUNT_ID}" ]]; then
  echo "Refusing AWS account ${ACCOUNT_ID}; expected ${EXPECTED_ACCOUNT_ID}." >&2
  exit 2
fi

readonly WORK_ROOT="$(mktemp -d)"
cleanup() {
  case "${WORK_ROOT}" in
    /tmp/*|/private/tmp/*|/var/folders/*|/private/var/folders/*)
      [[ -d "${WORK_ROOT}" ]] && rm -rf "${WORK_ROOT}"
      ;;
  esac
}
trap cleanup EXIT

readonly DISTRIBUTION_JSON="${WORK_ROOT}/distribution.json"
aws cloudfront get-distribution --id "${DISTRIBUTION_ID}" >"${DISTRIBUTION_JSON}"
node deploy/aws/validate-target.mjs \
  "${DISTRIBUTION_JSON}" \
  "${TARGET}" \
  "${CLOUDFRONT_DOMAIN}" \
  "${BUCKET_NAME}.s3.${REGION}.amazonaws.com" \
  "${CERTIFICATE_ARN}"

aws s3api get-bucket-location --bucket "${BUCKET_NAME}" >/dev/null

node scripts/test-brand-contract.mjs
node scripts/test-canonical-urls.mjs
node scripts/test-homepage-content.mjs
node scripts/test-positioning.mjs
node scripts/test-deployment-target.mjs
bash scripts/test-publish-site.sh
bash scripts/test-deploy-entrypoint.sh
git diff --check

readonly ARTIFACT="${WORK_ROOT}/site"
bash scripts/build-site-artifact.sh "${ARTIFACT}"
node scripts/test-site-artifact.mjs "${ARTIFACT}"
node scripts/test-brand-contract.mjs --artifact "${ARTIFACT}"
BWTR_ARTIFACT="${ARTIFACT}" node scripts/test-rendered-layout.mjs
node scripts/verify-release-media.mjs "${SITE_BASE_URL}"

if [[ "${OPERATION}" == "check" ]]; then
  printf 'READY target=%s account=%s distribution=%s url=%s\n' \
    "${TARGET}" "${ACCOUNT_ID}" "${DISTRIBUTION_ID}" "${SITE_BASE_URL}"
  exit 0
fi

readonly ROLLBACK_ARTIFACT="${WORK_ROOT}/rollback"
mkdir -p "${ROLLBACK_ARTIFACT}"
aws s3 sync "s3://${BUCKET_NAME}" "${ROLLBACK_ARTIFACT}" \
  --region "${REGION}" \
  --exclude "assets/videos/*"

AWS_REGION="${REGION}" \
BWTR_BUCKET="${BUCKET_NAME}" \
BWTR_DISTRIBUTION="${DISTRIBUTION_ID}" \
BWTR_ARTIFACT="${ARTIFACT}" \
BWTR_ROLLBACK_ARTIFACT="${ROLLBACK_ARTIFACT}" \
BWTR_SITE_BASE_URL="${SITE_BASE_URL}" \
bash scripts/publish-site.sh

printf 'PUBLISHED commit=%s target=%s account=%s distribution=%s url=%s\n' \
  "$(git rev-parse HEAD)" "${TARGET}" "${ACCOUNT_ID}" "${DISTRIBUTION_ID}" "${SITE_BASE_URL}"
