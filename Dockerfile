FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/core/package.json apps/core/package.json
COPY apps/surface-web/package.json apps/surface-web/package.json
COPY packages/context-schema/package.json packages/context-schema/package.json
RUN pnpm install --frozen-lockfile

COPY apps/core apps/core
COPY apps/surface-web apps/surface-web
COPY packages/context-schema packages/context-schema

# Baked into the static bundle at build time — the deployed Core's own
# public URL, since the surface and the API it talks to are now the same
# origin (see server.ts: the Core serves the surface's static build).
ARG VITE_CORE_HTTP_URL
ARG VITE_CORE_WS_URL
ENV VITE_CORE_HTTP_URL=${VITE_CORE_HTTP_URL}
ENV VITE_CORE_WS_URL=${VITE_CORE_WS_URL}

RUN pnpm --filter @pulse/surface-web build
RUN pnpm --filter @pulse/core build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "apps/core/dist/index.js"]
