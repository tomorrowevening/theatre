module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: `ImportDeclaration[importKind!='type'][source.value=/@theatre\\u002Fstudio/]`,
        message:
          '@tomorrowevening/theatre-core may not import @tomorrowevening/theatre-studio modules except via type imports.',
      },
    ],
  },
}
