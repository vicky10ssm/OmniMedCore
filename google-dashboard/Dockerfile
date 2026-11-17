FROM node:24-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY sql ./sql

ENV NODE_ENV=production
USER node

CMD ["node", "src/main.mjs", "--source", "drive"]
