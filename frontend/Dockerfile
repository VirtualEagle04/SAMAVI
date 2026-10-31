# Imagen de producción del frontend: build estático de Vite servido por nginx.
# Contexto de build: frontend/. La configuración de nginx (proxy /api y TLS) no va
# en la imagen: se monta desde infra/prod/nginx/templates en el servidor.

FROM node:24-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Vacío = mismo origen: nginx reenvía /api al backend, así la imagen no depende del dominio.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.30-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
