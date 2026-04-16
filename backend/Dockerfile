FROM node:20

WORKDIR /app

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

RUN DATABASE_URL=postgresql://localhost/dummy \
    JWT_SECRET=build \
    COOKIE_SECRET=build \
    MEDUSA_BACKEND_URL=https://seahorse-production.up.railway.app \
    node_modules/.bin/medusa build 2>&1

RUN cp medusa-config.js .medusa/server/medusa-config.js && \
    cp package.json .medusa/server/package.json && \
    mkdir -p .medusa/server/src/modules && \
    cp -r src/modules/file-bunny .medusa/server/src/modules/file-bunny && \
    cp -r src/modules/notification-klaviyo .medusa/server/src/modules/notification-klaviyo && \
    ln -s /app/node_modules /app/.medusa/server/node_modules

WORKDIR /app/.medusa/server

EXPOSE 9000

CMD ["sh", "-c", "node_modules/.bin/medusa db:migrate && node_modules/.bin/medusa start"]
