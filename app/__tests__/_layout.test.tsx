import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import 'react-native-gesture-handler/jestSetup';
import RootLayout from '../_layout';

// Mocks
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockStack = ({ children }: any) => <View testID="mock-stack">{children}</View>;
  MockStack.Screen = ({ children }: any) => <View>{children}</View>;

  return {
    Stack: MockStack,
    useRouter: jest.fn(),
    usePathname: jest.fn(() => '/'),
  };
});
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));
jest.mock('react-native-reanimated', () => ({}));
jest.mock('expo-status-bar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    StatusBar: (props: any) => <View testID="mock-status-bar" {...props} />,
  };
});

const mockReplace = jest.fn();
const mockUseRouter = useRouter as jest.Mock;
mockUseRouter.mockReturnValue({ replace: mockReplace });

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('redireciona para login se não há token', async () => {
    jest.useFakeTimers();

    render(<RootLayout />);

    jest.runAllTimers();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/screens/login');
    });

    jest.useRealTimers();
  });

  it('não redireciona se há token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('valid-token');

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('renderiza Stack com telas corretas', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('valid-token');
    const { getByTestId } = render(<RootLayout />);

    expect(getByTestId('mock-stack')).toBeTruthy();
    expect(mockUseRouter).toHaveBeenCalled();
  });
});
