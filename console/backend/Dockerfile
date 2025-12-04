# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create config directory if it doesn't exist
RUN mkdir -p config

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
