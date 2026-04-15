# syntax=docker/dockerfile:1.6
FROM node:20-slim

WORKDIR /app

COPY package*.json .npmrc ./

RUN --mount=type=cache,id=npm,target=/root/.npm npm ci --production=false

COPY . .

RUN DATABASE_URL=postgresql://localhost/dummy \
    JWT_SECRET=build \
    COOKIE_SECRET=build \
    MEDUSA_BACKEND_URL=https://seahorse-production.up.railway.app \
    node_modules/.bin/medusa build 2>&1

RUN cp medusa-config.js .medusa/server/medusa-config.js && \
    cp package.json .medusa/server/package.json

WORKDIR /app/.medusa/server

RUN --mount=type=cache,id=npm,target=/root/.npm npm ci --production=false

EXPOSE 9000

CMD ["node_modules/.bin/medusa", "start"]
