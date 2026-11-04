---
name: siga-ui-design
description: 'Diseñar o revisar pantallas y componentes React de SIGA-TI. Usar al mejorar dashboard, navegación, formularios, tablas, estados vacíos, accesibilidad o diseño responsive.'
---

# Diseño de interfaz SIGA-TI

## Cuándo usar

- Crear o mejorar páginas y componentes en `apps/web`.
- Revisar jerarquía visual, consistencia, legibilidad y comportamiento responsive.
- Ajustar dashboard, navegación, formularios, tablas y estados de carga o vacío.

## Procedimiento

1. Revisa las pantallas, componentes atómicos y tokens CSS existentes antes de diseñar.
2. Mantén textos de interfaz en español e identificadores de código en inglés.
3. Diseña primero para móvil; adapta luego a escritorio con los breakpoints existentes.
4. Reutiliza componentes y tokens de marca (`--brand-primary`, `--brand-secondary` y `--brand-angle`) en vez de fijar colores de institución.
5. Prioriza jerarquía clara, contraste, objetivos táctiles cómodos, etiquetas y estados vacíos informativos.
6. No inventes métricas ni estados de datos: usa únicamente valores disponibles en los servicios.
7. Conserva la separación UI → hooks → servicios; los componentes visuales no llaman clientes HTTP.
8. Verifica tipos, lint, pruebas del frontend y, si hay cambios de flujo, una prueba E2E.
