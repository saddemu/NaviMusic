# Build stage
# Pinned by digest so a moved tag cannot change what we build on.
# Dependabot (docker ecosystem) opens a pull request when the tag moves.
FROM node:22-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime: tiny static-file server, non-root.
# Reverse proxy / TLS / headers are handled externally (e.g. Nginx on the host).
FROM node:22-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS runner
WORKDIR /app
RUN npm install -g serve@14.2.6
COPY --from=builder /app/dist ./dist
USER node

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
