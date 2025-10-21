FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install --production --ignore-scripts

COPY . .

EXPOSE 4000
CMD ["node", "server.js"]
