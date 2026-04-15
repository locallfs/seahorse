FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

ENV ADMIN_ENABLED=true
RUN DATABASE_URL=postgresql://localhost/dummy \
    JWT_SECRET=build \
    COOKIE_SECRET=build \
    NODE_OPTIONS=--max-old-space-size=4096 \
    node_modules/.bin/medusa build 2>&1

EXPOSE 9000

CMD ["node_modules/.bin/medusa", "start"]
