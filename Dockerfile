FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libasound2 libxrandr2 libxkbcommon0 \
    libxfixes3 libxcomposite1 libxdamage1 libgbm1 libatk-bridge2.0-0 \
    libcups2 libpango-1.0-0 libcairo2 ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
COPY public ./public
COPY scripts/build-share.mjs ./scripts/build-share.mjs
RUN node scripts/build-share.mjs && npx remotion browser ensure && HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes browser ensure \
    && ln -s "$(HYPERFRAMES_NO_TELEMETRY=1 npx hyperframes browser path)" /usr/local/bin/hyperframes-chrome \
    && chmod -R a+rX /root/.cache/hyperframes && chmod a+x /root && npm prune --omit=dev
COPY server ./server
COPY dist ./dist
ENV NODE_ENV=production PORT=8080 HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_BROWSER_PATH=/usr/local/bin/hyperframes-chrome
USER node
CMD ["node", "--import", "tsx", "server/index.ts"]
