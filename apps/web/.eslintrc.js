module.exports = {
  extends: ['../../.eslintrc.js', 'next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
}
