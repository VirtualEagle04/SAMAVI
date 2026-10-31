#!/bin/sh
# Se ejecuta dentro del contenedor certbot cada vez que se emite o renueva el
# certificado. Mosquitto lee el certificado como usuario 1883 y no puede abrir
# la clave privada de /etc/letsencrypt (solo root), así que se le deja una copia.
set -eu

destino=/mosquitto-certs
cp "$RENEWED_LINEAGE/fullchain.pem" "$destino/fullchain.pem"
cp "$RENEWED_LINEAGE/privkey.pem" "$destino/privkey.pem"
chown 1883:1883 "$destino/fullchain.pem" "$destino/privkey.pem"
chmod 644 "$destino/fullchain.pem"
chmod 600 "$destino/privkey.pem"

# renew-certs.sh ve esta marca y reinicia Mosquitto y recarga nginx.
touch /etc/letsencrypt/.samavi-renovado
