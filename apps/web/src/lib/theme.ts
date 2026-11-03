import type { Branding } from '@siga/shared';

type ThemeInput = Pick<Branding, 'primaryColor' | 'secondaryColor' | 'gradientAngle'>;

export const themeVariables = (theme: ThemeInput): Readonly<Record<string, string>> => ({
  '--brand-primary': theme.primaryColor,
  '--brand-secondary': theme.secondaryColor,
  '--brand-angle': `${String(theme.gradientAngle)}deg`,
});

export const applyTheme = (
  theme: ThemeInput,
  target: HTMLElement = document.documentElement,
): void => {
  for (const [name, value] of Object.entries(themeVariables(theme))) {
    target.style.setProperty(name, value);
  }
};
