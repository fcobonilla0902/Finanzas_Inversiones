# Revisión visual · Anthropic y Uizze

## Resultado

- Build de producción y TypeScript aprobados tras la corrección final de la acción móvil.
- 8 pruebas financieras aprobadas. La segunda ronda completa de interfaz terminó con 32 pruebas aprobadas.
- Cuatro proyectos de Playwright: escritorio claro y oscuro (1440 × 1000), web móvil claro y oscuro (390 × 844).
- Comprobaciones adicionales a 320, 375, 430 y 844 px, incluyendo orientación horizontal de 844 × 390.
- Sin desbordamiento horizontal ni infracciones de axe en las reglas WCAG 2 A/AA y 2.1 AA evaluadas. No equivale a una auditoría completa.
- Prettier aprobó los archivos modificados. No se añadieron dependencias.

## Cambios revisados

Métricas agrupadas en una superficie, estados vacíos compactos sin gráficas ficticias, textos específicos por ruta, contador de pasos real y eliminación de decoración sin significado financiero. Formulario de movimientos con errores junto al campo y recuperación al corregir; sin teclado forzado al abrir en móvil. Búsqueda sin resultados con recuperación mediante Limpiar filtros. Simulador con parámetros agrupados y resultado visible junto al formulario en escritorio. Tooltips con fechas y años, y porcentajes por categoría.

La inspección de la primera ronda detectó que el botón flotante podía tapar campos. Se sustituyó por la misma acción en la cabecera de cada página, con nombre accesible y control táctil de 46 px en móvil. Se repitieron el build y las 32 pruebas; una comprobación geométrica confirma que la acción queda por encima del formulario en los anchos móviles evaluados.

## Evidencia

Se compararon las capturas finales con el sistema anterior y la lista explícita de mejoras, sin declarar fidelidad 1:1 a una imagen generada. Se inspeccionaron dashboards claros y oscuros, simulador oscuro en escritorio y móvil, gráficas con fixtures en claro/escritorio y oscuro/móvil, y validación y recuperación en móvil oscuro.

Las capturas finales y las dos capturas base están en `artifacts/design-review/`. El comprobante `visual-evidence.json` contiene hashes SHA-256 de 31 fuentes/activos, dimensiones reales de imágenes, tamaños de viewport, estados, pasos y limitaciones. El informe completo de Playwright está en `playwright-report/index.html`.

El verificador local de Uizze se ejecutó. No reportó archivos ausentes ni hashes obsoletos, pero el comprobante no obtiene aprobación global: mantiene la grabación de movimiento como bloqueada porque falta `ffmpeg-1013/ffmpeg-win64.exe`. No se instaló un codificador ni se afirmó haber revisado vídeo. Las pruebas normales se ejecutaron con movimiento reducido.

## Límites

No se probaron Safari ni un iPhone físico. La web móvil usa emulación de Chrome. Durante esta revisión visual el guardado de los tests fue sintético. Posteriormente se conectó Supabase, se aplicó la migración y se comprobaron operaciones SQL y RLS contra el proyecto real mediante rollback; el resultado está en `SUPABASE_SETUP.md`. Todavía no se probó el flujo completo de registro, correo y guardado desde el navegador con un usuario personal. El módulo de inversiones conserva su alcance de simulador, sin inventar posiciones ni rendimientos reales.

Vite excluye los artefactos de pruebas y el informe de su watcher para evitar recargas de desarrollo provocadas por capturas HTML de Playwright. Se conserva la arquitectura y las funcionalidades existentes.
