# SAMAVI: Especificación del Esquema Relacional

Este documento describe el esquema relacional completo del sistema SAMAVI (Sistema Automatizado de Manejo Avícola y Verificación de Inventario), derivado del modelo Entidad-Relación validado con el cliente. Está pensado como entrada para un agente de desarrollo que implementará el esquema (por ejemplo, en PostgreSQL con Prisma).

## 1. Contexto general

SAMAVI gestiona una granja avícola con varios galpones (naves de producción). Cada día se recolectan y clasifican huevos por peso, se registran ventas a mayoristas y semanalmente se calcula un reparto proporcional de ganancias (prorrateo) entre los socios inversionistas de cada galpón.

Motor de base de datos objetivo: PostgreSQL. ORM objetivo: Prisma.

Convenciones generales:
- Nombres de tabla y columna en snake_case, en español, sin tildes.
- Toda tabla fuerte tiene una PK propia (`id` autoincremental o `codigo` como identificador natural corto).
- Toda tabla débil o de unión usa PK compuesta formada por las FK relevantes (más un discriminador si aplica).
- Los atributos derivados (calculables) NO se almacenan como columnas; se calculan en la capa de aplicación o mediante vistas.
- No se usan colores ni convenciones visuales en el esquema; esta especificación es puramente estructural.

## 2. Resumen de tablas (19)

| # | Tabla | Tipo | PK |
|---|-------|------|----|
| 1 | SOCIO | Fuerte | id |
| 2 | GALPON | Fuerte | id |
| 3 | INVERSION_SOCIO | Unión M:N | (id_socio, id_galpon) |
| 4 | CATEGORIA_PESO | Fuerte | codigo |
| 5 | LOG_CONTEO | Fuerte | id |
| 6 | CIERRE_DIARIO | Débil | (id_galpon, codigo_categoria_peso, fecha) |
| 7 | BODEGA | Débil | (id_galpon, codigo_categoria_peso, fecha_corte) |
| 8 | MAYORISTA | Fuerte | id |
| 9 | GASTO | Fuerte | id |
| 10 | PRECIO | Unión M:N | (id_mayorista, codigo_categoria_peso) |
| 11 | PEDIDO | Fuerte | id |
| 12 | DETALLE_PEDIDO | Débil | (id_pedido, codigo_categoria_peso) |
| 13 | VENTA | Fuerte | id |
| 14 | DETALLE_VENTA | Débil | (id_venta, codigo_categoria_peso) |
| 15 | ROL | Fuerte | id |
| 16 | PERMISO | Fuerte | id |
| 17 | ROL_PERMISO | Unión M:N | (id_rol, id_permiso) |
| 18 | USUARIO | Fuerte | id |
| 19 | AUDITORIA | Fuerte | id |

En `database/schema.sql`, la relación conceptual `INVIERTE_EN` se implementa
con el nombre físico `inversion_socio`. El cliente Prisma todavía modela solo
`Rol` y `Usuario`, por lo que el esquema SQL es la fuente de inicialización
actual de la base de datos.

## 3. Definición detallada de tablas

### 3.1 SOCIO
Persona que invierte en uno o más galpones.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | Identificador del socio |
| nombre | VARCHAR(150) | NOT NULL | Nombre completo |
| documento | VARCHAR(20) | UNIQUE, NOT NULL | Cédula o documento de identidad |
| contacto | VARCHAR(255) | NULL | Teléfono o correo de contacto (texto libre) |

### 3.2 GALPON
Nave de producción física.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | Identificador del galpón |
| nombre | VARCHAR(100) | NOT NULL | Ej. "Galpón 1", "Galpón 5" |
| capacidad_gallinas | INT | NOT NULL, > 0 | Capacidad instalada |
| estado | VARCHAR(20) | NOT NULL | Enum lógico: `activo`, `inactivo`, `mantenimiento` |

Nota de negocio: Galpón 5 NUNCA debe incluirse en el pool proporcional de prorrateo junto con los demás galpones activos (típicamente Galpones 1, 3, 4). Opera con venta y balance propios. Esto se resuelve en lógica de aplicación, no como restricción de esquema, pero debe documentarse en el código (p. ej. una constante o flag `es_pool_proporcional` si se desea explicitar; no estaba en el ERD original, así que es opcional agregarla).

### 3.3 INVERSION_SOCIO
Relación M:N entre SOCIO y GALPON, con el porcentaje de inversión.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_socio | INT | PK compuesta, FK -> SOCIO(id) | |
| id_galpon | INT | PK compuesta, FK -> GALPON(id) | |
| porcentaje_inversion | DECIMAL(5,2) | NOT NULL, >= 25.00 y <= 100.00 | Porcentaje de inversión del socio en ese galpón |

Reglas de negocio a validar en aplicación (no expresables directamente en SQL simple):
- Máximo 4 socios por galpón.
- Mínimo 25% de inversión por socio.
- La suma de `porcentaje_inversion` de todos los socios de un mismo `id_galpon` debe ser igual a 100.00.

### 3.4 CATEGORIA_PESO
Catálogo de las categorías de clasificación por peso del huevo. Es el hub central del modelo (se relaciona con 6 tablas).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| codigo | VARCHAR(10) | PK | Ej: `Y`, `EX`, `AA`, `A`, `B`, `C`, `P`, `Q` (quebrado) |
| nombre | VARCHAR(30) | NOT NULL | Ej: "Yumbo", "Extra", "AA", "A", "B", "C", "Pipo", "Quebrado" |
| peso_min_g | INT | NULL | Peso mínimo en gramos. NULL para categorías de rango abierto (Yumbo no tiene máximo, Pipo no tiene minimo, Quebrado no aplica peso) |
| peso_max_g | INT | NULL | Peso máximo en gramos. NULL para categorías de rango abierto |

Valores iniciales en `database/schema.sql`: Yumbo (`Y`, 78g+), Extra (`Ex`,
67-77g), AA (60-66g), A (53-59g), B (46-52g), C (45g) y P (menos de 45g).
La categoría Q para quebrados está descrita como pendiente de confirmación y
no se inserta actualmente en el esquema SQL.

### 3.5 LOG_CONTEO
Registro crudo de cada mensaje MQTT recibido del ESP32 (evento de conteo por sensor).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGINT | PK, autoincremental | |
| timestamp | TIMESTAMP | NOT NULL | Momento del evento de conteo |
| cantidad | INT | NOT NULL | Cantidad contada en el evento (puede ser +1, -1 por ajuste manual, o un valor agregado según implementación del firmware) |
| id_galpon | INT | NOT NULL, FK -> GALPON(id) | Galpón donde ocurrió el conteo |
| codigo_categoria_peso | VARCHAR(10) | NOT NULL, FK -> CATEGORIA_PESO(codigo) | Categoría de peso detectada |

Nota: esta tabla almacena eventos crudos, no totales. Los totales consolidados van en CIERRE_DIARIO. Debe soportar alto volumen de escritura (proviene directamente de MQTT vía backend).

### 3.6 CIERRE_DIARIO
Total consolidado de bandejas producidas por galpón, categoría de peso y fecha (entidad débil).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_galpon | INT | PK compuesta, FK -> GALPON(id) | |
| codigo_categoria_peso | VARCHAR(10) | PK compuesta, FK -> CATEGORIA_PESO(codigo) | |
| fecha | DATE | PK compuesta | Fecha del cierre diario |
| cantidad_bandejas | INT | NOT NULL, >= 0 | Bandejas completas (30 huevos c/u) producidas ese día para ese galpón y categoría |

### 3.7 BODEGA
Inventario remanente (lo que queda en bodega) por galpón, categoría de peso y fecha de corte, tras aplicar pedidos/ventas. Cada galpón puede conservar cantidades diferentes para una misma categoría.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_galpon | INT | PK compuesta, FK -> GALPON(id) | Galpón al que pertenece el inventario remanente |
| codigo_categoria_peso | VARCHAR(10) | PK compuesta, FK -> CATEGORIA_PESO(codigo) | Categoría de peso del inventario |
| fecha_corte | DATE | PK compuesta | Fecha del corte (normalmente los jueves, o el día de venta) |
| cantidad_bandejas | INT | NOT NULL, >= 0 | Bandejas remanentes en bodega |

### 3.8 MAYORISTA
Cliente comprador al por mayor.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | |
| nombre | VARCHAR(150) | NOT NULL | Ej: "Carolina", "Deyanira", "Felipe" |
| ubicacion | VARCHAR(150) | NULL | Zona o dirección de entrega (ej. "La Plata, Huila") |
| contacto | JSON | NULL | Estructura flexible de contacto. Ejemplo: `{"telefono": "3XXXXXXXXX", "email": null, "notas": "prefiere pago en efectivo"}` |

### 3.9 GASTO
Registro de un gasto operativo usado en el cálculo del balance.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | Identificador del gasto |
| concepto | VARCHAR(150) | NOT NULL | Descripción del gasto |
| valor | DECIMAL(10,2) | NOT NULL, > 0 | Valor monetario del gasto |

El esquema actual no relaciona `GASTO` directamente con un galpón, una semana
ni un usuario. Esa asignación debe definirse en la lógica de aplicación si se
requiere para el prorrateo.

### 3.10 PRECIO
Relación M:N entre MAYORISTA y CATEGORIA_PESO: precio vigente que un mayorista paga por cada categoría de peso.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_mayorista | INT | PK compuesta, FK -> MAYORISTA(id) | |
| codigo_categoria_peso | VARCHAR(10) | PK compuesta, FK -> CATEGORIA_PESO(codigo) | |
| valor_unitario | DECIMAL(10,2) | NOT NULL, > 0 | Precio por bandeja vigente. No maneja histórico de vigencia (confirmado con el cliente): el precio real aplicado en cada venta queda registrado de forma inmutable en `DETALLE_VENTA.precio_aplicado`. |

### 3.11 PEDIDO
Pedido realizado por un mayorista en un momento específico de la jornada de venta (martes, sábado o jueves).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | |
| fecha | TIMESTAMP | NOT NULL | Fecha y hora en que se realizó el pedido |
| estado | VARCHAR(20) | NOT NULL | Enum lógico: `pendiente`, `cargado`, `entregado`, `modificado`, `cancelado` |
| id_mayorista | INT | NOT NULL, FK -> MAYORISTA(id) | |

Nota: no incluye `id_usuario` directo. La trazabilidad de quién creó/modificó el registro se resuelve vía la tabla AUDITORIA (ver sección 3.18), no con una FK embebida.

### 3.12 DETALLE_PEDIDO
Líneas del pedido: cuánto se pidió de cada categoría de peso (entidad débil de PEDIDO).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_pedido | INT | PK compuesta, FK -> PEDIDO(id) | |
| codigo_categoria_peso | VARCHAR(10) | PK compuesta, FK -> CATEGORIA_PESO(codigo) | |
| cantidad_solicitada | INT | NOT NULL, >= 0 | Bandejas solicitadas de esa categoría |

### 3.13 VENTA
Venta efectivamente realizada, asociada 1 a 1 con un pedido (una venta cierra un pedido; puede haber diferencias entre lo pedido y lo vendido si el mayorista cambió cantidades).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | |
| fecha_hora | TIMESTAMP | NOT NULL | Momento de cierre de la venta |
| id_pedido | INT | NOT NULL, UNIQUE, FK -> PEDIDO(id) | Relación 1:1 con PEDIDO |

Nota: `total` es un atributo derivado (ver ERD original, marcado como punteado/derivado) y NO se almacena. Se calcula como `SUM(cantidad_vendida * precio_aplicado)` sobre `DETALLE_VENTA` para esa venta. Igual que en PEDIDO, no incluye `id_usuario`; la auditoría cubre la trazabilidad de quién la registró.

### 3.14 DETALLE_VENTA
Líneas de la venta: cuánto se vendió de cada categoría de peso y a qué precio (entidad débil de VENTA).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_venta | INT | PK compuesta, FK -> VENTA(id) | |
| codigo_categoria_peso | VARCHAR(10) | PK compuesta, FK -> CATEGORIA_PESO(codigo) | |
| cantidad_vendida | INT | NOT NULL, >= 0 | Bandejas efectivamente vendidas |
| precio_aplicado | DECIMAL(10,2) | NOT NULL, > 0 | Precio histórico aplicado en esa venta (copia inmutable de PRECIO.valor_unitario al momento de la venta) |

### 3.15 ROL
Catálogo de roles del sistema.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | |
| nombre | VARCHAR(50) | UNIQUE, NOT NULL | Valores esperados: `Dueña`, `Carlos Andrés`, `Humberto`, `Galponero` |

### 3.16 PERMISO
Catálogo de permisos/funcionalidades del sistema (una fila por vista o acción del dashboard).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | |
| codigo | VARCHAR(50) | UNIQUE, NOT NULL | Identificador técnico corto, ej: `VER_PRODUCCION`, `INGRESAR_PEDIDO`, `EDITAR_PRECIOS`, `VER_PRORRATEO`, `GESTIONAR_USUARIOS` |
| descripcion | VARCHAR(150) | NOT NULL | Descripción legible del permiso |

### 3.17 ROL_PERMISO
Relación M:N entre ROL y PERMISO. Patrón RBAC estándar: permite agregar o quitar permisos por rol sin migraciones de esquema.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id_rol | INT | PK compuesta, FK -> ROL(id) | |
| id_permiso | INT | PK compuesta, FK -> PERMISO(id) | |

### 3.18 USUARIO
Usuario del sistema (persona que inicia sesión).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | INT | PK, autoincremental | |
| nombre | VARCHAR(100) | NOT NULL | Nombre completo |
| login | VARCHAR(50) | UNIQUE, NOT NULL | Usuario de acceso |
| telefono | VARCHAR(20) | NULL | |
| id_rol | INT | NOT NULL, FK -> ROL(id) | Rol asignado |

Nota de autenticación (según diagrama de secuencia ya definido): la contraseña se almacena con hash bcrypt en una columna adicional no incluida en el ERD original (`password_hash VARCHAR(255) NOT NULL`); se recomienda agregarla al implementar, junto con campos de soporte de sesión si se decide usar refresh tokens (pendiente de definir, ver sección 5).

### 3.19 AUDITORIA
Registro de auditoría estándar para todas las transacciones del sistema (requisito no funcional de trazabilidad).

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | BIGINT | PK, autoincremental | |
| id_usuario | INT | NOT NULL, FK -> USUARIO(id) | Quién ejecutó la acción |
| tabla_afectada | VARCHAR(50) | NOT NULL | Nombre de la tabla modificada, ej. `PEDIDO`, `VENTA`, `PRECIO` |
| id_registro_afectado | VARCHAR(50) | NOT NULL | ID (o clave compuesta serializada) del registro afectado |
| accion | VARCHAR(20) | NOT NULL | Enum lógico: `INSERT`, `UPDATE`, `DELETE` |
| datos_anteriores | JSON | NULL | Estado del registro antes del cambio (NULL en INSERT) |
| datos_nuevos | JSON | NULL | Estado del registro después del cambio (NULL en DELETE) |
| fecha_hora | TIMESTAMP | NOT NULL, DEFAULT now() | |
| ip_origen | VARCHAR(45) | NULL | IPv4 o IPv6 de origen |
| resultado | VARCHAR(20) | NOT NULL | Enum lógico: `EXITOSO`, `FALLIDO` |

Esta tabla reemplaza la necesidad de columnas `id_usuario` directas en PEDIDO y VENTA: cualquier tabla del sistema puede auditarse mediante `tabla_afectada` + `id_registro_afectado`, sin requerir una FK dedicada por tabla.

## 4. Relaciones (Foreign Keys)

| # | Tabla origen | Columna(s) FK | Tabla destino | Cardinalidad | Regla de borrado sugerida |
|---|---|---|---|---|---|
| 1 | INVERSION_SOCIO | id_socio | SOCIO | N a 1 | CASCADE |
| 2 | INVERSION_SOCIO | id_galpon | GALPON | N a 1 | CASCADE |
| 3 | LOG_CONTEO | id_galpon | GALPON | N a 1 | RESTRICT |
| 4 | LOG_CONTEO | codigo_categoria_peso | CATEGORIA_PESO | N a 1 | RESTRICT |
| 5 | CIERRE_DIARIO | id_galpon | GALPON | N a 1 | RESTRICT |
| 6 | CIERRE_DIARIO | codigo_categoria_peso | CATEGORIA_PESO | N a 1 | RESTRICT |
| 7 | BODEGA | id_galpon | GALPON | N a 1 | RESTRICT |
| 8 | BODEGA | codigo_categoria_peso | CATEGORIA_PESO | N a 1 | RESTRICT |
| 9 | PRECIO | id_mayorista | MAYORISTA | N a 1 | CASCADE |
| 10 | PRECIO | codigo_categoria_peso | CATEGORIA_PESO | N a 1 | RESTRICT |
| 11 | PEDIDO | id_mayorista | MAYORISTA | N a 1 | RESTRICT |
| 12 | DETALLE_PEDIDO | id_pedido | PEDIDO | N a 1 | CASCADE |
| 13 | DETALLE_PEDIDO | codigo_categoria_peso | CATEGORIA_PESO | N a 1 | RESTRICT |
| 14 | VENTA | id_pedido | PEDIDO | 1 a 1 | RESTRICT |
| 15 | DETALLE_VENTA | id_venta | VENTA | N a 1 | CASCADE |
| 16 | DETALLE_VENTA | codigo_categoria_peso | CATEGORIA_PESO | N a 1 | RESTRICT |
| 17 | ROL_PERMISO | id_rol | ROL | N a 1 | CASCADE |
| 18 | ROL_PERMISO | id_permiso | PERMISO | N a 1 | CASCADE |
| 19 | USUARIO | id_rol | ROL | N a 1 | RESTRICT |
| 20 | AUDITORIA | id_usuario | USUARIO | N a 1 | RESTRICT |

Las reglas de borrado (`CASCADE`/`RESTRICT`) son una recomendación de partida; deben confirmarse con el equipo antes de implementarse, especialmente en tablas históricas (LOG_CONTEO, CIERRE_DIARIO, BODEGA, AUDITORIA) donde probablemente se prefiera nunca borrar en cascada.

## 5. Reglas de negocio relevantes para la implementación

1. **Prorrateo (cálculo semanal de reparto de ganancias):**
   - Para cada categoría de peso, la cantidad vendida en la semana se distribuye entre los galpones del pool (Galpones 1, 3, 4) proporcional a la participación de cada galpón en la producción semanal de esa categoría.
   - Fórmula: `Asignado_G1 = ROUND(cantidad_vendida * participacion_G1)`, `Asignado_G3 = ROUND(cantidad_vendida * participacion_G3)`, `Asignado_G4 = cantidad_vendida - Asignado_G1 - Asignado_G3` (residual, evita drift de redondeo).
   - Galpón 5 NUNCA entra en este pool: tiene su propio cálculo de balance con ventas directas (incluye venta industrial a Italcol para AA/A).
   - Gastos fijos son iguales por galpón activo; gastos variables escalan según bultos de alimento y torres de bandejas nuevas.
   - Balance = ventas asignadas - gastos. La distribución a cada socio = balance * porcentaje_inversion (de INVERSION_SOCIO).
   - Esta lógica de cálculo debe implementarse en la capa de servicio/aplicación, no en el esquema; el esquema solo almacena los datos base necesarios (CIERRE_DIARIO, DETALLE_VENTA, PRECIO, INVERSION_SOCIO, GASTO).

2. **Ajuste de quebrados:** tradicionalmente se descuenta una bandeja de quebrados por trabajador, repartida equitativamente entre los galpones que produjeron quebrados esa semana. Esto es lógica de aplicación sobre CIERRE_DIARIO filtrado por `codigo_categoria_peso = 'Q'`.

3. **Auditoría obligatoria:** toda escritura (INSERT/UPDATE/DELETE) sobre tablas transaccionales (PEDIDO, VENTA, DETALLE_PEDIDO, DETALLE_VENTA, PRECIO, INVERSION_SOCIO, USUARIO, ROL_PERMISO) debe generar una fila en AUDITORIA. Se recomienda implementarlo vía trigger de base de datos o middleware de aplicación (a decidir con el equipo; no se define aquí para no imponer una arquitectura).

4. **Autenticación JWT (ya definida en diagrama de secuencia aparte):** el payload del JWT contiene `id`, `rol` y expiración. Middleware de RBAC valida el rol contra los permisos de ROL_PERMISO antes de autorizar cada endpoint. Casos de falla ya definidos: 401 credenciales inválidas, 401 token inválido/expirado, 403 rol sin permiso suficiente.

5. **MQTT y ESP32:** el ESP32 NO forma parte del modelo de datos. Solo envía mensajes MQTT al tópico configurado, cuyo valor predeterminado actual es `samavi/conteo`. El backend todavía registra el payload recibido, pero aún no lo traduce en filas de LOG_CONTEO. La consolidación diaria (CIERRE_DIARIO) es un proceso de agregación pendiente.

## 6. Índices recomendados

- `LOG_CONTEO (id_galpon, codigo_categoria_peso, timestamp)` — consultas de conteo en tiempo real y agregación diaria.
- `CIERRE_DIARIO (fecha)` — reportes semanales.
- `BODEGA (fecha_corte)` — reportes semanales.
- `PEDIDO (fecha)`, `PEDIDO (id_mayorista)` — listados por fecha y por mayorista.
- `VENTA (fecha_hora)` — reportes de ventas.
- `AUDITORIA (tabla_afectada, id_registro_afectado)`, `AUDITORIA (fecha_hora)` — búsquedas de auditoría.
- `USUARIO (login)` — ya cubierto por UNIQUE, usado en autenticación.

## 7. Valores enumerados esperados (a validar con el cliente antes de fijarlos como ENUM de base de datos o simple VARCHAR con CHECK)

- `GALPON.estado`: `activo`, `inactivo`, `mantenimiento`
- `PEDIDO.estado`: `pendiente`, `cargado`, `entregado`, `modificado`, `cancelado`
- `AUDITORIA.accion`: `INSERT`, `UPDATE`, `DELETE`
- `AUDITORIA.resultado`: `EXITOSO`, `FALLIDO`
- `ROL.nombre`: `Dueña`, `Carlos Andrés`, `Humberto`, `Galponero`
- `CATEGORIA_PESO.codigo`: `Y`, `Ex`, `AA`, `A`, `B`, `C`, `P` en los datos iniciales actuales. `Q` sigue pendiente de confirmación.

## 8. Pendientes conocidos (no bloquean la implementación del esquema, pero deben registrarse)

- Confirmar con Carlos Andrés: qué determina la cantidad de bultos de alimento por pedido (no correlaciona linealmente con huevos producidos), base del cálculo de transporte, y por qué las categorías Yumbo y B no reconcilian exactamente en el prorrateo.
- Definir si se requiere versionado temporal de PRECIO (por ahora, confirmado sin fecha: un único precio vigente por mayorista/categoría).
- Definir mecanismo de expiración/refresh de JWT y flujo de recuperación de contraseña (no definidos aún en el diagrama de autenticación).
- Decidir si la auditoría se implementa vía triggers de PostgreSQL o vía middleware de la capa de aplicación (Express/Prisma).
