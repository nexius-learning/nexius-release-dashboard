/** @type {import('jest').Config} **/
module.exports = {
    verbose: true,
    testEnvironment: 'jsdom',
    // babel-jest for every language in the suite, so the test toolchain has a single
    // Babel. ts-jest was dropped because it declares `@babel/core: <8` as an optional
    // peer, which conflicts with the Babel 8 the rest of the build uses; the override
    // papering over that resolved differently across npm versions and produced
    // lockfiles that `npm ci` rejected. Types are still checked — `npm run check`
    // (tsc --noEmit) covers `src`, which includes every test file, and CI runs it
    // before the tests.
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {}],
    },
    snapshotSerializers: ['<rootDir>/jest.focusZoneSerializer.js'],
    moduleNameMapper: {
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/__mocks__/fileMock.js',
        '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/styleMock.js',
    },
    transformIgnorePatterns: ['node_modules/(?!(azure-devops-ui|azure-devops-extension-sdk)/)'],
    testTimeout: 10000,
    forceExit: true,
    detectOpenHandles: true,
}
