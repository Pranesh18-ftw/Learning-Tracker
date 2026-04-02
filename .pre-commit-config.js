module.exports = {
  hooks: {
    'pre-commit': 'node clean-unicode.js && exit 1'
  }
};
