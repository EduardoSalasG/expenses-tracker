FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN pnpm install --frozen-lockfile

COPY backend backend
COPY database database

RUN pnpm --filter @expenses-tracker/backend build
RUN pnpm --filter @expenses-tracker/backend deploy --prod --legacy /prod/backend

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache ca-certificates

COPY --from=build /prod/backend ./
COPY --from=build /app/database ./database

EXPOSE 3000

CMD ["node", "dist/main.js"]
