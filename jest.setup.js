/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-worklets', () => ({ runOnJS: (f) => f, scheduleOnRN: (f, ...a) => f(...a), createSerializable: (v) => v }));
jest.mock('react-native-reanimated', () => require('./jest.reanimated-mock'));
jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  const pass = ({ children }) => children ?? null;
  return {
    __esModule: true,
    GestureDetector: pass,
    GestureHandlerRootView: RN.View,
    usePanGesture: () => ({}),
    Gesture: new Proxy({}, { get: () => () => new Proxy({}, { get: (_t, p, r) => () => r }) }),
  };
});
