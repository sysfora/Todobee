#!/bin/sh
set -e
if [ ! -f /app/web/server.js ]; then
  echo "Next.js standalone server.js was not found" >&2
  exit 1
fi

PUBLIC_PORT="${PORT:-3000}"
if [ "$PUBLIC_PORT" = "3000" ]; then
  INTERNAL_PORT=3001
else
  INTERNAL_PORT=3000
fi

cd /app/web
PORT="$INTERNAL_PORT" HOSTNAME=127.0.0.1 node server.js &

cd /app/server
PORT="$PUBLIC_PORT" PROXY_NEXT=1 NEXT_ORIGIN="http://127.0.0.1:$INTERNAL_PORT" exec node --import tsx src/index.ts
