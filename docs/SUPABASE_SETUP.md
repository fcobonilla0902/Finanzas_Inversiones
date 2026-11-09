# Supabase conectado

## Migración aplicada

Proyecto: `mfwoyowhtefpxcddpsmn`.

La migración `foundation` se aplicó correctamente y Supabase la registró con versión `20261108073234`. El archivo local se sincronizó con esa versión: `supabase/migrations/20261108073234_foundation.sql`. No volver a ejecutar manualmente esta migración en el mismo proyecto.

La URL y la clave pública están en `.env.local`, excluido de Git. La conexión OAuth administrativa se reutilizó en memoria; no se guardaron tokens administrativos en el repositorio ni se mostraron en la salida.

## Verificaciones realizadas

- Esquema público sin tablas ni migraciones previas; sin usuarios antes de aplicar.
- Creación de profiles, accounts, categories y transactions, con claves foráneas, índices y validaciones.
- RLS activo y políticas de propietario para las cuatro tablas. Sin permisos de tabla para el rol anónimo.
- API de autenticación con respuesta HTTP 200 y registro por correo habilitado.
- API de tablas con respuesta 401/42501 para la clave pública sin sesión: acceso anónimo bloqueado, en lugar del error anterior de tabla inexistente.
- Prueba SQL real dentro de una transacción revertida: creación de dos usuarios temporales, perfiles y 19 categorías por usuario; cuentas, ingreso, gasto, transferencia, edición y eliminación.
- Comprobación bajo el rol authenticated y contexto auth.uid(): las cuentas y categorías de otro usuario no son visibles; se rechazan inserciones para otro usuario y movimientos que referencien cuentas ajenas.
- Se rechazan movimientos en cuentas archivadas.
- Después del rollback: cero usuarios, perfiles, cuentas, categorías y movimientos. No quedaron datos de prueba.

Evidencia local, excluida de Git: `artifacts/supabase-before.json`, `artifacts/supabase-migration-result.json`, `artifacts/supabase-verification.json` y `artifacts/supabase-rollback-result.json`.

## Primer uso

1. Recargar la aplicación. Si sigue mostrando la interfaz sin conexión, reiniciar Vite para que tome `.env.local`.
2. Registrar tu usuario y confirmar el correo.
3. Iniciar sesión y crear una cuenta financiera con saldo inicial.
4. Registrar ingresos y gastos; crear una segunda cuenta para transferencias.

No se creó un usuario personal ni se envió correo durante la verificación. La prueba SQL confirma el comportamiento de la base, pero todavía no constituye una prueba de extremo a extremo desde el navegador con tu usuario. Las sesiones de la aplicación permanecen en memoria y una recarga requiere iniciar sesión.

## Rendimiento anual por cuenta

También está aplicada la migración `20261108075638_account_annual_returns.sql`. Añade una tasa anual opcional a las cuentas de inversión, con validaciones de rango y tipo, sin modificar saldos ni movimientos existentes. Se comprobó mediante pruebas SQL con rollback. El comportamiento y el cálculo están documentados en `INVESTMENT_RETURNS.md`.

## Metas de ahorro

También está aplicada `20261108082718_savings_goals.sql`: metas y presupuesto mensual, protegidos con RLS por usuario. Se comprobaron sus restricciones y aislamiento con SQL y rollback. Consulta `SAVINGS_GOALS.md` para el cálculo de plazos y las reglas de deuda.

## Compras a meses

Está aplicada `20261108143020_credit_installments.sql`. Añade plazo y mensualidades pagadas a los gastos con tarjeta y conserva la RLS de movimientos. Las restricciones y el aislamiento se comprobaron con SQL y rollback. Consulta `CREDIT_INSTALLMENTS.md` para las reglas contables y el seguimiento manual.

## Días de corte y pago

Está aplicada `20261108195920_card_billing_days.sql`. Añade días mensuales opcionales a las tarjetas, con validación de rango y pares completos. No cambia saldos. Se comprobaron validaciones y RLS con SQL y rollback. Consulta `CARD_BILLING.md` para el calendario estimado, el filtro por categoría y la exportación a Excel.
