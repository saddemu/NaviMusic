# Build stage
# Pinned by digest so a moved tag cannot change what we build on.
# Dependabot (docker ecosystem) opens a pull request when the tag moves.
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime: tiny static-file server, non-root.
# Reverse proxy / TLS / headers are handled externally (e.g. Nginx on the host).
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS runner
WORKDIR /app
RUN npm install -g serve@14.2.6
COPY --from=builder /app/dist ./dist
USER node

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
