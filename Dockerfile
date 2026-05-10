# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --include=dev

COPY . .
RUN npm run build

# Runtime: tiny static-file server
# Reverse proxy / TLS / headers are handled externally (e.g. Nginx on the host).
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
