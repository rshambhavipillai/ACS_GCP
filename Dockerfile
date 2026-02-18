# Multi-stage build for optimized GKE deployment
# This Dockerfile is used for both GAE and GKE deployments

# Build stage
FROM node:18-slim as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:18-slim
WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY app.js .
COPY package*.json ./
COPY public ./public

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -u 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "app.js"]
