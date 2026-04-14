FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

ENV NODE_ENV=production
ENV NODE_OPTIONS="--trace-warnings --unhandled-rejections=throw"

EXPOSE 9000

CMD ["node_modules/.bin/medusa", "start"]
