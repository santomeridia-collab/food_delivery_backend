module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  globalSetup: './tests/__helpers__/globalSetup.js',
  globalTeardown: './tests/__helpers__/globalTeardown.js',
  setupFilesAfterFramework: ['./tests/__helpers__/setupAfterFramework.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
