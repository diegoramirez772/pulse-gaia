FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/core/package.json apps/core/package.json
COPY packages/context-schema/package.json packages/context-schema/package.json
RUN pnpm install --frozen-lockfile

COPY apps/core apps/core
COPY packages/context-schema packages/context-schema
RUN pnpm --filter @pulse/core build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "apps/core/dist/index.js"]
