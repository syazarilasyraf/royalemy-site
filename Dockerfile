# Base image
FROM node:20

# Working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy entire project
COPY . .

# Build frontend
RUN npm run build

# Expose backend port
EXPOSE 3001

# Start server
CMD ["node", "server/index.js"]
