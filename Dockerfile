FROM node:22-alpine

# Application directory
WORKDIR /app

# Install dependencies first for better Docker layer caching
COPY package*.json ./

RUN npm ci --omit=dev

# Copy application source
COPY server.js ./
COPY public ./public

# Application port
EXPOSE 3000

# Run as non-root user
USER node

# Start application
CMD ["node", "server.js"]