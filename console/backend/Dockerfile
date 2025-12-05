# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend application files
COPY backend/ .

# Copy frontend files to parent directory location where server.js expects them
# server.js serves from path.join(__dirname, '../frontend')
COPY frontend/ /frontend

# Create config and data directories if they don't exist
RUN mkdir -p config data

# Expose port
EXPOSE 3001

# Healthcheck - using wget which is available in Alpine
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server
CMD ["node", "server.js"]
