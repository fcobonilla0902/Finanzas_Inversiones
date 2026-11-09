# Skills revisadas y dirección aplicada

Se inventariaron 15 skills del catálogo disponible y se consultaron sus archivos SKILL.md antes de editar la interfaz.

## Proyecto

| Skill | Origen | Aplicación |
| --- | --- | --- |
| frontend-design | Anthropic | Identidad, composición, jerarquía y contención visual |
| ui-taste | Uizze | Refinamiento del sistema existente, formularios, estados y evidencia visual |
| vercel-react-best-practices | Vercel | React, estado local y agregación de gastos sin búsquedas repetidas |
| web-design-guidelines | Vercel | Accesibilidad, foco, controles táctiles y responsive |

## Catálogo general

imagegen, openai-docs, skill-creator, skill-installer, find-skills, plugin-management:plugin-management, sites:sites, sites:sites-remix, work-pets:create-pet, work-pets:pets y work-pets:update-pet.

Se revisaron para completar el inventario; no se aplicaron flujos de mascotas, instalación, publicación o cambios de servicios externos a este trabajo de interfaz.

## Objetivo verificable

Refinar la identidad azul y petróleo existente, sin sustituirla. Se retuvieron capturas de la interfaz anterior en `artifacts/design-review/baseline-desktop-light.png` y `baseline-iphone-light.png`. Esta es la ruta de refinamiento acotado de Uizze: sistema existente más cambios explícitos; no se genera una nueva identidad ni se afirma fidelidad 1:1 a una imagen generada.

Déficits observados: excesivo espacio en estados vacíos móviles, métricas separadas en contenedores equivalentes y validación distante del campo.

Cambios previstos y aplicados:

- Mantener Manrope autoalojada, fondos fríos y un único acento de interacción. Conservar los colores semánticos de gastos y de series de gráficas.
- Agrupar las tres métricas en una superficie con divisores; mantener la lectura de etiqueta e importe en móvil y las tres columnas en escritorio.
- Reducir estados vacíos y retirar las líneas que simulaban una gráfica sin datos. Quitar la decoración ascendente del patrimonio y el icono de destellos de primeros pasos.
- Usar descripciones por ruta y un contador real de pasos completos. Mostrar el aviso general de conexión en inicio, con los detalles técnicos en configuración.
- Separar parámetros y resultado de inversión en escritorio, con dos columnas de campos y resultado visible al desplazarse. Refluir en una columna móvil.
- Validación junto al campo, nombre accesible estable y recuperación del error al corregir. No forzar teclado al abrir en móvil; foco directo en cantidad con puntero preciso.
- Búsqueda sin resultados con explicación y acción para limpiar filtros.
- Tooltips con fechas y años legibles, desglose de gastos con porcentaje y animaciones de datos de 240 ms que respetan movimiento reducido. Feedback de controles de 140 ms.

Esquema de escritorio: navegación lateral | patrimonio y preparación / métricas agrupadas / gráficas / actividad y ahorro. Esquema móvil: cabecera / contexto y periodo / patrimonio / preparación / métricas en filas / gráficas y actividad / navegación inferior.

Las herramientas de referencias de pago de Uizze no están conectadas; se usaron los playbooks locales y las capturas reales del producto. No se atribuyen referencias externas ni aprobación del usuario a las decisiones del agente.

## Verificación

Capturas y comprobante de hashes en `artifacts/design-review/visual-evidence.json`. Las pruebas cubren escritorio y web móvil, temas, navegación, validación y recuperación, foco, simulador y gráficas con fixtures. No constituyen una prueba nativa de iOS o Safari físico. Supabase sigue sin un proyecto conectado: no se afirma haber verificado guardado remoto.
