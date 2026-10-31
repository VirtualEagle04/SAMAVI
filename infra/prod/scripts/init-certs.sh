#!/usr/bin/env bash
# Emite el primer certificado de Let's Encrypt para DOMAIN (nginx y Mosquitto).
# Usa el modo standalone de certbot en el puerto 80, así que nginx no debe estar
# corriendo: nginx no arranca sin certificado. Las renovaciones van por
# renew-certs.sh (webroot, con nginx en marcha).
set -euo pipefail
source "$(dirname "$0")/lib.sh"

DOMAIN="$(env_requerida DOMAIN)"
EMAIL="$(env_requerida LETSENCRYPT_EMAIL)"

if compose ps --status running --services | grep -qx nginx; then
  fallar "nginx está corriendo y ocupa el puerto 80. Si ya hay certificado usa renew-certs.sh."
fi

compose run --rm --publish 80:80 certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  --deploy-hook "sh /hooks/deploy-hook.sh"

# El deploy hook deja una marca para renew-certs.sh; en la emisión inicial no se usa.
compose run --rm --no-deps --entrypoint rm certbot -f /etc/letsencrypt/.samavi-renovado

echo "Certificado emitido para $DOMAIN y copiado para Mosquitto."
