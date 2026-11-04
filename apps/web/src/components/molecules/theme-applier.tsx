import { useEffect } from 'react';
import { useBranding } from '../../hooks/use-branding';
import { applyTheme } from '../../lib/theme';

/** Aplica el tema guardado (colores, degradado, título) al documento. No renderiza nada. */
export function ThemeApplier() {
  const { data } = useBranding();
  useEffect(() => {
    if (data === undefined) return;
    applyTheme(data);
    document.title = data.institutionName;
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon === null) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.append(favicon);
    }
    favicon.href = data.logoDataUrl ?? '/favicon.svg';
    favicon.type =
      data.logoDataUrl?.match(/^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,/u)?.[1] ??
      'image/svg+xml';
  }, [data]);
  return null;
}
