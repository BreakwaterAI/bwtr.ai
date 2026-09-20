#!/usr/bin/env bash
set -euo pipefail
node "$(dirname "$0")/build-public-site.mjs" "${1:-}"
