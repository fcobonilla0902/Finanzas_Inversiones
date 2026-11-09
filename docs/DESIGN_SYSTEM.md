# Finanzas · Sistema de diseño

Identidad: un espacio de finanzas personales con precisión bancaria y lectura tranquila. Tinta azul para patrimonio, petróleo para acciones y tonos cálidos para gastos. El patrimonio concentra el énfasis visual; indicadores, registros y formularios ofrecen una lectura más discreta. No se muestran saldos ni series inventadas.

## Tokens compartidos

| Rol | Claro | Oscuro |
| --- | --- | --- |
| Fondo | `#F2F5F8` | `#0C1724` |
| Superficie | `#FFFFFF` | `#142335` |
| Superficie secundaria | `#E9EFF4` | `#1C3045` |
| Texto | `#172D43` | `#EDF4FB` |
| Texto secundario | `#52677B` | `#A5B9CC` |
| Borde | `#D7E1EA` | `#2C4258` |
| Acción principal | `#006D77` | `#78D9DF` |
| Texto sobre acción | `#FFFFFF` | `#102D38` |
| Acento suave | `#E0F1F2` | `#193C49` |
| Gasto | `#A44731` | `#FFB298` |
| Patrimonio | `#153B53` | `#19435B` |

Los tokens semánticos en `src/design.css` gobiernan superficies, botones, campos, iconos, gráficas y tooltips. No añadir colores independientes en componentes nuevos salvo una excepción documentada.

## Tipografía y composición

Manrope variable autoalojada. Titulares de 28–36 px, patrimonio de 34–52 px, secciones de 16–18 px y texto de apoyo de 12–14 px. Importes con cifras tabulares y ajuste de líneas para valores largos. Las etiquetas usan mayúscula inicial y los títulos equilibran sus líneas.

Espaciado basado en 4 px. Controles con radio de 10 px, tarjetas de 20 px y diálogos de 24 px (28 px en hojas móviles). Contenido máximo de 1480 px, columnas desde 768 px y sidebar desde 1100 px. Patrimonio y primeros pasos comparten la primera fila; siguen los indicadores, las gráficas y el detalle de movimientos.

## Interacción y móvil

- Navegación inferior móvil con destinos persistentes y estado activo explícito; sidebar en escritorio.
- Controles de periodo y pasos iniciales de al menos 44 px de altura. Campos móviles de 16 px para evitar zoom automático.
- Áreas seguras para notch y barra inferior; hojas con altura dinámica y desplazamiento interior.
- Temas claro, oscuro y sistema. Aplicación del tema antes del primer render y sincronización del color del navegador.
- Estados vacíos con instrucciones. Datos pendientes con guion; simulador claramente identificado como una estimación.
- Gráficas con colores semánticos, fechas localizadas, leyendas, tooltips y navegación por teclado.
- Foco visible, enlace para saltar al contenido, confirmación de eliminaciones y respeto a movimiento reducido.
- Simulador cargado bajo demanda con un estado de carga accesible.

## Skills y revisión

Se leyeron las cuatro skills instaladas del proyecto antes de editar código: `frontend-design`, `ui-taste`, `web-design-guidelines` y `vercel-react-best-practices`. Se consultaron las reglas vigentes en https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md y los playbooks locales de refinamiento, formularios y evidencia visual.

La revisión descarta degradados decorativos y etiquetas espaciadas en mayúsculas. La firma visual se concentra en el panel de patrimonio, con énfasis tipográfico y sin decoración que pueda confundirse con una serie financiera.

Las pruebas de interfaz comprueban rutas, accesibilidad, foco, guardado sintético, temas y responsive. La emulación de Chrome no reemplaza una prueba de Safari en un iPhone físico; no se validan autenticación ni persistencia contra un Supabase real.

## Refinamiento con Uizze

La revisión posterior combina frontend-design y ui-taste sin cambiar de identidad. Las métricas ahora forman una superficie compartida con divisores, los estados vacíos son más compactos y no simulan gráficas, y el panel de patrimonio se apoya en la jerarquía tipográfica. Se reemplazan los destellos por un contador real de preparación y se omite la etiqueta redundante sobre los títulos de página.

Los errores se presentan junto al campo mediante FieldError, manteniendo su nombre accesible y recuperándose al corregir. En móvil no se fuerza el teclado al abrir; el foco queda en el título del diálogo. El simulador usa parámetros agrupados y un resultado visible al desplazarse en escritorio. Los porcentajes del desglose y los tooltips localizados complementan las gráficas.

Los detalles de la revisión y la selección de skills están en SKILLS_REVIEW.md. Se mantienen los contratos de Supabase, las rutas y las dependencias existentes.
