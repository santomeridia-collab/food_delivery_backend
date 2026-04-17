module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  globalSetup: './tests/__helpers__/globalSetup.js',
  globalTeardown: './tests/__helpers__/globalTeardown.js',
  setupFilesAfterEnv: ['./tests/__helpers__/testSetup.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
