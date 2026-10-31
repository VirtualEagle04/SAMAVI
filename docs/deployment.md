# Despliegue en producción

SAMAVI se despliega con Docker Compose en una instancia de AWS Lightsail. El código está en `infra/prod/` y los workflows en `.github/workflows/`. Esta guía cubre la primera puesta en marcha y la operación diaria.

## Servidor

| Dato | Valor |
|---|---|
| Instancia | `samavi-production-test`, Lightsail `us-east-1`, 2 GB de RAM y 2 GB de swap |
| Sistema | Amazon Linux 2023 x86_64 (`dnf`; no hay `apt`, cron, certbot ni fail2ban) |
| Acceso | `ec2-user`, solo con llave SSH |
| IP estática | `34.203.163.214` |
| Zona horaria | `America/Bogota` |
| Repositorio | `/home/ec2-user/samavi`, deploy key de solo lectura |
| Firewall de Lightsail | 22, 80, 443 y 8883/TCP. PostgreSQL y el 1883 nunca se exponen |
| Dominio | Provisional en DuckDNS, apuntando a la IP estática. Siempre va en `DOMAIN`, nunca en el repo |

Lightsail hace un snapshot diario del disco. No sustituye a los respaldos de la base (ver [Respaldos](#respaldos)).

## Arquitectura

`infra/prod/docker-compose.yml` define cuatro servicios y una herramienta:

| Servicio | Imagen | Puertos publicados | Función |
|---|---|---|---|
| `nginx` | `ghcr.io/<dueño>/samavi-frontend` | 80, 443 | Sirve el build de Vite, redirige HTTP a HTTPS y reenvía `/api` y `/health` al backend (el SSE sin búfer) |
| `backend` | `ghcr.io/<dueño>/samavi-backend` | ninguno | API REST y consumidor MQTT |
| `mosquitto` | `eclipse-mosquitto:2` | 8883 (TLS) | El listener 1883 sin TLS solo existe en la red interna, para el backend |
| `postgres` | `postgres:16-alpine` | ninguno | Base de datos; `database/schema.sql` se aplica al crear el volumen |
| `certbot` | `certbot/certbot:v5.9.0` | ninguno | Perfil `herramientas`: solo se usa con `docker compose run` |

- Las imágenes se construyen en GitHub Actions y se etiquetan `sha-<commit>`. El servidor nunca compila.
- La etiqueta desplegada está en `/home/ec2-user/samavi/.env.deploy` (`IMAGE_TAG`). La escribe `deploy.sh`.
- Volúmenes: `postgres_data`, `mosquitto_data` (mensajes retenidos), `mosquitto_auth` (contraseñas y ACL), `mosquitto_certs`, `letsencrypt` y `certbot_webroot`.
- El frontend usa el mismo origen (`VITE_API_URL` vacío), así que la imagen no depende del dominio.

Los scripts de `infra/prod/scripts/` envuelven `docker compose` con los `--env-file` correctos. Para un comando suelto:

```bash
cd ~/samavi
docker compose --project-directory infra/prod -f infra/prod/docker-compose.yml \
  --env-file .env --env-file .env.deploy ps
```

## Configuración en GitHub

Se hace una sola vez y la hace un administrador del repositorio.

1. **Permisos de Actions.** En *Settings → Actions → General → Workflow permissions*, elige «Read repository contents and packages permissions». `deploy.yml` pide `packages: write` por su cuenta.
2. **Entorno `production`.**
   - Ve a *Settings → Environments → New environment* y créalo con el nombre `production`.
   - En *Deployment branches and tags* elige «Selected branches and tags» y añade `main`.
   - Para aprobar cada despliegue a mano, activa *Required reviewers*.
3. **Variables del entorno `production`** (*Environment variables*):
   - `SSH_HOST` = `34.203.163.214`
   - `SSH_USER` = `ec2-user`
4. **Llave SSH exclusiva para Actions**, generada en tu equipo, no en el servidor:
   ```bash
   ssh-keygen -t ed25519 -f samavi_actions -C "github-actions-samavi" -N ""
   ```
   - Copia el contenido de `samavi_actions` (la privada) al secreto `SSH_PRIVATE_KEY` del entorno `production`. Después borra ese archivo de tu equipo.
   - La pública (`samavi_actions.pub`) va al servidor, como explica el paso 3 del [primer despliegue](#primer-despliegue).
5. **Huella del servidor (`SSH_KNOWN_HOSTS`).**
   - En el servidor, abre la consola web de Lightsail y ejecuta `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`.
   - En tu equipo, ejecuta `ssh-keyscan -t ed25519 34.203.163.214`.
   - Si la huella `SHA256:` coincide con la del servidor, guarda la línea de `ssh-keyscan` como el secreto `SSH_KNOWN_HOSTS` del entorno `production`.
6. **Visibilidad de las imágenes.**
   - El primer despliegue crea los paquetes `samavi-backend` y `samavi-frontend` en GHCR, enlazados al repo. Aparecen en el perfil del dueño, pestaña *Packages*.
   - Aunque el repositorio sea público, GHCR los crea privados. En cada paquete ve a *Package settings → Danger Zone → Change visibility → Public*.
   - Con los paquetes públicos el servidor los descarga sin `docker login`. Mientras sigan privados, el primer `deploy.sh` falla al descargar.
7. **Proteger `main`.**
   - Ve a *Settings → Rules → Rulesets → New branch ruleset* y aplícalo a la rama por defecto.
   - Activa «Require a pull request before merging» y «Require status checks to pass».
   - Añade los checks `Unit Tests`, `Backend`, `Frontend`, `Firmware` e `Imágenes Docker`. Aparecen en el buscador después de que hayan corrido una vez en un PR.

## Primer despliegue

Requisitos previos: los workflows ya están en `main` y la configuración de GitHub está hecha.

1. **DNS.** En duckdns.org, apunta el subdominio a `34.203.163.214`. La IP es estática, así que no hace falta un actualizador. El token de DuckDNS no va al repo.
2. **`.env` del servidor.**
   ```bash
   cd ~/samavi
   cp .env.example .env
   chmod 600 .env
   openssl rand -hex 32   # una vez para JWT_SECRET y otra para cada contraseña
   ```
   Completa `POSTGRES_PASSWORD`, `JWT_SECRET`, `MQTT_USERNAME=samavi-backend`, `MQTT_PASSWORD`, `DOMAIN`, `LETSENCRYPT_EMAIL` y `GHCR_OWNER`. El compose de producción ignora `DATABASE_URL`, `MQTT_URL`, `PORT`, `POSTGRES_PORT` y `MOSQUITTO_PORT`: los arma él.
3. **Llave de Actions.** Añade una línea a `~/.ssh/authorized_keys`, con la pública del paso 4 de GitHub:
   ```text
   restrict,command="/home/ec2-user/samavi/infra/prod/scripts/deploy.sh" ssh-ed25519 AAAA... github-actions-samavi
   ```
   Con `command=`, esa llave solo puede ejecutar `deploy.sh`, aunque se filtre: no da shell ni túneles. El sha que envía Actions llega en `SSH_ORIGINAL_COMMAND`.
4. **Certificado.** nginx no arranca sin certificado y el puerto 80 debe estar libre:
   ```bash
   bash infra/prod/scripts/init-certs.sh
   ```
5. **Usuarios MQTT.** La contraseña se pide por teclado. La del backend debe ser igual a `MQTT_PASSWORD` del `.env`:
   ```bash
   bash infra/prod/scripts/mqtt-usuario.sh samavi-backend
   bash infra/prod/scripts/mqtt-usuario.sh 8C94DF6BEA44   # un usuario por ESP32: su MAC sin ":"
   ```
6. **Despliegue.** En GitHub, abre *Actions → Deploy → Run workflow* y deja el sha vacío. Publica las imágenes de la punta de `main` y ejecuta `deploy.sh` en el servidor. Después, haz públicos los paquetes (paso 6 de GitHub) si no lo hiciste. Si el despliegue falló porque las imágenes eran privadas, relánzalo.
7. **Timers.**
   ```bash
   sudo cp infra/prod/systemd/samavi-* /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now samavi-backup.timer samavi-certs-renew.timer
   systemctl list-timers 'samavi-*'
   ```
   Las unidades apuntan a `/home/ec2-user/samavi`. Si cambian en el repo, se vuelven a copiar.
8. **Usuarios de prueba.** `database/schema.sql` crea usuarios de prueba. Cambia sus contraseñas antes de dar acceso a nadie.

## Operación

### Desplegar y volver atrás

- Cada push a `main` que pasa CI se despliega solo (`deploy.yml` con `workflow_run`).
- `deploy.sh <sha>`:
  - lleva el checkout del servidor a ese commit (HEAD separado);
  - instala el ACL de Mosquitto y recarga el broker;
  - baja las imágenes y recrea los contenedores;
  - comprueba `https://$DOMAIN/health` desde el propio servidor.
- Si la comprobación falla, `deploy.sh` vuelve solo al commit y la etiqueta anteriores, y el workflow queda en rojo.
- Volver a una versión anterior a mano: abre *Actions → Deploy → Run workflow* con el sha completo de un commit ya desplegado. No recompila. También se puede hacer en el servidor con `bash infra/prod/scripts/deploy.sh <sha>`.
- Probar una rama en el servidor: solo hay imágenes de `main`. Para probar cambios de configuración de una rama (compose, nginx, Mosquitto), haz `git fetch` y `git checkout <rama>`, y luego `docker compose ... up -d` con las imágenes actuales. Al terminar, vuelve con `deploy.sh <sha desplegado>`.

### Estado y logs

```bash
docker compose ... ps
docker compose ... logs -f --tail 100 backend   # nginx, mosquitto, postgres
journalctl -u samavi-backup.service -u samavi-certs-renew.service
```

Docker rota los logs según `/etc/docker/daemon.json` (10 MB × 3 por contenedor).

### Respaldos

- `samavi-backup.timer` ejecuta `backup-db.sh` cada día a las 02:30 (hora de Bogotá).
- El respaldo es `pg_dump -Fc` (comprimido) en `~/samavi-backups/samavi-AAAAMMDD-HHMMSS.dump`. Se comprueba con `pg_restore --list` y se conservan 7 días.
- Respaldo a mano: `bash infra/prod/scripts/backup-db.sh`.
- Restaurar: `bash infra/prod/scripts/restore-db.sh ~/samavi-backups/<archivo>.dump`.
  - Pide escribir `RESTAURAR`.
  - Hace antes un respaldo del estado actual.
  - Detiene el backend mientras restaura.
- Pendiente: los respaldos viven en el mismo disco que la base. Hoy no se copian fuera de la instancia.

### Certificados

- `samavi-certs-renew.timer` ejecuta `renew-certs.sh` dos veces al día.
- certbot renueva por webroot cuando faltan menos de 30 días, a través del nginx en marcha.
- Si hubo renovación, se copia el certificado para Mosquitto, Mosquitto se reinicia (los ESP32 se reconectan solos) y nginx se recarga.
- Probar la renovación sin emitir nada:
  ```bash
  docker compose ... run --rm certbot renew --dry-run --webroot -w /var/www/certbot
  ```

### Usuarios MQTT

- `mqtt-usuario.sh <usuario>` crea un usuario o cambia su contraseña; `--borrar <usuario>` lo elimina.
- Mosquitto recarga contraseñas y ACL con SIGHUP, sin cortar conexiones.
- Permisos: `infra/prod/mosquitto/acl` y `docs/protocols/mqtt.md`.
- Al rotar la contraseña del backend, cambia también `MQTT_PASSWORD` en `.env` y recrea el backend con `docker compose ... up -d backend`.

## Firmware para producción

En `firmware/include/config.h` (plantilla `config.h.example`):

- `MQTT_SERVER`: el dominio, no la IP. El ESP32 valida el certificado contra el nombre.
- `MQTT_PORT = 8883` y `MQTT_USAR_TLS = true`.
- `MQTT_PASSWORD`: la contraseña creada con `mqtt-usuario.sh <MAC>`. El monitor serie muestra la MAC al conectar ("Conectando a MQTT como ...").

El ESP32 confía en las raíces de Let's Encrypt de `firmware/include/ca_mqtt.h` y espera a tener la hora por NTP antes de la conexión TLS.

## Pendientes

- **Migraciones:** no hay plan. `schema.sql` solo se aplica al crear el volumen `postgres_data`. Un cambio de esquema con datos reales exige un SQL manual revisado, aplicado después de un respaldo. Recrear el volumen borra todo.
- **Respaldos fuera de la instancia:** no definidos.
- **`deploy.sh`:** probado con shellcheck pero no de punta a punta. Se valida en el primer despliegue real.
- **Dominio definitivo:** al cambiarlo, actualiza `DOMAIN`, ejecuta `init-certs.sh` con nginx detenido y cambia `MQTT_SERVER` en el firmware.
