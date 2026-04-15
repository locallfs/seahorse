FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

ENV ADMIN_ENABLED=true
RUN NODE_OPTIONS=--max-old-space-size=4096 node_modules/.bin/medusa build

EXPOSE 9000

CMD ["node_modules/.bin/medusa", "start"]
