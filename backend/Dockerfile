FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm install --production=false

RUN node_modules/.bin/medusa build

EXPOSE 9000

CMD ["node_modules/.bin/medusa", "start"]
