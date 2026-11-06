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

DEMO_PORT="${DEMO_PORT:-5000}"
DEMO_SERVER=$(find /app/demo -name server.js -type f | head -n 1)
if [ -z "$DEMO_SERVER" ]; then
  echo "Demo server.js was not found" >&2
  exit 1
fi
DEMO_DIR=$(dirname "$DEMO_SERVER")
cd "$DEMO_DIR"
PORT="$DEMO_PORT" HOSTNAME=0.0.0.0 node server.js &
DEMO_PID=$!

demo_ready=0
i=0
while [ "$i" -lt 50 ]; do
  if ! kill -0 "$DEMO_PID" 2>/dev/null; then
    echo "Demo exited before listening on 0.0.0.0:$DEMO_PORT" >&2
    exit 1
  fi
  if node -e "fetch('http://127.0.0.1:${DEMO_PORT}/').then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
    demo_ready=1
    break
  fi
  i=$((i + 1))
  sleep 0.2
done

if [ "$demo_ready" -ne 1 ]; then
  echo "Demo did not accept connections on port $DEMO_PORT" >&2
  exit 1
fi
echo "Todobee demo is listening on 0.0.0.0:${DEMO_PORT}"

cd /app/server
echo "Todobee is listening on 0.0.0.0:${PUBLIC_PORT}"
PORT="$PUBLIC_PORT" PROXY_NEXT=1 NEXT_ORIGIN="http://127.0.0.1:${INTERNAL_PORT}" exec node --import tsx src/index.ts
