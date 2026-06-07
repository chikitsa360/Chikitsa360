import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    rules: {
      'no-console': 'warn',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
]
