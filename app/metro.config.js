const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for shared packages
config.watchFolders = [monorepoRoot];

// Resolve node_modules from app first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Block the root copy of react from ever being resolved
// Any import that resolves to root/node_modules/react gets redirected to app's copy
const appReact = path.resolve(projectRoot, 'node_modules/react');
const rootReact = path.resolve(monorepoRoot, 'node_modules/react');

const origResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If something tries to resolve to the root react, force it to the app's react
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      moduleName,
      platform,
    );
  }
  if (origResolver) {
    return origResolver(context, moduleName, platform);
  }
  return context.resolveRequest(
    { ...context, resolveRequest: undefined },
    moduleName,
    platform,
  );
};

// Force these to always resolve from app/node_modules
config.resolver.extraNodeModules = {
  react: appReact,
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
};

// Block root react directory from being watched/resolved
config.resolver.blockList = [
  new RegExp(rootReact.replace(/[/\\]/g, '[/\\\\]') + '[/\\\\].*'),
];

module.exports = config;
