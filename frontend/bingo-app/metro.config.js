// metro.config.js
// Fixes: "Importing native-only module react-native-maps on web"
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On web, replace react-native-maps with an empty stub so Metro doesn't crash.
const NATIVE_ONLY_PACKAGES = ['react-native-maps'];

const originalResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && NATIVE_ONLY_PACKAGES.includes(moduleName)) {
    // Return an empty module for web builds
    return {
      filePath: require.resolve('./src/stubs/react-native-maps.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
