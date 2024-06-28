FROM node:18-alpine AS base

WORKDIR /usr/app

COPY package*.json ./
RUN npm install

COPY .env ./

COPY . .

CMD ["node", "version-checker.js"]
