const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*']),
  expoConfig,
  {
    rules: {
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
]);
