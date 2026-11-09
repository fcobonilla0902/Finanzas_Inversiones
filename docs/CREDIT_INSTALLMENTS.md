# Compras con tarjeta de crédito

También puedes filtrar por categoría, configurar corte y pago mensual en las tarjetas, consultar las mensualidades del mes y exportar a `.xlsx`. Consulta [Corte, pagos del mes y Excel](CARD_BILLING.md).

Al registrar o editar un gasto con una tarjeta de crédito puedes seleccionar una sola exhibición o un plazo de 2 a 120 meses entre las opciones disponibles. Para compras a meses también puedes indicar las mensualidades ya pagadas.

La sección **Compras con tarjeta** incluye compras de contado y a meses. Aparece en el menú de escritorio, en Movimientos y en el resumen de tarjetas del dashboard. En móvil la tabla tiene desplazamiento horizontal dentro de su contenedor. Incluye descripción, tarjeta, fecha, importe total, plazo, meses pagados y pendientes, próxima mensualidad y monto por cubrir. Puedes filtrar por contado, meses o todas, estado, tarjeta y categoría; el total por pagar y el Excel siguen los filtros. En Movimientos, al filtrar una tarjeta, cada gasto indica contado o plazo, meses pagados y siguiente mes pendiente.

## Reglas

- El importe total se registra una sola vez como gasto. No se crean movimientos mensuales adicionales.
- El paso del tiempo no marca mensualidades pagadas. Puedes registrar el avance histórico manualmente; los pagos del botón de pago completo actualizan el avance visible automáticamente.
- Actualizar ese número no cambia el saldo de la tarjeta. Registra el pago real como una transferencia hacia ella. Las transferencias antiguas sin desglose se asignan de forma estimada; el botón de pago completo guarda las compras que cubre y actualiza el avance visible.
- Las mensualidades dividen el total registrado, sin añadir intereses ni comisiones. Si hay centavos sobrantes se reparten entre las primeras mensualidades para conservar exactamente el total.
- El resumen reconoce el avance manual y las transferencias sin duplicar esos abonos. El excedente de transferencias sobre los abonos marcados se aplica a vencimientos antiguos. El reparto entre compras es estimado y no altera los movimientos ni los saldos contables de las cuentas.
- Al cambiar a una cuenta que no es de crédito o a una sola exhibición se elimina el seguimiento de mensualidades, conservando el importe y la contabilidad del movimiento editado.
- Las tarjetas archivadas conservan sus compras. Reactiva la tarjeta para editar su avance, como exige la validación existente de movimientos.

## Pago completo a tiempo

«Pagué a tiempo mi tarjeta de crédito» pide la tarjeta, la cuenta de origen, la fecha y confirmar el importe completo del periodo seleccionado. Paga todas las compras que vencen hasta ese periodo, sin depender de los filtros de la tabla. Usa el corte y último día de pago configurados y no permite una fecha futura ni posterior al vencimiento.

La función `record_credit_period_payment` comprueba importe y saldo de origen y guarda una transferencia con el desglose de las compras cubiertas, en una sola operación. Un índice único impide duplicar el pago del mismo periodo. Los saldos pendientes y meses pagados visibles se recalculan con ese comprobante; los precios originales y el avance histórico manual no se sobrescriben.

Eliminar el pago desde Movimientos revierte su efecto en la cuenta y en las compras. Para corregir un pago o cambiar importe, fecha o plazo de una compra vinculada, primero elimina ese pago y regístralo de nuevo. Las transferencias antiguas sin desglose conservan su reparto estimado; los pagos nuevos de este botón tienen asignaciones explícitas.

Las migraciones son `20261109011155_credit_period_payments.sql`, `20261109011520_consume_credit_payment_context.sql` y `20261109014730_tighten_credit_payment_receipt_pair.sql`. Las pruebas SQL de `tests/sql/credit-period-payments.sql` usan datos sintéticos y rollback para verificar calendario, importes, duplicados, reversión y RLS.

## Persistencia y pruebas

La migración aplicada `20261108143020_credit_installments.sql` añade `installment_months` e `installments_paid` a `transactions`. Conserva la RLS existente; valida plazo, avance y tipo de cuenta, e impide cambiar una tarjeta a otro tipo mientras tenga compras a meses.

Se probaron restricciones y aislamiento entre usuarios en Supabase con transacción revertida, sin conservar datos de prueba. Las pruebas de interfaz usan fixtures aislados, con creación, edición, error y recuperación, pago completo, filtros y conservación de la deuda. Las capturas usan Chrome en escritorio y emulación de iPhone, sin sustituir Safari físico.
