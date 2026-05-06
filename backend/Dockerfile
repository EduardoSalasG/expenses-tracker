FROM node:22-alpine AS build

WORKDIR /app

RUN npm install -g pnpm@10.12.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend backend
COPY frontend/package.json frontend/package.json

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @expenses-tracker/backend build
RUN pnpm deploy --filter @expenses-tracker/backend --prod --legacy /prod/backend

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /prod/backend ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
