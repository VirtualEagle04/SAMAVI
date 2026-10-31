#!/usr/bin/env bash
# Renueva el certificado si le quedan menos de 30 días (lo decide certbot) y,
# solo si cambió, reinicia Mosquitto y recarga nginx. Lo ejecuta el timer
# samavi-certs-renew.timer; también se puede lanzar a mano.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

compose run --rm certbot renew \
  --webroot -w /var/www/certbot \
  --non-interactive \
  --deploy-hook "sh /hooks/deploy-hook.sh"

marca=/etc/letsencrypt/.samavi-renovado
if compose run --rm --no-deps --entrypoint sh certbot -c "test -f $marca && rm $marca"; then
  echo "Certificado renovado: reiniciando Mosquitto y recargando nginx."
  # Mosquitto solo lee el certificado al arrancar; los ESP32 se reconectan solos.
  compose restart mosquitto
  compose exec -T nginx nginx -s reload
else
  echo "El certificado no necesitaba renovarse."
fi
