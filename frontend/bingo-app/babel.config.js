module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for react-native-reanimated — MUST be last plugin
      'react-native-reanimated/plugin',
    ],
  };
};
