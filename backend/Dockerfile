FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

EXPOSE 9000

CMD ["sh", "-c", "timeout 30 node_modules/.bin/medusa db:migrate; exec node_modules/.bin/medusa start"]
