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
  }, [data]);
  return null;
}
