#!/usr/bin/env bash
# Crea, cambia o borra usuarios del Mosquitto de producción. La contraseña se
# pide por teclado (mosquitto_passwd) y nunca pasa por la línea de comandos.
# Usuarios válidos (ver mosquitto/acl):
#   samavi-backend   el backend (MQTT_USERNAME del .env)
#   <MAC sin ":">    un ESP32, 12 caracteres hexadecimales en mayúscula
# Uso: mqtt-usuario.sh <usuario>            crea el usuario o cambia su contraseña
#      mqtt-usuario.sh --borrar <usuario>   lo elimina
set -euo pipefail
source "$(dirname "$0")/lib.sh"

accion=crear
if [ "${1:-}" = "--borrar" ]; then
  accion=borrar
  shift
fi
usuario="${1:-}"

[[ "$usuario" =~ ^(samavi-backend|[0-9A-F]{12})$ ]] \
  || fallar "Usuario inválido: usa samavi-backend o la MAC del ESP32 sin ':' en mayúsculas."

# En la primera instalación crea passwd y el ACL, sin los cuales el broker no arranca.
preparar_auth

# Como 1883, dueño del archivo: mosquitto_passwd avisa si el archivo no es de quien lo edita.
opciones=()
[ "$accion" = borrar ] && opciones=(-D)
compose run --rm --no-deps --user 1883:1883 --entrypoint mosquitto_passwd mosquitto \
  "${opciones[@]}" /mosquitto/auth/passwd "$usuario"

recargar_mosquitto
echo "Usuario $usuario: $accion hecho."
