import 'react-native-gesture-handler/jestSetup'; // Para RN mocks
import { detectGesture, getState, setRunMode } from '../api';

// Mock global fetch
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detectGesture envia FormData corretamente', async () => {
    const mockResponse = { gesture: 'ok' };
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const uri = 'file://test.jpg';
    const result = await detectGesture(uri);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://li-visionv2.onrender.com/detect/',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: expect.any(FormData),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('setRunMode envia POST com JSON e lança erro se não ok', async () => {
    const mockErrorResponse = { status: 500 };
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Error',
    } as Response);

    await expect(setRunMode('test')).rejects.toThrow('Erro ao setar run mode');
  });

  it('getState chama fetch GET', async () => {
    const mockState = { mode: 'collect' };
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockState,
    } as Response);

    const result = await getState();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://li-visionv2.onrender.com/admin/state'
    );
    expect(result).toEqual(mockState);
  });
});
