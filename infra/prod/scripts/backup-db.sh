#!/usr/bin/env bash
# Respaldo de PostgreSQL en formato custom de pg_dump (-Fc, comprimido, .dump).
# Lo ejecuta samavi-backup.timer cada día; conserva 7 días. Restaurar: restore-db.sh.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

BACKUP_DIR="${SAMAVI_BACKUP_DIR:-$HOME/samavi-backups}"
RETENCION_DIAS=7

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

archivo="$BACKUP_DIR/samavi-$(date +%Y%m%d-%H%M%S).dump"
temporal="$archivo.parcial"
trap 'rm -f "$temporal"' EXIT

# Las variables se expanden dentro del contenedor de PostgreSQL.
# shellcheck disable=SC2016
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$temporal"

# Un respaldo que pg_restore no puede leer no cuenta como respaldo.
compose exec -T postgres pg_restore --list < "$temporal" > /dev/null \
  || fallar "El respaldo generado no es válido; se descarta."

chmod 600 "$temporal"
mv "$temporal" "$archivo"
echo "Respaldo creado: $archivo ($(du -h "$archivo" | cut -f1))"

# -mtime +N cuenta días completos: +$((RETENCION_DIAS - 1)) conserva los últimos 7.
find "$BACKUP_DIR" -maxdepth 1 -name 'samavi-*.dump' -mtime +$((RETENCION_DIAS - 1)) -print -delete
