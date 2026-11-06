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

FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=web /app/.next/standalone /app/web
COPY --from=web /app/.next/static /app/web/.next/static
COPY --from=web /app/public /app/web/public
COPY --from=server /app/server /app/server
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV NODE_ENV=production
ENV PUBLIC_PORT=3000
ENV PORT=3000
ENV PROXY_NEXT=1
ENV NEXT_ORIGIN=http://127.0.0.1:3001
EXPOSE 3000
CMD ["/entrypoint.sh"]
