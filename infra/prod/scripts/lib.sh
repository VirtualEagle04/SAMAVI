#!/usr/bin/env bash
# Funciones comunes de los scripts de producción. Se carga con "source".

PROD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$PROD_DIR/../.." && pwd)"
# Se pueden sobrescribir para probar los scripts contra otro entorno
# (con COMPOSE_PROJECT_NAME para no tocar el proyecto "samavi").
ENV_FILE="${SAMAVI_ENV_FILE:-$REPO_DIR/.env}"
DEPLOY_ENV_FILE="${SAMAVI_DEPLOY_ENV_FILE:-$REPO_DIR/.env.deploy}"

fallar() {
  echo "ERROR: $*" >&2
  exit 1
}

[ -f "$ENV_FILE" ] || fallar "No existe $ENV_FILE. Créalo a partir de .env.example (docs/deployment.md)."

# docker compose con el archivo de producción y los .env de la raíz.
compose() {
  local argumentos=(--project-directory "$PROD_DIR" -f "$PROD_DIR/docker-compose.yml" --env-file "$ENV_FILE")
  if [ -f "$DEPLOY_ENV_FILE" ]; then
    argumentos+=(--env-file "$DEPLOY_ENV_FILE")
  fi
  docker compose "${argumentos[@]}" "$@"
}

# Deja el volumen de autenticación como lo exige Mosquitto: carpeta, passwd y la
# copia de mosquitto/acl del repo, todo del usuario 1883 y sin lectura para otros.
preparar_auth() {
  compose run --rm --no-deps --entrypoint sh mosquitto -c '
    cd /mosquitto/auth &&
    chown 1883:1883 . && chmod 700 . &&
    touch passwd && chown 1883:1883 passwd && chmod 600 passwd &&
    install -o 1883 -g 1883 -m 600 /mosquitto/acl-repo/acl acl'
}

# Si el broker está en marcha, SIGHUP recarga contraseñas y ACL sin cortar conexiones.
recargar_mosquitto() {
  if compose ps --status running --services | grep -qx mosquitto; then
    compose kill -s SIGHUP mosquitto > /dev/null
    echo "Mosquitto recargado."
  fi
}

# Lee una variable del .env sin ejecutarlo (quita comillas y espacios finales).
env_valor() {
  local valor
  valor="$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
  valor="${valor%"${valor##*[![:space:]]}"}"
  valor="${valor#\"}"
  valor="${valor%\"}"
  valor="${valor#\'}"
  valor="${valor%\'}"
  printf '%s' "$valor"
}

env_requerida() {
  local valor
  valor="$(env_valor "$1")"
  [ -n "$valor" ] || fallar "Falta $1 en $ENV_FILE"
  printf '%s' "$valor"
}
