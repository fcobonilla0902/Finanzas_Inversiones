# Corte, pagos del mes y Excel

En **Cuentas**, crea o edita una tarjeta de crédito e indica sus días mensuales de corte y pago (1 a 31). Ambos son opcionales, pero deben configurarse juntos. Las tarjetas existentes conservan sus saldos y no reciben fechas supuestas.

En **Compras con tarjeta**, elige contado, meses o todas, estado, tarjeta, categoría y mes de pago. Los filtros cambian tanto la tabla como el total estimado y el Excel. Las categorías archivadas siguen disponibles para consultar compras anteriores.

## Calendario estimado

- Una compra hecha el día de corte o antes entra en ese corte. Una compra posterior pasa al corte siguiente.
- Si el día de pago es posterior al día de corte, el primer pago pertenece al mismo mes del corte. Si es anterior o igual, pertenece al mes siguiente.
- Cada mensualidad posterior se asigna al siguiente mes. Un día inexistente (por ejemplo, 31 de febrero) se ajusta al último día del mes, considerando años bisiestos.
- Ejemplo: corte 15 y pago 5; una compra del 15 de noviembre empieza a pagarse el 5 de diciembre. Una compra del 16 de noviembre empieza el 5 de enero.
- Las mensualidades marcadas como pagadas son las primeras N del calendario. El resumen separa la mensualidad del mes consultado de todas las anteriores que aún estén pendientes, conservando exactamente los centavos del importe total.
- El cálculo usa el avance manual **actual**, incluso al consultar meses pasados. Las transferencias se consideran solapadas con los abonos marcados; su excedente se aplica a los vencimientos más antiguos. Ese reparto es estimado porque no hay enlaces entre transferencias y compras. No reconstruye cuándo realizaste cada abono manual. Cambiar corte o pago recalcula el calendario.
- Los pagos nuevos de «Pagué a tiempo mi tarjeta de crédito» guardan su desglose explícito y se suman al avance histórico, sin duplicarlo. Se registran como una transferencia y pueden revertirse eliminando ese pago desde Movimientos.

En Inicio, «¿A dónde va tu dinero?» agrupa por categoría el pago pendiente de la tarjeta para el mes actual: mensualidades, compras de contado y atrasos. La otra gráfica agrupa los importes completos de los gastos registrados durante el mes calendario en todas las cuentas. No son el mismo indicador.

El resumen cubre compras de contado y a meses registradas con tarjetas de crédito. No representa el pago mínimo ni el importe completo del estado de cuenta: excluye intereses, comisiones y saldos iniciales. Las compras sin fechas configuradas quedan identificadas y excluidas del total parcial. Ajusta los días al calendario real de tu banco cuando cambien.

## Archivo Excel

**Exportar a Excel** genera un `.xlsx` local, sin enviar datos a otro servicio ni añadir dependencias de ejecución. La hoja **Compras** respeta los filtros de estado, tarjeta y categoría. Incluye importes numéricos, categoría, plazo, avance, mes consultado, mensualidad y fecha de pago. **Resumen** incluye el mes, los filtros aplicados, los importes del resumen y las compras sin calendario.

El texto se escribe como cadenas OOXML, incluyendo textos que empiezan con `=`, para evitar interpretarlos como fórmulas. Se verificaron los archivos descargados con `openpyxl`: estructura ZIP, hojas, filas filtradas e importes numéricos. No se probó Microsoft Excel de escritorio ni Safari físico.

Ambas hojas incluyen encabezados en color con ajuste de texto, anchos de columna definidos, alturas adaptadas al contenido, filas alternadas y primera fila fija. Los importes llevan formato de moneda y el total del resumen aparece resaltado. La hoja Compras incluye autofiltros. La fila Criterio se eliminó de Resumen. Es necesario exportar de nuevo para obtener el formato actualizado; los archivos descargados previamente no se modifican.

## Persistencia

La migración aplicada es `20261108195920_card_billing_days.sql`. Añade `statement_day` y `payment_day` a `accounts`, conserva la RLS e impide rangos inválidos, pares incompletos y fechas de facturación en cuentas que no sean de crédito. Se comprobaron restricciones y aislamiento con SQL real y rollback, sin conservar datos de prueba.

Evidencia local: `artifacts/billing-review/visual-evidence.json` y `artifacts/billing-review/excel-validation.json`.
