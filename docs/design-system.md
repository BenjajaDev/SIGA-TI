# Sistema de diseño de SIGA-TI

Todo el aspecto deriva de **cuatro variables** editables por el administrador (pantalla *Apariencia*): `--brand-primary`, `--brand-secondary`, `--brand-angle` y el `--brand-gradient` que las combina. Ningún componente fija colores de institución; cambiar la paleta cambia todo el sistema.

## Patrones de `linear-gradient` (`apps/web/src/index.css`)

| Utilidad | Qué hace | Dónde se usa |
| --- | --- | --- |
| `bg-brand-gradient` | Degradado principal (primario → secundario profundo, con el ángulo del tema) | Banner de página, botón primario, avatares, login |
| `bg-brand-gradient-soft` | Versión tenue (9–10 % de cada color sobre blanco) | Cabecera de tarjetas y tablas, panel de cuentas demo, fondo del login |
| `bg-shell-gradient` | Degradado vertical de la barra lateral | Navegación principal |
| `bg-brand-gradient-active` | Degradado horizontal translúcido | Elemento activo del menú |
| `pattern-grid` | Cuadrícula con dos `linear-gradient` cruzados | Textura de banners (con `mask-fade-left`, que la desvanece) |
| `pattern-stripes` | Rayas diagonales con `repeating-linear-gradient` | Adorno del panel izquierdo del login |
| `text-brand-gradient` | Texto con degradado | Disponible para titulares |
| `hairline-gradient` | Línea divisoria que se desvanece en los extremos | Separadores |

## Componentes

- **`PageHeader`**: banner con degradado y cuadrícula; las acciones sobre el banner usan el botón `inverse` (fondo blanco).
- **`Button`**: `primary` (degradado), `secondary`, `inverse`, `danger`, `ghost`. Pulsar reduce la escala (0,98) y el hover eleva 1 px.
- **`Card`**: cabecera con degradado suave. **`TicketProgress`**: avance real de la solicitud (Abierta → Cerrada; *En espera* se muestra pausada sobre *En progreso*).
- **`DemoAccounts`**: botones que rellenan el formulario de ingreso (solo con `VITE_SHOW_DEMO_ACCOUNTS=true`).

## Reglas

1. **Accesibilidad primero**: contraste ≥ 4,5 con texto blanco (el backend lo exige al guardar la paleta), foco visible, `prefers-reduced-motion` respetado.
2. Movimiento solo para confirmar un cambio de estado: entrada de página única y pulsación de botones; sin animaciones decorativas continuas.
3. Los degradados jerarquizan (cabeceras, acción principal, navegación); el contenido de lectura va sobre superficies claras.
4. Las skills de diseño externas (`.claude/skills`, instaladas con `claude-skills`) son consejeras: ante un choque gana este sistema (ver `CLAUDE.md`).
