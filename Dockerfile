# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .

RUN DATABASE_URL=mariadb://dummy:dummy@localhost:3306/dummy npx prisma generate && \
    npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci --omit=dev

# Copier les fichiers compilés du builder
COPY --from=builder /app/dist ./dist

# Copier le client Prisma généré
COPY --from=builder /app/generated ./generated

# Copier le CLI Prisma depuis le builder (devDep, absent avec --omit=dev)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma db push && node dist/index.js"]
