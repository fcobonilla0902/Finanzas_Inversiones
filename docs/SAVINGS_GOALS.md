# Deuda y metas de ahorro

El dashboard muestra la deuda registrada de cada tarjeta y el total hasta hoy. Los saldos a favor de una tarjeta no reducen la deuda de otra. Se incluyen tarjetas archivadas: archivar no cancela una deuda. Los pagos se registran como transferencias hacia la tarjeta.

La sección **Metas** permite crear, editar, archivar y reactivar objetivos a corto, mediano y largo plazo. «Ahorrado hasta ahora» es de solo lectura: suma los saldos actuales registrados en inversiones, cuentas de débito, ahorro y efectivo. Los gastos y pagos a tarjetas lo reducen al guardarse; las transferencias entre esas cuentas no duplican el ahorro. Cada meta usa el mismo total como referencia, sin reservarlo por separado.

## Estimación

Puedes elegir ingresos menos gastos registrados en el mes actual hasta hoy, o introducir un presupuesto mensual previsto. El mes incompleto no se extrapola. En el presupuesto incluye los pagos de deuda y compromisos que quieras reservar: las transferencias para pagar tarjetas no cuentan como gastos registrados.

Cada meta activa pendiente usa la capacidad mensual completa como referencia independiente. Por ejemplo, $10,980 de capacidad son $10,980 al mes en cada meta, no $5,490 por tener dos. Las metas alcanzadas y archivadas no reciben una proyección de nuevas aportaciones.

El plazo es el importe pendiente dividido entre la capacidad mensual, redondeado hacia arriba. Supone que priorizas esa meta; no que aportas la capacidad completa a todas simultáneamente. No incluye rendimientos de inversión estimados. Si no hay capacidad positiva, no se calcula un plazo. El avance usa los saldos registrados, sin tener que editar manualmente el importe ahorrado.

## Persistencia y comprobaciones

La migración `20261108082718_savings_goals.sql` está aplicada en Supabase. Las tablas `savings_goals` y `savings_plans` tienen RLS por usuario, restricciones de importes y actualización de fechas. No modifica cuentas ni movimientos existentes.

Se verificaron restricciones, aislamiento entre dos usuarios y operaciones de edición/archivo mediante SQL real dentro de una transacción revertida. Las pruebas de navegador usan datos sintéticos y no guardan información financiera en el proyecto real. La revisión responsive usa Chrome con tamaños de iPhone, sin sustituir una prueba física en Safari.

Evidencia visual local: `artifacts/goals-review/visual-evidence.json`.
