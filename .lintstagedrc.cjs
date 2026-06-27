/** @type {import('lint-staged').Config} */
module.exports = {
  '**/*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '**/*.{js,cjs,mjs}': ['prettier --write'],
  '**/*.{json,yaml,yml,md,css}': ['prettier --write'],
};
