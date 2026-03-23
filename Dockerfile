FROM node:19-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --omit=dev

COPY src/ ./src/
COPY *.json ./
COPY .env ./

CMD ["node", "src/index.js"]
