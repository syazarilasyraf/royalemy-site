# Build stage
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci
COPY . .
ARG BUILD_ID=unknown
RUN echo "$BUILD_ID" > server/version.txt
RUN npm run build

# Production stage
FROM node:20
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
RUN mkdir -p /app/data
VOLUME /app/data
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1
CMD ["node", "server/index.js"]
