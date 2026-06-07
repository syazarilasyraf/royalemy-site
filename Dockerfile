# Base image
FROM node:20

# Working directory
WORKDIR /app

# Copy root package files first (layer caching)
COPY package*.json ./

# Copy workspace package files so npm workspaces resolve correctly
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install all dependencies (workspaces)
RUN npm install

# Copy entire project
COPY . .

# Build frontend
RUN npm run build

# Create data directory for persistent database storage
RUN mkdir -p /app/data

# Declare data directory as a volume so database persists across deployments
# Set DB_DIR env var to match your volume mount path (e.g., /data or /app/data)
VOLUME /app/data

# Expose backend port
EXPOSE 3001

# Start server
CMD ["node", "server/index.js"]
