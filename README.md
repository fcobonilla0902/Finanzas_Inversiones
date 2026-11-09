# Finanzas

Aplicación personal en español y MXN. React 19, TypeScript estricto, Vite, Tailwind 4, botón con patrón shadcn/Radix, Lucide, Recharts, React Router, React Hook Form y Zod. Backend exclusivo de Supabase.

## Inicio local

Requiere Node 22.12 o posterior (probado con 22.13), npm y un proyecto Supabase nuevo.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Sin variables de entorno se puede explorar la interfaz vacía y usar el simulador. Las operaciones persistentes están deshabilitadas; no existe un backend simulado ni datos financieros en localStorage.

## Supabase

En proyectos nuevos aplica todas las migraciones de `supabase/migrations` en orden: base, rendimientos, metas de ahorro, compras a meses y días de corte/pago. En el proyecto conectado ya están aplicadas.

El dashboard incluye deuda por tarjeta y progreso de ahorro. El menú **Metas** permite organizar objetivos a corto, mediano y largo plazo y estimar su plazo con registros actuales o un presupuesto mensual. Consulta [las reglas de cálculo](docs/SAVINGS_GOALS.md).

1. Ejecuta `supabase/migrations/20261108073234_foundation.sql` en el editor SQL de un proyecto nuevo **antes de registrar usuarios**. Alternativamente usa Supabase CLI y `supabase db push` contra un proyecto de desarrollo vinculado.
2. En `.env`, configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con la URL y clave pública/anon. Nunca uses una clave `service_role`.
3. En Auth habilita email y contraseña, configura Site URL (`http://localhost:5173`) y las URLs permitidas de producción. Mantén activada la confirmación de correo.
4. Reinicia Vite. Registra un usuario, confirma su correo e inicia sesión. El trigger de registro crea el perfil y las 19 categorías iniciales.
5. Crea una cuenta con su saldo inicial y registra movimientos. Crea dos cuentas para probar transferencias.

La migración usa RLS y relaciones compuestas con `user_id` que impiden enlazar registros de otro usuario. Los montos son `numeric(15,2)` en PostgreSQL, limitados al rango seguro de centavos de JavaScript. La app usa centavos enteros para balances; el simulador emplea coma flotante porque es una proyección.

Las sesiones se guardan en localStorage para conservar el acceso al recargar. La app cierra la sesión local una hora después del último inicio de sesión, sin extender ese plazo al recargar o renovar el token; comprueba también el vencimiento al volver a la pestaña. Este plazo se aplica en el cliente, no sustituye las políticas de sesión del servidor. La preferencia de tema también se guarda en localStorage. No hay caché offline ni service worker en esta fase. La aplicación necesita conexión para guardar.

## Reglas contables

Las compras con tarjeta permiten consultar contado y mensualidades en **Compras con tarjeta de crédito**, con filtros por tipo, estado, tarjeta y categoría. «Pagué a tiempo mi tarjeta de crédito» registra una transferencia completa del periodo y actualiza automáticamente los pendientes y el avance, sin duplicar abonos históricos. [Detalles y límites](docs/CREDIT_INSTALLMENTS.md).

- Saldos iniciales firmados; una deuda de $500 se registra como `-500.00` en una cuenta de crédito.
- Ingreso suma al saldo; gasto resta. Transferencia resta de origen y suma a destino en una única fila atómica.
- Transferencias a cuentas de inversión y pagos de tarjeta no generan ingresos ni gastos; conservan patrimonio.
- Disponible excluye cuentas de inversión y crédito. Patrimonio incluye todas las cuentas, incluso archivadas porque archivar no elimina dinero.
- Los filtros de dashboard afectan flujos y gráfica; los indicadores de patrimonio y disponible muestran la posición actual.
- El saldo inicial no tiene fecha histórica: el gráfico reconstruye movimientos sobre el saldo inicial actual. Modificarlo cambia el historial reconstruido. No son snapshots ni valuaciones de mercado.
- Moneda única MXN; multimoneda queda pendiente para evitar agregar saldos sin tipo de cambio.
- El simulador usa tasa nominal anual, frecuencia seleccionable y aportaciones al final de mes; no incluye inflación, impuestos ni comisiones.

## Verificación

```powershell
npm test
npm run build
npm run preview
```

Pruebas de centavos, balances, transferencias, pagos de deudas, patrimonio, interés compuesto, rendimiento estimado, ahorro y cálculo base de presupuestos. Para validar RLS con un proyecto real: crea dos usuarios, comprueba que cada uno solo lee sus filas y que no puede insertar o modificar movimientos con cuentas/categorías del otro. Prueba alta, edición, eliminación, archivo y recarga desde dos sesiones. Estas verificaciones de integración requieren un proyecto configurado y no se presentan como ejecutadas.

## Alcance entregado

Fase 1: sistema visual responsive, navegación de escritorio y móvil con safe areas, claro/oscuro/sistema, componentes reutilizables, estados vacíos y errores, dashboard conectado a registros reales, gráficas de patrimonio y categorías.

Fase 2: integración Supabase, login, registro y recuperación de contraseña, rutas privadas cuando existe configuración, esquema/migración/RLS, creación y edición/archivo de cuentas, creación, renombrado y archivo de categorías, alta/edición/eliminación confirmada de movimientos, transferencias, búsqueda y filtros por cuenta/categoría/fecha y periodos del dashboard. Sin credenciales, la integración está preparada y requiere validación real.

Adelanto de fase 3: simulador funcional. **Pendientes:** gestión y valuaciones de inversiones, rendimientos reales/devengados, escenarios comparados, notas/etiquetas/subcategorías, recurrencias, paginación visual de historiales grandes, comparaciones avanzadas, presupuestos y metas persistentes, PWA e íconos, pruebas en un iPhone físico y auditoría manual completa de accesibilidad. El helper de presupuesto tiene pruebas, pero no constituye un módulo implementado.

## Arquitectura

`src/lib/finance.ts`: funciones financieras puras; `src/lib/supabase.ts`: cliente opcional; `src/lib/repository.ts`: lectura completa paginada; `src/features`: pantallas y flujos por módulo; `src/components/ui`: componentes base con patrones shadcn/Radix; `src/App.tsx`: shell y rutas; `src/design.css`: tokens, temas y diseño mobile-first. El anterior `styles.css` fue sustituido para evitar dos sistemas visuales en paralelo. En las siguientes fases, añadir tipos generados con Supabase CLI y consultas agregadas del servidor para historiales grandes.

## Despliegue posterior en Vercel

Importa el repositorio, selecciona Vite, build `npm run build`, salida `dist`, configura las dos variables públicas y actualiza las URLs de Auth en Supabase. `vercel.json` resuelve las rutas de la SPA. No se ha publicado ni integrado a main; revisar primero la rama de desarrollo. La instalación en iPhone como PWA corresponde a fase 5; actualmente se puede abrir como web responsive en Safari.


La configuración `.npmrc` evita un fallo de npm 11 al resolver peers opcionales de Vitest. Los peers necesarios de producción están declarados explícitamente y se verifican con el build. Las dependencias están fijadas y `package-lock.json` permite instalaciones reproducibles con `npm ci`.

## Resultado de verificaciones locales

- `npm test`: 8 pruebas aprobadas con Vitest 4.1.12.
- `npm run test:ui`: 16 pruebas aprobadas, combinando cuatro flujos con escritorio/móvil y claro/oscuro; sin infracciones detectadas por axe en las pantallas y diálogos evaluados.
- `npm run build`: TypeScript y compilación de producción aprobados. Los archivos de gráficos y React se separan en paquetes menores de 500 kB. Rollup muestra avisos no bloqueantes sobre comentarios de anotación de Zod y un chunk vacío de Supabase cuando no existen variables de entorno.
- Instalación final: auditoría npm con 0 vulnerabilidades reportadas.
- Preview de producción: HTTP 200 y HTML de la SPA en `/`, `/movimientos`, `/cuentas`, `/inversiones` y `/configuracion`; el servidor se detuvo al terminar.
- Se realizaron capturas e inspección visual con Chrome en escritorio 1440 × 1000 y emulación móvil 390 × 844 en ambos temas, más comprobación de overflow a 320 px. La emulación móvil no es una prueba de Safari/iOS real.
- La migración `foundation` ya está aplicada en Supabase. Se verificaron las cuatro tablas, RLS y operaciones de movimientos mediante una transacción real revertida, sin datos de prueba persistentes. Detalles en [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Falta probar el flujo completo del navegador con un usuario personal.

## Diseño y QA visual

El sistema de diseño se definió antes del rediseño en [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Incluye paletas independientes, Manrope variable autoalojada, tokens semánticos de Tailwind, escala tipográfica, espaciado, estados, microinteracciones y reglas de accesibilidad. Las skills `frontend-design`, `ui-ux-pro-max` y `web-design-guidelines` no estaban instaladas; se consultaron las pautas de diseño y preview local de la skill Sites disponible.

```powershell
npm run test:ui
```

Requiere Google Chrome instalado. Playwright inicia y detiene su propio Vite en `127.0.0.1:4175`, sin claves de Supabase. La suite cubre las cinco rutas, claro/oscuro/sistema, persistencia del tema, simulador y leyendas interactivas, validación y guardado aislado, confirmación de eliminación, foco y Escape, gráficas con fixtures y auditorías axe WCAG 2.1 AA. Las capturas quedan en `artifacts/ui/` y el reporte en `playwright-report/` (ambos ignorados por Git). Los fixtures de QA están únicamente en `tests/fixtures`, identificados como sintéticos y fuera del build de producción; no simulan una integración real ni guardan registros.

El registro rápido abre con foco en la cantidad y ofrece selectores Gasto/Ingreso/Transferencia, validaciones enlazadas a cada campo y hoja inferior en móvil. Los diálogos de registro, renombrado y eliminación utilizan Radix. Las gráficas comparten paleta y tooltip, ofrecen resúmenes textuales y respetan movimiento reducido. La suite automatizada complementa la inspección visual; no certifica conformidad completa de accesibilidad.

## Rendimientos estimados por cuenta

Las cuentas de inversión permiten indicar una tasa anual opcional. El dashboard calcula estimaciones por día, semana, 30 días y 365 días, sin crear ingresos ni aumentar saldos automáticamente. Las cuentas existentes pueden configurarse desde Cuentas → Editar. La migración está aplicada en Supabase. Consulta [docs/INVESTMENT_RETURNS.md](docs/INVESTMENT_RETURNS.md) para la fórmula y las verificaciones.
