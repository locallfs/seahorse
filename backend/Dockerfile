FROM node:20

WORKDIR /app

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

RUN DISABLE_MEDUSA_ADMIN=true \
    DATABASE_URL=postgresql://localhost/dummy \
    JWT_SECRET=build \
    COOKIE_SECRET=build \
    node_modules/.bin/medusa build 2>&1

RUN cp medusa-config.js .medusa/server/medusa-config.js && \
    cp package.json .medusa/server/package.json

WORKDIR /app/.medusa/server

RUN npm install --production=false

EXPOSE 9000
