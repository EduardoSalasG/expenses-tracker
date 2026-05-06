FROM node:22-alpine AS build

WORKDIR /app

RUN npm install -g pnpm@10.12.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend frontend

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @expenses-tracker/frontend build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
