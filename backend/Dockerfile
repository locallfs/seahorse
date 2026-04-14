FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc tsconfig.json ./

RUN npm install --production=false

COPY . .

RUN node_modules/.bin/tsc --outDir . --rootDir . --module commonjs medusa.config.ts && mv medusa.config.js medusa-config.js

EXPOSE 9000

CMD ["node_modules/.bin/medusa", "start"]
