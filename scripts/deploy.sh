#!/usr/bin/env bash
# Deploy dist/ to howtoyoutube.dev. Credentials are leased from agent-secrets
# into this process only; nothing is written to disk or printed.
set -euo pipefail
cd "$(dirname "$0")/.."
CLOUDFLARE_ACCOUNT_ID="$(secrets lease wzrrd::cloudflare_account_id --ttl 1h --client-id howtoyoutube)"
CLOUDFLARE_API_TOKEN="$(secrets lease wzrrd::cloudflare_api_token --ttl 1h --client-id howtoyoutube)"
export CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN
exec ./node_modules/.bin/alchemy deploy --stage "${STAGE:-prod}" --yes --no-input "$@"
