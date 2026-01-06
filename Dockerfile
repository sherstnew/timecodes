# BUILD
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev

COPY . .

COPY .env .env

RUN npm run build

# RUNTIME
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./

RUN npm ci --production && npm install typescript

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.env .env

RUN rm -rf /app/node_modules/.cache /root/.npm

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]