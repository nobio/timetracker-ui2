# Simple Dockerfile for Next.js app (minimal runtime image)
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy only necessary files for build
COPY . .

# Build Next.js app
RUN npm run build

# Production image
FROM node:24-alpine AS runner
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force;

# Copy built app and static assets (no node_modules, no source)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Remove any dev dependencies (extra safety)
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npx", "next", "start"]
