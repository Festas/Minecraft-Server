module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'routes/**/*.js',
    'auth/**/*.js',
    'middleware/**/*.js'
  ],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  verbose: true,
  setupFiles: ['<rootDir>/jest.setup.js']
};
