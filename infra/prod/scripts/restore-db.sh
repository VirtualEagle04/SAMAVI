#!/usr/bin/env bash
# Restaura un respaldo .dump de backup-db.sh sobre la base de producción.
# DESTRUYE los datos actuales de las tablas restauradas. Detiene el backend
# durante la restauración para que no entren escrituras (ni conteos MQTT).
# Uso: restore-db.sh /home/ec2-user/samavi-backups/samavi-AAAAMMDD-HHMMSS.dump
set -euo pipefail
source "$(dirname "$0")/lib.sh"

archivo="${1:-}"
[ -n "$archivo" ] || fallar "Uso: $0 <archivo.dump>"
[ -f "$archivo" ] || fallar "No existe $archivo"

compose exec -T postgres pg_restore --list < "$archivo" > /dev/null \
  || fallar "$archivo no es un respaldo válido de pg_dump -Fc."

echo "Se reemplazarán los datos de producción con $archivo."
read -r -p "Escribe RESTAURAR para continuar: " confirmacion
[ "$confirmacion" = "RESTAURAR" ] || fallar "Cancelado."

# Respaldo previo por si hay que deshacer la restauración.
"$(dirname "$0")/backup-db.sh"

compose stop backend
trap 'compose start backend' EXIT

# Las variables se expanden dentro del contenedor de PostgreSQL.
# shellcheck disable=SC2016
compose exec -T postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction' \
  < "$archivo"

echo "Restauración completada."
