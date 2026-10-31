#!/usr/bin/env bash
# Despliega un commit de main ya publicado en GHCR por .github/workflows/deploy.yml.
# Lleva el checkout del servidor a ese commit (compose, nginx, Mosquitto), baja las
# imágenes sha-<commit>, recrea los contenedores y comprueba /health por HTTPS.
# Si la comprobación falla, vuelve al commit y la etiqueta anteriores.
#
# Uso manual:  deploy.sh <sha completo de 40 caracteres>
# Desde GitHub Actions la llave SSH está limitada a este script (command= en
# authorized_keys) y el sha llega en SSH_ORIGINAL_COMMAND.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

# Todo va dentro de main: git checkout puede reescribir este archivo mientras corre
# y bash lee los scripts por partes; así ya está leído entero antes de cambiarlo.
main() {
  local sha="${1:-${SSH_ORIGINAL_COMMAND:-}}"
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || fallar "Se esperaba el sha completo de un commit, se recibió: '$sha'"

  exec 9> /tmp/samavi-deploy.lock
  flock -n 9 || fallar "Ya hay otro despliegue en curso."

  local dominio
  dominio="$(env_requerida DOMAIN)"

  cd "$REPO_DIR"
  local sha_anterior etiqueta_anterior=""
  sha_anterior="$(git rev-parse HEAD)"
  if [ -f "$DEPLOY_ENV_FILE" ]; then
    etiqueta_anterior="$(grep -E '^IMAGE_TAG=' "$DEPLOY_ENV_FILE" | cut -d= -f2-)"
  fi

  echo "Desplegando $sha (anterior: $sha_anterior ${etiqueta_anterior:-sin etiqueta})."
  git fetch --quiet origin
  git cat-file -e "$sha^{commit}" 2> /dev/null || fallar "El commit $sha no existe en origin."
  git checkout --quiet --detach "$sha"

  aplicar "sha-$sha"
  if comprobar "$dominio"; then
    docker image prune -f > /dev/null
    echo "Despliegue de $sha completado."
    return 0
  fi

  echo "La comprobación de /health falló. Estado y últimos logs:" >&2
  compose ps >&2
  compose logs --tail 50 backend nginx >&2 || true
  if [ -n "$etiqueta_anterior" ]; then
    echo "Volviendo a $sha_anterior ($etiqueta_anterior)." >&2
    git checkout --quiet --detach "$sha_anterior"
    aplicar "$etiqueta_anterior"
    comprobar "$dominio" || echo "La versión anterior tampoco responde: revisa el servidor." >&2
  fi
  fallar "Despliegue de $sha fallido."
}

aplicar() {
  printf 'IMAGE_TAG=%s\n' "$1" > "$DEPLOY_ENV_FILE.nuevo"
  mv "$DEPLOY_ENV_FILE.nuevo" "$DEPLOY_ENV_FILE"
  compose pull --quiet backend nginx
  # El ACL puede cambiar con el commit; up -d no reinicia Mosquitto si su servicio no cambió.
  preparar_auth
  compose up -d --remove-orphans
  recargar_mosquitto
}

# Pasa por nginx y TLS sin salir del servidor (--resolve) y valida el certificado.
comprobar() {
  local _
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 5 --resolve "$1:443:127.0.0.1" "https://$1/health" > /dev/null 2>&1; then
      return 0
    fi
    sleep 3
  done
  return 1
}

main "$@"; exit
