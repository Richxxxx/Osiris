# =============================================================================
# DOCKERFILE DE DESARROLLO - BACKEND NODE.js
# =============================================================================

FROM node:18-alpine

# set work directory
WORKDIR /app

# set environment variables
ENV NODE_ENV=development

# install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# create directories and set permissions
RUN mkdir -p logs uploads && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# copy project
COPY --chown=nodejs:nodejs . .

# expose port
EXPOSE 9092

# switch to non-root user
USER nodejs

# health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# start application (development)
CMD ["npm", "run", "dev"]
