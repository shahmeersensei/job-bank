import nextPlugin from '@next/eslint-plugin-next';
import base from '@jobbank/config/eslint/base';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin, 'react-hooks': reactHooks },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Domain boundaries (DDD): other code may only use a domain's public entry point
      // (`@/domains/job`) or a shared-kernel module (`@/domains/shared/http`).
      // Inside a domain, use relative imports.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/domains/*/*', '!@/domains/shared/*'],
              message: "Import a domain through its public entry point, e.g. '@/domains/job'.",
            },
            {
              group: ['@/domains/shared/*/*'],
              message:
                "Import shared-kernel modules through their index, e.g. '@/domains/shared/http'.",
            },
          ],
        },
      ],
    },
  },
];
