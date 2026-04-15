FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

RUN node_modules/.bin/medusa build

EXPOSE 9000

CMD ["node_modules/.bin/medusa", "start"]
