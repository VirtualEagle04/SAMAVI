# Descripción del proyecto

SAMAVI significa Sistema de Gestión Avícola El Samán. Es una plataforma para digitalizar la producción, el inventario, los pedidos, las ventas y la consolidación financiera de una granja avícola.

## Problema

El proceso operativo depende de registros manuales en cuadernos, dictado oral, fotografías y consolidación posterior. El punto principal de intervención es la clasificación y el conteo de huevos, porque la máquina clasificadora no ofrece una salida digital.

SAMAVI incorpora un ESP32 y sensores ópticos para capturar los huevos que pasan por los compartimientos de clasificación, conservar el conteo local y transmitirlo al backend.

## Objetivos funcionales

- Contar huevos por categoría de peso durante la clasificación.
- Mostrar el conteo en pantallas locales y permitir correcciones manuales.
- Enviar los conteos al backend mediante MQTT.
- Registrar producción, inventario, pedidos y ventas.
- Gestionar precios por categoría y mayorista.
- Calcular ganancias, gastos y saldos según reglas aprobadas por el negocio.
- Mostrar información de acuerdo con el rol del usuario.
- Generar reportes, alertas y permitir la migración de registros históricos.

El proyecto se desarrolla como trabajo de grado de Ingeniería de Sistemas de la Universidad El Bosque para la Granja El Samán.
