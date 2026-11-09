# Rendimientos de cuentas de inversión

## Uso

En Cuentas, al crear o editar una Cuenta de inversión, aparece Rendimiento anual estimado (%). El campo es opcional, admite de 0 a 100 % y hasta cuatro decimales. Una tasa vacía significa que no está configurada; cero es una tasa válida. Cambiar la cuenta a otro tipo elimina la tasa al guardar. Archivar conserva el dato, pero excluye la cuenta de nuevas proyecciones.

En Inicio, Rendimiento de tus inversiones muestra las estimaciones diarias, semanales, a 30 días y a 365 días, el capital considerado y las tasas de las cuentas incluidas. Si ninguna tiene tasa, se ofrece un enlace para configurarlas. El bloque no aparece sin cuentas de inversión activas.

## Cálculo

Se consideran las cuentas de inversión activas con una tasa válida. Para cada una se calcula el saldo inicial más sus movimientos registrados hasta la fecha local actual, incluidas aportaciones y retiradas mediante transferencias. Se excluyen movimientos con fecha futura y los saldos negativos no generan una estimación positiva.

La base es interés simple, manteniendo capital y tasas constantes:

`estimación del periodo = suma(saldo de cada cuenta × tasa anual / 100) × días / 365`

Se agregan los resultados antes de redondearlos a centavos. Se usan periodos fijos de 1, 7, 30 y 365 días; no son ganancias históricas acumuladas ni se aplica interés compuesto. Los filtros del dashboard afectan los flujos registrados, pero no estos cuatro horizontes de proyección.

Ejemplo: $10,000 al 10 % anual produce estimaciones de $2.74 al día, $19.18 por semana, $82.19 por 30 días y $1,000 por año. No se descuentan impuestos o comisiones.

Las proyecciones no alteran saldos. Al activar la migración de abonos diarios, cada día cerrado genera un ingreso estimado en la cuenta de inversión: saldo al cierre × tasa anual / 100 / 365. El ingreso se registra con fecha del día siguiente y se reinvierte. No son rendimientos confirmados por el banco.

## Abono diario a medianoche

La migración `20261110010000_daily_investment_returns.sql` está aplicada al proyecto conectado. Se verificaron la función de sincronización, los permisos, RLS, la inicialización de todas las cuentas de inversión y la tarea Cron activa (`0 * * * *`). Una ejecución de comprobación con rollback devolvió cero abonos al activarse, sin sumar días previos.

El reloj de negocio usa `America/Mexico_City`. Cron comprueba los días cerrados al inicio de cada hora (incluida medianoche) y recupera ejecuciones omitidas. La app también sincroniza exclusivamente las cuentas del usuario al abrirse, volver al foco o cambiar de día. El proceso comienza al activarse, sin sumar días previos.

El control privado por cuenta evita duplicados y conserva fracciones de centavo. Depósitos, retiros y abonos anteriores afectan el siguiente saldo al cierre; se excluyen movimientos futuros. Los cambios de tasa, saldo inicial o archivo liquidan primero los días pendientes con los valores anteriores. Los movimientos retroactivos no recalculan ingresos ya registrados. No registres manualmente de nuevo un rendimiento ya contabilizado automáticamente.

Pruebas locales en PostgreSQL embebido, sin cambios persistentes:

```powershell
npm install --prefix artifacts/sql-check --no-save --package-lock=false @electric-sql/pglite
node tests/sql/check-investment-returns.mjs
```

Se verificaron medianoche, idempotencia, reinversión, aportaciones, retiros, fechas futuras, recuperación, fracciones de centavo, cambios de tasa, archivo, permisos y aislamiento por usuario. La extensión Cron y su tarea activa se comprobaron en Supabase después de aplicar la migración; queda por observar la primera ejecución programada a medianoche.

## Persistencia

La migración `20261108075638_account_annual_returns.sql` está aplicada en el proyecto de Supabase conectado. Añade `accounts.annual_return_rate numeric(7,4)`, nullable, con validaciones de rango y de tipo de cuenta. Las cuentas existentes quedan sin tasa y mantienen sus datos.

Se verificó la columna y, mediante una transacción con rollback bajo el rol authenticated, su creación, lectura, edición, precisión, tasa cero, valor nulo y rechazo de tasas negativas, superiores al límite o asignadas a cuentas de otro tipo. No quedaron datos de prueba. La evidencia está en `artifacts/supabase-annual-returns-migration.json` y `artifacts/supabase-annual-returns-verification.json`.

## Pruebas

14 pruebas financieras: cálculo de horizontes, redondeo agregado, movimientos futuros, aportaciones y retiradas, tasas distintas, cuentas archivadas, ausencia de tasa, tasa cero, saldos negativos y límites de entrada, además de las pruebas contables existentes.

Las pruebas de interfaz nuevas comprueban alta, edición, archivo, reactivación, cambio de tipo, ausencia de tasa, tasa cero, accesibilidad y tamaños de escritorio/iPhone en ambos temas. Los fixtures son sintéticos y no persisten datos. Las capturas inspeccionadas y el comprobante de fuentes están en `artifacts/investment-returns-review/visual-evidence.json`.

La verificación de interfaz usa Chrome emulado, no Safari en un iPhone físico. Las pruebas SQL y de interfaz se realizaron por separado: no se afirma haber enviado este formulario desde el navegador contra una cuenta personal real.

Resultado final: build aprobado, 14 pruebas financieras y 48 pruebas de interfaz aprobadas, incluidas las 8 nuevas de cuentas de inversión. Comprobadas edición y archivo, recuperación de filtros y formularios, temas, accesibilidad y responsive. La comparación visual y la integridad del comprobante de Uizze también se verificaron para el alcance de esta función.
