#!/bin/sh
# Serve the list-editing POC on a public Cloudflare quick-tunnel URL (no account, no sign-in).
# Prints the URL; open /#/v/poc-ticker-list, /#/v/poc-ticker-beat, and /#/v/ticker-flashsale (original).
set -e
cd "$(dirname "$0")/../.."
PORT=${PORT:-5190}
POC_PUBLIC=1 BASE=/ npx vite --host 0.0.0.0 --port "$PORT" --strictPort &
trap 'kill $! 2>/dev/null' EXIT
cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT"
