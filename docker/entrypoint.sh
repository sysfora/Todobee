#!/bin/sh
set -e
if [ ! -f /app/web/server.js ]; then
  echo "Next.js standalone server.js was not found" >&2
  exit 1
fi
cd /app/web
PORT=3000 HOSTNAME=127.0.0.1 node server.js &
cd /app/server
exec node --import tsx src/index.ts
