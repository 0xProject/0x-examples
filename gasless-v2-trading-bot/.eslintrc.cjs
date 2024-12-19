module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    // Add your custom rules here
    '@typescript-eslint/no-unused-vars': 'warn',
    'prefer-const': 'warn',
  },
};
