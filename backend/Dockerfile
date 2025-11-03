#=============Builder Stage ==================#
FROM node:25.1.0-alpine3.21 AS builder

WORKDIR /app

# Copy the package.json and package-lock.json files to /node
COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force


#=============Production Stage ==================#
FROM node:25.1.0-alpine3.21 AS production

# Change the working directory to /build
WORKDIR /app

# Copy the package.json and package-lock.json files to the /build directory
COPY --from=builder /app/node_modules/ /app/node_modules/
COPY package*.json ./
COPY server.js ./
COPY src/ ./src/

# Set environment variable
ENV NODE_ENV=production
# Run in non-root user (node user is created by base image)
RUN chown node:node ./
USER node

# Export port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', res => process.exit(res.statusCode===200?0:1))"


CMD ["node", "server.js"]