FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY src ./src
COPY public ./public
COPY tsconfig.json postcss.config.mjs ./
COPY demo ./demo
RUN cp -a /app/public /app/demo/public && ln -s /app/node_modules /app/demo/node_modules
ENV NEXT_PUBLIC_DEMO=1
ENV NODE_ENV=production
WORKDIR /app/demo
RUN node ./node_modules/next/dist/bin/next build
ENV PORT=5000
ENV HOSTNAME=0.0.0.0
EXPOSE 5000
CMD ["node", "./node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "5000"]
