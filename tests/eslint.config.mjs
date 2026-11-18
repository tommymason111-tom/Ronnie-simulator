// Crash-finding only (no style rules): names that don't exist, impossible comparisons, assigning to constants, duplicate
// keys, code that can never run. Each of these is a crash or a silent bug waiting to happen.
import globals from 'globals';
export default [
  { files: ['js/**/*.js'], ignores: ['js/vendor/**'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser, THREE: 'readonly', html2canvas: 'readonly' } },
    rules: { 'no-undef': 'error', 'no-const-assign': 'error', 'no-dupe-keys': 'error', 'no-dupe-args': 'error', 'no-dupe-class-members': 'error', 'no-dupe-else-if': 'error', 'no-duplicate-case': 'error',
      'no-func-assign': 'error', 'no-import-assign': 'error', 'no-self-assign': 'error', 'no-unreachable': 'error', 'no-unsafe-negation': 'error', 'no-unsafe-finally': 'error', 'use-isnan': 'error', 'valid-typeof': 'error',
      'no-cond-assign': ['error', 'except-parens'], 'no-compare-neg-zero': 'error', 'no-constant-binary-expression': 'error', 'no-loss-of-precision': 'error', 'no-obj-calls': 'error', 'no-setter-return': 'error', 'no-sparse-arrays': 'error', 'no-unexpected-multiline': 'error', 'getter-return': 'error', 'no-async-promise-executor': 'error', 'no-misleading-character-class': 'error' } },
  { files: ['js/menu.js', 'js/howto.js', 'js/crash.js'], languageOptions: { sourceType: 'script' } },
];
