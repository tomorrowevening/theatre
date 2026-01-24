module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: `ImportDeclaration[importKind!='type'][source.value=/@theatre\\u002Fcore/]`,
        message:
          '@tomorrowevening/theatre-studio may not import @tomorrowevening/theatre-core modules except via type imports.',
      },
    ],
  },
}
