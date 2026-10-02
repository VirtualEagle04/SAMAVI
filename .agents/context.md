# SAMAVI - Contexto del proyecto

## 1. Identidad del proyecto

SAMAVI significa **Sistema de Gestión Avícola El Samán**.

Es un sistema de información y automatización para la granja avícola El
Samán, orientado a digitalizar la captura de producción, inventario,
pedidos, ventas y consolidación financiera, con especial énfasis en
automatizar el conteo de huevos durante la clasificación por peso.

La granja El Samán está ubicada en la Vereda Matanzas, Paicol, Huila,
Colombia.

El proyecto corresponde a un trabajo de grado de Ingeniería de Sistemas
de la Universidad El Bosque y se plantea como un desarrollo tecnológico.

## 2. Problema que resuelve

El proceso actual depende fuertemente de registros manuales en
cuadernos, dictado oral, fotografías y posterior consolidación.

El proceso operativo principal es:

1.  Recolección de huevos por galpón.
2.  Clasificación mecánica de huevos por peso.
3.  Armado de bandejas de 30 huevos.
4.  Almacenamiento por galpón y categoría.
5.  Conteo diario de bandejas.
6.  Registro manual de producción.
7.  Gestión de pedidos de mayoristas.
8.  Registro de ventas.
9.  Consolidación semanal.
10. Prorrateo de ganancias y gastos entre galpones y socios.

El principal punto de intervención tecnológica es la clasificación y
conteo. La máquina clasificadora existente no proporciona una salida
digital de datos, por lo que SAMAVI agrega una capa electrónica para
capturar automáticamente los huevos que pasan por cada compartimiento.

## 3. Objetivos funcionales principales

El sistema debe:

-   Contar huevos por categoría de peso durante la clasificación.
-   Mostrar el conteo en pantallas locales.
-   Permitir correcciones manuales del conteo.
-   Enviar los conteos desde el ESP32 al backend.
-   Registrar inventario.
-   Registrar pedidos de mayoristas.
-   Registrar ventas.
-   Gestionar precios por categoría, por mayorista.
-   Calcular ganancias, gastos y saldos.
-   Mostrar información según el rol del usuario.
-   Reproducir digitalmente la información que antes se enviaba mediante
    fotografías.
-   Permitir migrar registros históricos.
-   Generar reportes.
-   Gestionar alertas.

## 4. Categorías de huevos

Las categorías utilizadas por el negocio son:

| Código | Categoría | Peso |
|-|-|-|
| Y  | Yumbo | 78 g o más |
| Ex | Extra | 67 g a 77 g |
| AA | AA | 60 g a 66 g |
| A  | A | 53 g a 59 g |
| B  | B | 46 g a 52 g |
| C  | C | 45 g |
| P  | Pipo | Menos de 45 g |
| Q  | Quebrados | No depende del peso |

Una bandeja completa contiene **30 huevos**, con disposición 5 x 6.

Los huevos quebrados no pasan por la máquina clasificadora y se
registran aparte. Por lo tanto, no cuentan con un sensor. Solo los botones manuales (+1/-1).

## 5. Arquitectura general

SAMAVI utiliza una arquitectura de monolito modular para el sistema de
información.

La arquitectura tecnológica es:

``` text
┌──────────────────────────────┐
│ Máquina clasificadora        │
│                              │
│  6 sensores VL53L0X          │
└──────────────┬───────────────┘
               │ I2C
               ▼
┌──────────────────────────────┐
│ ESP32                        │
│                              │
│ Captura de conteo             │
│ Control de sensores          │
│ Ajuste manual                 │
│ Pantalla local                │
└──────────────┬───────────────┘
               │ MQTT sobre TLS
               ▼
┌──────────────────────────────┐
│ Broker MQTT Mosquitto        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Backend                      │
│ Node.js + Express 5          │
│ API REST                     │
│ Módulos funcionales          │
│ Prisma ORM                   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ PostgreSQL                   │
│ 19 tablas documentadas       │
└──────────────────────────────┘

             ▲
             │ API REST
             │
┌────────────┴───────────────┐
│ Frontend                   │
│ React + TypeScript         │
│ Material UI                │
│ nginx                      │
└────────────────────────────┘
```

El despliegue definido en la documentación utiliza **AWS Lightsail** con
**Docker Compose**.

## 6. Stack tecnológico

### Firmware y hardware

-   ESP32 DevKit V1.
-   6 sensores VL53L0X.
-   Comunicación I2C para los VL53L0X.
-   Pines XSHUT para inicialización secuencial y asignación de
    direcciones I2C únicas.
-   Pantallas OLED I2C locales (Por definir).
-   Expansor GPIO MCP23017 para ampliar entradas digitales (Por definir).
-   Botones físicos para ajustes y control local (Por definir).
-   Wi-Fi para comunicación con el backend mediante MQTT.

### Backend

-   Node.js.
-   Express 5.
-   API REST.
-   MQTT para recepción de conteos provenientes del ESP32.
-   Prisma ORM.
-   PostgreSQL.
-   JWT para autenticación.
-   bcrypt para verificación de contraseñas.
-   RBAC para autorización por roles.

### Frontend

-   React.
-   TypeScript.
-   Material UI (MUI Core).
-   nginx para servir la aplicación (Por definir).

### Infraestructura

-   Docker Compose.
-   AWS Lightsail.
-   Broker MQTT Mosquitto.
-   PostgreSQL con almacenamiento persistente.
-   Respaldos automáticos cada 12 horas.

## 7. Estado actual del módulo de conteo

El firmware ya validó funcionalmente los seis sensores VL53L0X de forma
individual mediante secuenciación de pines XSHUT.

Los VL53L0X tienen dirección I2C predeterminada `0x29`. Como múltiples
sensores no pueden operar simultáneamente con la misma dirección, el
firmware debe:

1.  Poner todos los sensores en shutdown.
2.  Activar un sensor.
3.  Inicializarlo.
4.  Cambiar su dirección I2C.
5.  Activar el siguiente sensor.
6.  Repetir el procedimiento para los seis sensores.

Las direcciones deben asignarse cada vez que el sistema arranca, porque
el cambio de dirección no es permanente.

Una asignación posible es:

``` text
Sensor 1 -> 0x30
Sensor 2 -> 0x31
Sensor 3 -> 0x32
Sensor 4 -> 0x33
Sensor 5 -> 0x34
Sensor 6 -> 0x35
```

No asumir estas direcciones como requisito absoluto si el firmware
actual usa otra asignación. Revisar el código fuente antes de
modificarla.

## 8. VL53L0X

Los sensores VL53L0X son sensores de distancia Time of Flight.

Características relevantes para SAMAVI:

-   Comunicación I2C.
-   Dirección inicial `0x29`.
-   Alimentación del breakout de 3 V a 5 V.
-   El breakout incorpora regulación y adaptación de nivel.
-   Pin `SCL` para reloj I2C.
-   Pin `SDA` para datos I2C.
-   Pin `SHDN` o XSHUT para apagar individualmente el sensor.
-   El pin GPIO del sensor no es necesario para la implementación
    básica.
-   El rango típico documentado es aproximadamente 20 mm a 8200 mm.
-   En condiciones favorables puede alcanzarse mayor distancia en modo
    de largo alcance.

Para SAMAVI, el sensor se utiliza para detectar el paso de un huevo
mediante la interrupción del haz de medición.

La detección debe evitar múltiples incrementos para un mismo huevo. La
lógica de conteo debe considerar estados, umbrales de distancia y recuperación del
sensor, no simplemente incrementar el contador en cada lectura.

## 9. Módulo de conteo físico

La implementación actual contempla:

-   6 sensores VL53L0X, uno por compartimiento relevante de la máquina.
-   ESP32 como controlador con un board de expansión.
-   Wi-Fi del ESP32.
-   Alimentación por un adaptador DC 12V / 2A con jack de barril.

## 10. Comunicación del ESP32 con el backend

El flujo esperado es:

``` text
VL53L0X
   ↓
ESP32
   ↓
Conteo local
   ↓
MQTT
   ↓
Mosquitto
   ↓
Backend Node.js
   ↓
Persistencia PostgreSQL
```

El proyecto documenta el tópico:

``` text
samavi/conteo
```

El transporte MQTT debe utilizar TLS en el despliegue productivo.

La red Wi-Fi de la bodega puede presentar interrupciones debido a
condiciones eléctricas y del entorno. Por esta razón, el firmware debe
considerar desconexiones y sincronización posterior.

El conteo local no debe depender de que exista conexión permanente con
el backend.

## 11. Firmware

La estructura del firmware debe mantenerse modular.

Responsabilidades recomendadas:

``` text
firmware/
├── src/
│   ├── main.cpp
│   ├── sensors/
│   ├── buttons/
│   ├── display/
│   ├── counter/
│   ├── mqtt/
│   └── config/
└── ...
```

La estructura real del repositorio tiene prioridad sobre esta estructura
conceptual.

El firmware debe separar:

-   Inicialización del hardware.
-   Inicialización de sensores.
-   Gestión XSHUT.
-   Lectura de sensores.
-   Detección de paso de huevo.
-   Conteo.
-   Corrección manual.
-   Actualización de pantalla.
-   Conectividad Wi-Fi.
-   Publicación MQTT.
-   Recuperación ante desconexiones.

Evitar colocar toda la lógica dentro de `main.cpp`.

## 12. Lógica de conteo

El conteo representa huevos detectados, no bandejas.

Una vez finalizado el proceso, el sistema puede convertir huevos a
bandejas cuando corresponda:

``` text
bandejas_completas = huevos / 30
```

Los huevos sobrantes no deben convertirse automáticamente en una bandeja
completa.

El proceso operativo considera que una bandeja incompleta no cuenta como
producción vendible.

## 13. Roles del sistema

Los roles documentados incluyen:

-   Administrador.
-   Dueña.
-   Vendedor.
-   Galponero.

Debe existir una separación clara de permisos.

El sistema utiliza autenticación basada en JWT y autorización basada en
RBAC.

Las contraseñas no deben almacenarse en texto plano. La documentación
establece bcrypt para su verificación.

## 14. Dominio principal

El modelo relacional documentado utiliza PostgreSQL y contiene 19
tablas.

Revisar el archivo `/database/schema.sql` para el esquema de datos.

No crear nuevas entidades o cambiar relaciones importantes sin revisar
primero el modelo existente y el código del backend.

## 15. Flujo de negocio TO-BE

### Clasificación y conteo

``` text
Huevo pasa por compartimiento
        ↓
VL53L0X detecta
        ↓
ESP32 valida evento
        ↓
Incrementa conteo
        ↓
Actualiza pantalla
        ↓
Publica conteo por MQTT
        ↓
Backend registra
```

El usuario puede corregir manualmente el conteo.

### Pedido

El Vendedor registra el pedido por mayorista en el transcurso del día.

El sistema puede sugerir una distribución equitativa de bandejas entre
galpones según inventario disponible.

### Venta

El Vendedor registra la venta real.

Si la venta difiere del pedido original, el sistema ajusta el inventario
y calcula los ingresos.

Al confirmar, se descuenta el inventario correspondiente.

### Cierre semanal

El sistema consolida:

-   Producción.
-   Ventas.
-   Bodega.
-   Gastos.
-   Prorrateo.
-   Ganancia por galpón.
-   Distribución por socio.

El cálculo del prorrateo debe respetar la fórmula validada por el
negocio.

## 16. Requisitos no funcionales relevantes

Los requisitos documentados incluyen:

-   Disponibilidad objetivo de 99.9%.
-   Copias de seguridad cada 12 horas.
-   Al menos 3 usuarios simultáneos.
-   Cifrado de información confidencial.
-   RBAC.
-   Auditoría de transacciones.
-   Gran enfoque en diseño responsivo.
-   Compatibilidad con Android.
-   Recuperación ante caída en máximo 20 minutos.

## 17. Restricciones del entorno

El hardware estará en una bodega agrícola.

Debe considerarse:

-   Polvo.
-   Humedad.
-   Intermitencias eléctricas.
-   Fluctuaciones de energía.
-   Posibles interrupciones de Wi-Fi.
-   Necesidad de mantener costos bajos.
-   Operación por personal no especializado en software.

La solución debe priorizar robustez y facilidad de recuperación.

## 18. Principios de desarrollo

### No romper decisiones arquitectónicas existentes

Antes de cambiar el stack o introducir una tecnología nueva, revisar la
documentación y el código existente.

### Hardware primero, abstracciones después

Cuando se modifique el firmware:

1.  Verificar el pinout real.
2.  Verificar voltajes.
3.  Verificar direcciones I2C.
4.  Verificar conflictos de GPIO.
5.  Probar cada componente de forma aislada.
6.  Integrar.
7.  Probar el flujo completo.

### No asumir el hardware por el nombre comercial

Para sensores, displays y módulos, verificar el modelo exacto y el
controlador.

### Manejar fallos de conectividad

La pérdida de Wi-Fi no debe borrar el conteo local.

### Mantener trazabilidad

Los eventos relevantes deben poder auditarse.

### No ocultar incertidumbre

Si un dato no está definido en la documentación o el código, marcarlo
como pendiente en lugar de inventarlo.

## 19. Fuente de verdad

Utilizar esta prioridad para resolver contradicciones:

1.  Código actual del repositorio.
2.  Configuración actual del proyecto.
3.  Decisiones técnicas explícitas tomadas durante la implementación.
4.  Documento técnico principal actualizado.
5.  Informe de levantamiento de información.
6.  Documentación externa de componentes.
7.  Suposiciones o conocimiento general.

Si una decisión reciente del desarrollo contradice una versión anterior
de la documentación, conservar la decisión actual y documentar el cambio
cuando corresponda.

## 20. Documentación base

Las fuentes principales del proyecto son:

-   Código fuente del repositorio.
-   Tablero Trello del projecto.
-   Documento principal de SAMAVI.
-   Infroem de Levantamiento de Información.
-   Documentación del sensor VL53L0X de Adafruit.

El informe de levantamiento establece que la bodega dispone de Wi-Fi y
que el entorno presenta polvo, humedad e intermitencias eléctricas.

El documento técnico establece la arquitectura con ESP32, VL53L0X, MQTT,
Mosquitto, Node.js, Express, PostgreSQL, Prisma, React, TypeScript,
Material UI, nginx y Docker Compose sobre AWS Lightsail.

## 21. Reglas para agentes de desarrollo

Al trabajar sobre SAMAVI:

-   Leer primero el código relacionado antes de modificarlo.
-   No inventar pines.
-   No inventar direcciones I2C.
-   No eliminar lógica existente sin entender su propósito.
-   Mantener compatibilidad con ESP32.
-   Mantener MQTT como mecanismo de comunicación del módulo de captura
    con el backend, salvo decisión explícita de arquitectura.
-   Mantener PostgreSQL como base de datos.
-   Mantener Node.js + Express para el backend.
-   Mantener React + TypeScript + Material UI para el frontend.
-   Mantener Prisma como ORM cuando corresponda.
-   Mantener JWT y RBAC para autenticación y autorización.
-   Considerar funcionamiento offline temporal del módulo de captura.
-   No almacenar secretos en el repositorio.
-   No introducir credenciales reales en código.
-   Documentar cambios en el README y archivos `.md` necesarios para que la información siempre esté actualizada.
-   Probar componentes individualmente antes de realizar integración.
-   No modificar el modelo de datos sin revisar dependencias del backend
    y frontend.
-   No modificar contratos MQTT sin revisar firmware y backend.
-   No considerar una bandeja incompleta como producción completa.
-   Recordar que una bandeja completa equivale a 30 huevos.
-   Respetar los roles y permisos definidos.
-   Mantener auditoría de operaciones importantes.

## 22. Comandos y convenciones útiles

Categorías:

``` text
Y
Ex
AA
A
B
C
P
Q
```

Tópico MQTT documentado:

``` text
samavi/conteo
```

Dirección inicial de VL53L0X:

``` text
0x29
```

Direcciones de ejemplo para múltiples sensores:

``` text
0x30 - 0x35
```

Bandeja:

``` text
30 huevos
```

Backend:

``` text
Node.js
Express 5
Prisma
PostgreSQL
```

Frontend:

``` text
React
TypeScript
Material UI
nginx
```

Infraestructura:

``` text
Docker Compose (PostgreSQL y Mosquitto)
AWS Lightsail
Mosquitto
```

## 23. Qué debe hacer un agente antes de implementar

Antes de escribir código:

1.  Identificar si la tarea corresponde a firmware, backend, frontend,
    infraestructura o documentación. Si no es claro, preguntar.
2.  Revisar archivos existentes relacionados con la tarea.
3.  Identificar contratos entre módulos.
4.  Identificar pines y periféricos involucrados.
5.  Verificar dependencias.
6.  Verificar que el cambio no contradiga la arquitectura.
7.  Implementar el cambio mínimo necesario.
8.  Ejecutar pruebas o compilación.
9.  Revisar errores.
10. Resumir exactamente qué se modificó y qué queda pendiente.

## 24. Criterio de calidad

Una implementación se considera adecuada cuando:

-   Funciona con el hardware definido.
-   No depende de supuestos no documentados.
-   Tolera desconexiones razonables.
-   Mantiene consistencia entre firmware, backend y frontend.
-   Respeta los contratos de datos.
-   Es trazable.
-   Puede probarse.
-   Puede mantenerse por otro desarrollador.
-   No introduce secretos ni configuraciones sensibles en el código.
