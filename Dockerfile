# ==========================================================================
# Labolab LIMS - Imagen de la aplicación (desarrollo / arranque rápido)
# ==========================================================================
FROM node:20-bookworm-slim

# openssl es requerido por Prisma; ca-certificates para descargas seguras
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Habilita Yarn Berry vía corepack
RUN corepack enable

WORKDIR /app

# 1) Instalar dependencias (capa cacheable)
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable || yarn install

# 2) Copiar el resto del código
COPY . .

# 3) Generar el cliente de Prisma
RUN yarn prisma generate

ENV NODE_ENV=development
EXPOSE 3000

# El entrypoint espera a la base de datos, aplica el esquema, siembra datos
# y luego levanta la app.
RUN chmod +x /app/docker-entrypoint.sh
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
