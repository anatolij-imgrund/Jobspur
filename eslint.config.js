// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'],
  },
  {
    // Regeln, die Typinformationen brauchen: TypeScript liest dafür das Projekt mit.
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      // Ein Promise ohne await oder .catch verschluckt Fehler still.
      // Genau so entstand der Fehler beim PDF-Teilen (File.move ohne await).
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          // describe/test aus node:test geben Promises zurück, die der Test-Runner selbst verwaltet.
          allowForKnownSafeCalls: [
            { from: 'package', package: 'node:test', name: ['describe', 'test', 'it'] },
          ],
        },
      ],
      // Async-Funktionen dort, wo kein Promise erwartet wird (z. B. als onPress)
      // sind erlaubt; React Native fängt die Rückgabe ohnehin nicht auf.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      // Importe einheitlich: erst Pakete, dann '@/…', dann relative; jeweils alphabetisch.
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
]);
