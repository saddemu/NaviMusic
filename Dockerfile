# Build stage
# Pinned by digest so a moved tag cannot change what we build on.
# Dependabot (docker ecosystem) opens a pull request when the tag moves.
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime: tiny static-file server, non-root.
# Reverse proxy / TLS / headers are handled externally (e.g. Nginx on the host).
FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runner
WORKDIR /app
RUN npm install -g serve@14.2.6
COPY --from=builder /app/dist ./dist
USER node

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
