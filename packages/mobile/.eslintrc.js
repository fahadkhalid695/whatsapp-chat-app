module.exports = {
  extends: ['../../.eslintrc.js', '@react-native-community'],
  env: {
    'react-native/react-native': true,
  },
  plugins: ['react', 'react-hooks', 'react-native'],
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Using TypeScript
    'react-native/no-unused-styles': 'error',
    'react-native/split-platform-components': 'error',
  },
};