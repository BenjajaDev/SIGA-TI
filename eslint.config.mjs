import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const noInfraLibs = {
  patterns: [
    {
      group: ['express', 'express/*', '@prisma/*', 'pino', 'pino-http', 'jose', 'argon2', 'pg'],
      message: 'Esta capa no puede depender de frameworks ni de infraestructura.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/generated/**',
      '**/coverage/**',
      '**/node_modules/**',
      'docs/**',
      '.claude/**',
      '.agents/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 15,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      eqeqeq: 'error',
    },
  },
  {
    files: ['apps/api/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          ...noInfraLibs,
          patterns: [
            ...noInfraLibs.patterns,
            {
              group: [
                '**/application/**',
                '**/infrastructure/**',
                '**/interfaces/**',
                '**/config/**',
              ],
              message: 'El dominio no puede importar capas externas.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          ...noInfraLibs,
          patterns: [
            ...noInfraLibs.patterns,
            {
              group: ['**/infrastructure/**', '**/interfaces/**'],
              message: 'La aplicación solo depende del dominio.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'express' }], patterns: [{ group: ['**/interfaces/**'] }] },
      ],
    },
  },
  {
    files: ['apps/api/src/interfaces/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/*', '**/infrastructure/**'],
              message: 'HTTP no accede a infraestructura.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['express', '@prisma/*', 'react'] }] },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['apps/web/src/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-router', '@tanstack/*'],
              message: 'Los servicios no dependen de React.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/components/**/*.{ts,tsx}', 'apps/web/src/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/services/index', '**/services/*-service', '**/services/http-client'],
              allowTypeImports: true,
              message: 'La UI usa hooks, no servicios directamente.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: [
      '**/*.mjs',
      '**/vitest.config.ts',
      '**/vite.config.ts',
      '**/tsup.config.ts',
      '**/prisma.config.ts',
    ],
    ...tseslint.configs.disableTypeChecked,
  },
);
