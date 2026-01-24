const path = require('path')

module.exports = {
  rules: {
    'no-relative-imports': [
      'warn',
      {
        aliases: [
          {name: '@tomorrowevening/theatre-core', path: path.resolve(__dirname, './core/src')},
          {
            name: '@tomorrowevening/theatre-shared',
            path: path.resolve(__dirname, './shared/src'),
          },
          {
            name: '@tomorrowevening/theatre-studio',
            path: path.resolve(__dirname, './studio/src'),
          },
        ],
      },
    ],
  },
}
