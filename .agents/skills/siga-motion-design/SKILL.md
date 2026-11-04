---
name: siga-motion-design
description: 'Añadir o revisar animaciones y transiciones fluidas en la interfaz SIGA-TI. Usar para navegación lateral, feedback de controles, paneles, gráficos y microinteracciones.'
---

# Movimiento de interfaz SIGA-TI

## Cuándo usar

- Añadir transiciones a menús, paneles, botones y componentes interactivos.
- Mejorar la percepción de carga o respuesta en gráficos y métricas.
- Revisar compatibilidad de animaciones con accesibilidad.

## Procedimiento

1. Usa movimiento para explicar un cambio de estado o confirmar una acción, no como decoración constante.
2. Prefiere `opacity` y `transform` con duraciones breves y curvas suaves; evita animar propiedades que provoquen relayout.
3. Mantén la navegación y las acciones utilizables durante y después de la transición.
4. Respeta `prefers-reduced-motion` con las variantes `motion-reduce` o las reglas globales existentes.
5. No hagas depender el significado de datos de color o movimiento; conserva etiquetas y textos accesibles.
6. Comprueba el comportamiento con teclado, en móvil y con movimiento reducido.
