// Mocks para React Native libs em Jest
jest.mock('react-native-reanimated', () => {
  'worklet';
  return require('react-native-reanimated/mock');
});

jest.mock('react-native-gesture-handler', () => {
  const mock = jest.fn(() => ({}));
  mock.GestureHandlerRootView = 'GestureHandlerRootView';
  return mock;
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

global.fetch = jest.fn();
