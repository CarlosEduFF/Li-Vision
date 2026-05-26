// Mocks para React Native libs em Jest
global.expo = {
  EventEmitter: class MockEventEmitter {
    addListener() {
      return { remove: () => {} };
    }
    removeListener() {}
    removeAllListeners() {}
    emit() {}
  }
};

jest.mock('react-native-reanimated', () => {
  'worklet';
  return require('react-native-reanimated/mock');
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return new Proxy({}, {
    get(target, prop) {
      return (props) => React.createElement(Text, props, prop);
    }
  });
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

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  class MockWebView extends React.Component {
    injectJavaScript() {
      return '';
    }
    render() {
      return React.createElement(View, this.props);
    }
  }
  return {
    __esModule: true,
    WebView: MockWebView,
    default: MockWebView,
  };
});

global.fetch = jest.fn();

