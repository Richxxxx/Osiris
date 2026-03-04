# =============================================================================
# DOCKERFILE DE PRODUCCIÓN - BACKEND NODE.js
# Optimizado para CI/CD y entorno empresarial
# =============================================================================

# Multi-stage build para reducir tamaño final
FROM node:18-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar solo archivos de dependencias para aprovechar cache de Docker
COPY package*.json ./

# Instalar dependencias de producción (limpias)
RUN npm ci --only=production && npm cache clean --force

# =============================================================================
# Etapa de producción
# =============================================================================
FROM node:18-alpine AS production

# Variables de entorno base
ENV NODE_ENV=production
ENV PORT=9092

# Argumentos de build-time para GitHub Actions
ARG PORT=9092
ARG DB_HOST
ARG DB_PORT
ARG DB_USER
ARG DB_PASSWORD
ARG DB_NAME
ARG JWT_SECRET
ARG CLIENT_URL
ARG EMAIL_HOST
ARG EMAIL_PORT
ARG EMAIL_USER
ARG EMAIL_PASS
ARG EMAIL_FROM

# Exportar variables de entorno
ENV PORT=${PORT}
ENV DB_HOST=${DB_HOST}
ENV DB_PORT=${DB_PORT}
ENV DB_USER=${DB_USER}
ENV DB_PASSWORD=${DB_PASSWORD}
ENV DB_NAME=${DB_NAME}
ENV JWT_SECRET=${JWT_SECRET}
ENV CLIENT_URL=${CLIENT_URL}
ENV EMAIL_HOST=${EMAIL_HOST}
ENV EMAIL_PORT=${EMAIL_PORT}
ENV EMAIL_USER=${EMAIL_USER}
ENV EMAIL_PASS=${EMAIL_PASS}
ENV EMAIL_FROM=${EMAIL_FROM}

# Crear usuario no-root con directorios necesarios
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app

# Establecer directorio de trabajo
WORKDIR /app

# Copiar dependencias desde etapa builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar archivos de la aplicación (excluyendo lo innecesario via .dockerignore)
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs .sequelizerc ./
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs config/ ./config/
COPY --chown=nodejs:nodejs healthcheck.js ./

# Exponer puerto
EXPOSE ${PORT}

# Cambiar a usuario no-root
USER nodejs

# Health check para monitoreo en producción
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Comando de inicio para producción
CMD ["npm", "start"]
