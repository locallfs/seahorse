FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json .npmrc ./

RUN npm install --production=false

COPY . .

EXPOSE 9000

ENV NODE_OPTIONS="--max-old-space-size=1024"

CMD ["sh", "-c", "echo '=== MEDUSA START BEGIN ===' && echo 'PORT='$PORT && node_modules/.bin/medusa start; echo '=== MEDUSA EXITED code='$?"]
