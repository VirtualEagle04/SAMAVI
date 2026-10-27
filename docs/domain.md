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

## Cierre semanal y prorrateo

Reglas confirmadas por el negocio:

- La semana productiva va de viernes a jueves (zona Bogotá) y se cierra el jueves. Se identifica por su viernes.
- Un gasto se divide en partes iguales entre los galpones que la dueña elige para ese gasto; la elección cambia de una semana a otra.
- Los insumos entregados a un galpón (`CONSUMO_GALPON`, menos las `DEVOLUCION`) son gasto directo de ese galpón, a su costo unitario.
- Si una venta registra de qué galpón salió cada bandeja, el ingreso va a ese galpón. Si no (por ejemplo, ventas históricas), las bandejas se prorratean según lo disponible por galpón: producción de la semana más bodega inicial.

El prorrateo de bandejas sigue el cálculo manual de Carlos Andrés (semana 7-13 ago 2026): las bandejas vendidas de cada categoría **a cada precio** se dividen por separado en proporción a lo disponible por galpón, en bandejas enteras, y el ingreso de cada galpón es `bandejas × precio`. Por ejemplo, las 64 bandejas de Extra a $14.000 quedan 24/12/28 entre los galpones 1, 3 y 4, y las 41 a $15.000 quedan 16/8/17. Lo que no se vende es el restante en bodega del galpón. Si el redondeo deja a un galpón con más bandejas de las que tenía (pasa cuando se vende toda la categoría), se pasa una bandeja a un galpón al que le falten.

Cálculo por galpón: `resultado = ingresos - insumos - gastos`. Lo repartible se divide entre los socios según `inversion_socio.porcentaje_inversion`, que debe sumar 100 % por galpón. Los montos se calculan en centavos y los residuos se asignan por mayor residuo para que los repartos cuadren con el total.

Supuesto pendiente de confirmar con el negocio: un galpón con pérdida reparte 0 y el déficit queda como deuda del galpón, que se abona con sus ganancias de las semanas siguientes antes de repartir. No afecta a otros galpones. Falta confirmar quién financia ese préstamo (la dueña o los otros galpones) y si genera intereses. El cuaderno de la semana 7-13 ago 2026 contradice este supuesto. En el Galpón 5 (inicio del ciclo productivo):

- El alimento (pedido de 35 bultos x $73.541 = $2.573.935) no entra en los gastos del galpón: los socios lo pagan directamente al proveedor (Italcol) según su porcentaje (Mauricio $1.286.967, Marthica y M.F.D $643.483).
- El "saldo gastos" ($637.500 - $321.000 = $316.500) también lo ponen los socios por porcentaje (Mauricio $158.250, Marthica y M.F.D $79.125), anotado como pago a Humberto.

Es decir, la pérdida la cubren los socios del propio galpón y no queda como deuda. Falta confirmar si es la regla general y qué papel tiene Humberto en ese pago.

Proceso: un cierre exige que la semana haya terminado, que cada galpón activo tenga cierre diario los siete días y que la semana anterior esté cerrada si ya hay cierres. Al confirmar, los valores quedan guardados (también el detalle de cada galpón: bandejas vendidas por categoría y precio, insumos y bandejas disponibles, en `cierre_semanal_galpon.detalle`) y no se pueden agregar ni borrar gastos de esa semana; solo se puede reabrir el último cierre, y queda en la auditoría. Las ventas y los movimientos de insumos no se bloquean en semanas cerradas.

Discrepancia conocida: el resumen semanal del dashboard toma, sin fecha, los siete días que terminan en el último cierre diario, no la semana de viernes a jueves.

Validación contra la semana 7-13 ago 2026 (datos semilla). La fuente son las fotos del cuaderno (producción, ventas y el prorrateo de Carlos Andrés por galpón); la semilla y la planilla de apoyo se transcribieron de ellas. Ventas ($14.016.000) y gastos por galpón ($4.015.724, $3.995.806, $2.908.232 y $637.500) coinciden con el cuaderno. Los ingresos por galpón difieren en $35.000 en total, que el prorrateo del cuaderno suma de más:

- B: el cuaderno reparte 59 bandejas (le da las 10 del Galpón 5 a ese galpón) pero se vendieron 56; el resumen de producción dice 19 de B en bodega y los restantes por galpón suman 16. La semilla de `bodega` del 2026-08-13 copia esos 16.
- Q: el cuaderno cobra las 11 bandejas a $10.000, pero una se vendió a $8.000 (Humberto).
- A a $13.000: el cuaderno reparte 11/17/7 y la proporción da 11/16/8. En AA, donde se vendió todo, el cuaderno mueve la bandeja sobrante en el precio de $14.000 y el sistema en el de $12.500.
- Los quebrados regalados ("-1" por galpón y "3 consumo" en la hoja de producción; "Consumo Diego Q 1" en ventas) no se registran en el sistema, así que lo disponible de Q queda en 5/4/5 en lugar de 4/3/4. Falta definir cómo registrar ese consumo.

Otras observaciones del cuaderno:

- Reparto entre socios: el cuaderno trunca a pesos enteros (Galpón 3: $582.347, $291.173 y $291.173, que suman $1 menos que el saldo). El sistema conserva centavos ($291.173,50). Falta confirmar si se redondea a pesos.
- Galpón 3: el cuaderno anota "bandejas 6 x 35.000" sin valor y no lo suma al total; la semilla tampoco lo incluye.
- Galpón 5, Pipo: los valores diarios de la hoja de producción suman 10, pero el total anotado es 12 y se vendieron 12. La semilla de `cierre_diario` tiene los diarios (10).
- Ventas que no entran al prorrateo: gallinas (Jaime 4, Rosario 4, "1 gallina x 15.000 = 45.000" el martes y "Gallinas 3 x 15.000" el jueves). Falta definir a qué galpón o socio corresponde ese ingreso.
- Ventas fiadas: Jaime y Orlando deben sus quebrados del martes; el prorrateo las cuenta como vendidas. El sistema no registra cartera.

Los gastos de la semilla reproducen los del cuaderno. El alimento y el transporte de bultos se cargan como gastos de un solo galpón porque la semilla no tiene insumos; en uso real el alimento entregado a un galpón es un consumo de insumo. El pedido de alimento del Galpón 5 no está en la semilla porque no es gasto del galpón (ver arriba). En el cuaderno, el transporte del Galpón 4 es de 28 bultos aunque el pedido es de 26, y el del Galpón 5 es de $160.000 (40 bultos) con un pedido de 35: falta confirmar en qué se basa el transporte.

Las reglas no confirmadas deben marcarse como pendientes. No deben convertirse en constantes o cálculos sin evidencia en código, pruebas o documentación aprobada.
