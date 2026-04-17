/**
 * Hook para verificar se o plugin nativo HandLandmarker está operacional.
 *
 * Retorna o estado do modelo (loading → ready/error) para que
 * a UI possa mostrar feedback adequado ao usuário antes de
 * iniciar o frame processor.
 */

import { useState, useEffect } from 'react';
import { getPluginStatus } from '@/services/handLandmarkerPlugin';

export type ModelStatus = 'loading' | 'ready' | 'error';

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // O plugin é inicializado no nível do módulo (síncrono).
    // Verificamos o resultado dessa inicialização aqui.
    const { ready, error } = getPluginStatus();
    if (ready) {
      setStatus('ready');
    } else {
      setStatus('error');
      setErrorMessage(error);
    }
  }, []);

  return { status, errorMessage };
}
