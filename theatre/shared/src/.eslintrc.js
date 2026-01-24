module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: `ImportDeclaration[importKind!='type'][source.value=/@theatre\\u002F(core|studio)/]`,
        message:
          '@tomorrowevening/theatre-shared may not import @tomorrowevening/theatre-core or @tomorrowevening/theatre-studio modules except via type imports.',
      },
    ],
  },
}
