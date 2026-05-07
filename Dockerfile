# --- Build stage: compila better-sqlite3 ---
FROM node:20-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# --- Runtime stage: imagen mínima ---
FROM node:20-bookworm-slim

WORKDIR /app
COPY --from=build /app /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
