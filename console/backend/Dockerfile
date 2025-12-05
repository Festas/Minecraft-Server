# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files from backend
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend application files
COPY . .

# Copy frontend files to parent directory location where server.js expects them
# server.js serves from path.join(__dirname, '../frontend')
COPY ../frontend /frontend

# Create config and data directories if they don't exist
RUN mkdir -p config data

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
