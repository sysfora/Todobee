FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY src ./src
COPY public ./public
COPY next.config.ts tsconfig.json postcss.config.mjs ./
RUN npm run build

FROM node:22-bookworm-slim AS server
WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install
COPY server ./

FROM node:22-bookworm-slim AS demo
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY src ./src
COPY public ./public
COPY tsconfig.json postcss.config.mjs ./
COPY demo ./demo
ENV NEXT_PUBLIC_DEMO=1
WORKDIR /app/demo
RUN node /app/node_modules/next/dist/bin/next build \
  && SERVER=$(find .next/standalone \( -path '*/node_modules/*' -o -path '*/.next/*' \) -prune -o -name server.js -type f -print | head -n 1) \
  && test -n "$SERVER" \
  && DIR=$(dirname "$SERVER") \
  && mkdir -p "$DIR/.next" \
  && cp -a .next/static "$DIR/.next/static" \
  && cp -a /app/public "$DIR/public" \
  && printf '%s\n' "${SERVER#.next/standalone/}" > .next/standalone/start-path

FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=web /app/.next/standalone /app/web
COPY --from=web /app/.next/static /app/web/.next/static
COPY --from=web /app/public /app/web/public
COPY --from=server /app/server /app/server
COPY --from=demo /app/demo/.next/standalone /app/demo
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV NODE_ENV=production
ENV PUBLIC_PORT=3000
ENV PORT=3000
ENV PROXY_NEXT=1
ENV NEXT_ORIGIN=http://127.0.0.1:3001
ENV DEMO_PORT=5000
EXPOSE 3000 5000
CMD ["/entrypoint.sh"]
