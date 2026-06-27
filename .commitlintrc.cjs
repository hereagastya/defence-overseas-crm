/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'leads',
        'students',
        'applications',
        'documents',
        'payments',
        'tasks',
        'followups',
        'calendar',
        'dashboard',
        'reports',
        'notifications',
        'employees',
        'settings',
        'shared',
        'api',
        'web',
        'deps',
        'ci',
        'db',
      ],
    ],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'docs', 'chore', 'test', 'style', 'perf', 'ci', 'build'],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
