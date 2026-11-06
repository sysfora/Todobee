#!/bin/sh
set -e
if [ ! -f /app/web/server.js ]; then
  echo "Next.js standalone server.js was not found" >&2
  exit 1
fi

# .env uses PORT=4000 for local API development. The published Docker port
# stays 3000 so a domain proxy always has a process on 0.0.0.0:3000.
# Next.js stays on 127.0.0.1 only; the API is the public gateway.
PUBLIC_PORT="${PUBLIC_PORT:-3000}"
INTERNAL_PORT=3001

cd /app/web
PORT="$INTERNAL_PORT" HOSTNAME=127.0.0.1 node server.js &
NEXT_PID=$!

ready=0
i=0
while [ "$i" -lt 50 ]; do
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "Next.js exited before listening on 127.0.0.1:$INTERNAL_PORT" >&2
    exit 1
  fi
  if node -e "fetch('http://127.0.0.1:${INTERNAL_PORT}/').then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
    ready=1
    break
  fi
  i=$((i + 1))
  sleep 0.2
done

if [ "$ready" -ne 1 ]; then
  echo "Next.js did not accept connections on 127.0.0.1:$INTERNAL_PORT" >&2
  exit 1
fi

cd /app/server
echo "Todobee is listening on 0.0.0.0:${PUBLIC_PORT}"
PORT="$PUBLIC_PORT" PROXY_NEXT=1 NEXT_ORIGIN="http://127.0.0.1:${INTERNAL_PORT}" exec node --import tsx src/index.ts
