module.exports = function (api) {
  const isTest = api.env('test');
  api.cache(() => !isTest);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...(!isTest ? [['react-native-worklets-core/plugin']] : []),
    ],
  };
};
