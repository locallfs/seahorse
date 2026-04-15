FROM node:20

WORKDIR /app

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

ENV MEDUSA_BACKEND_URL=https://seahorse-production.up.railway.app

RUN DATABASE_URL=postgresql://localhost/dummy \
    JWT_SECRET=build \
    COOKIE_SECRET=build \
    node_modules/.bin/medusa build 2>&1

WORKDIR /app/.medusa/server

RUN npm install --production=false

EXPOSE 9000
