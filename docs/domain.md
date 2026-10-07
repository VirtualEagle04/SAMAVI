# Dominio

SAMAVI digitaliza la recolección, clasificación, inventario, pedidos, ventas y consolidación de una granja avícola.

## Conteo

Las categorías documentadas son:

| Código | Categoría | Peso |
| --- | --- | --- |
| Y | Yumbo | 78 g o más |
| Ex | Extra | 67 g a 77 g |
| AA | AA | 60 g a 66 g |
| A | A | 53 g a 59 g |
| B | B | 46 g a 52 g |
| C | C | 45 g |
| P | Pipo | Menos de 45 g |
| Q | Quebrados | No depende del peso |

Una bandeja completa contiene 30 huevos, con disposición 5 x 6. Los huevos quebrados se registran manualmente y no tienen sensor.

El firmware cuenta huevos detectados, no bandejas. Los huevos sobrantes no forman automáticamente una bandeja completa. La conversión conceptual es `bandejas_completas = huevos / 30`, aplicando la regla de negocio vigente para contabilizar sobrantes.

## Roles

Los roles actuales están documentados en `database/schema.sql`, como registros de las tablas `rol`, `permiso` y `rol_permiso`. Las capacidades deben estar protegidas por autenticación JWT y autorización RBAC.

## Flujos

El sistema contempla producción por galpón, por categoría y por fecha, inventario de insumos, pedidos de mayoristas, ventas, precios, gastos, cierres semanales, prorrateo y reportes. La fórmula de prorrateo debe confirmarse con el negocio antes de implementarse o modificarse.

En una venta, una diferencia respecto al pedido original debe ajustar el inventario y los ingresos. Al confirmar la venta, se descuenta el inventario correspondiente. El cierre semanal consolida producción, ventas, bodega, gastos, prorrateo, ganancia por galpón y distribución por socio.

Las reglas no confirmadas deben marcarse como pendientes. No deben convertirse en constantes o cálculos sin evidencia en código, pruebas o documentación aprobada.
