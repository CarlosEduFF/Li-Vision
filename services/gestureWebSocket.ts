/**
 * Serviço WebSocket para detecção de gestos em tempo real.
 *
 * Mantém uma conexão persistente com a API, enviando landmarks
 * e recebendo resultados de detecção continuamente.
 *
 * MULTI-TENANT: Suporta envio do modo de detecção via query param
 * e ações de controle (set_mode, start_collect, stop_collect).
 *
 * Features:
 * - Reconexão automática com backoff exponencial
 * - Callback de gesto detectado
 * - Callback de status de conexão (para UI)
 * - Limpeza de recursos ao desconectar
 */

const WS_BASE_URL = "wss://li-visionv2.onrender.com/ws/detect";

// Render plano gratuito fecha conexoes idle com codigo 1000.
// Usamos tentativas ilimitadas com cap de 30s para manter conexao.
const MAX_RECONNECT_ATTEMPTS = Infinity;
const INITIAL_RECONNECT_DELAY = 1000; // 1s
const MAX_RECONNECT_DELAY = 30_000;   // 30s teto

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting" | "failed";

export type DetectionMode = "hybrid" | "rules" | "ml" | "dynamic_ml";

export type GestureResult = {
  gesture: string | null;
  confidence: number;
  /** Modo de detecção ativo na sessão (rules | ml | dynamic_ml | hybrid) */
  mode?: string;
  error?: string;
  /** Landmarks retornados pelo MediaPipe do servidor */
  landmarks?: any[];
  /** Resposta de ações de controle */
  ok?: boolean;
  action?: string;
  detectors?: number;
  status?: string;
  sequences?: number;
};

type GestureCallback = (result: GestureResult) => void;
type StatusCallback = (status: ConnectionStatus, message?: string) => void;

class GestureWebSocket {
  private ws: WebSocket | null = null;
  private onGesture: GestureCallback | null = null;
  private onStatusChange: StatusCallback | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private currentMode: DetectionMode = "hybrid";

  private activeModelName: string | null = null;

  /**
   * Conecta ao WebSocket da API com o modo de detecção especificado.
   * @param onGesture - callback chamado a cada resposta de detecção
   * @param onStatusChange - callback chamado quando o status da conexão muda
   * @param mode - modo de detecção (hybrid/rules/ml/dynamic_ml)
   * @param activeModelName - nome do idioma de IA principal selecionado
   */
  connect(onGesture: GestureCallback, onStatusChange?: StatusCallback, mode?: DetectionMode, activeModelName?: string | null): void {
    this.onGesture = onGesture;
    this.onStatusChange = onStatusChange ?? null;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    if (mode) this.currentMode = mode;
    if (activeModelName !== undefined) this.activeModelName = activeModelName;
    this._connect();
  }

  private _connect(): void {
    // Limpa conexão anterior se existir
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    this._setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    // Envia o modo de detecção e o modelo ativo como query parameter
    let wsUrl = `${WS_BASE_URL}?mode=${this.currentMode}`;
    if (this.activeModelName) {
      wsUrl += `&model=${this.activeModelName}`;
    }
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[WS] Conectado (modo: ${this.currentMode})`);
      this.reconnectAttempts = 0;
      this._setStatus("connected");
    };

    ws.onmessage = (event: WebSocketMessageEvent) => {
      try {
        const result: GestureResult = JSON.parse(event.data);
        this.onGesture?.(result);
      } catch (e) {
        console.log("[WS] Erro ao parsear resposta:", e);
      }
    };

    ws.onerror = (event: Event) => {
      console.log("[WS] Erro Capturado na Conexão:", event);
    };

    ws.onclose = (event: WebSocketCloseEvent) => {
      console.log(`[WS] Conexao fechada. Codigo: ${event.code}, Razao: "${event.reason}"`);

      if (!this.intentionalClose) {
        // Qualquer fechamento nao-intencional (incluindo codigo 1000 do Render
        // por inatividade) dispara reconexao automatica.
        this._attemptReconnect();
      } else {
        this._setStatus("disconnected");
      }
    };

    this.ws = ws;
  }

  /**
   * Reconecta com um novo modo de detecção.
   * Fecha a conexão atual e reconecta com o modo especificado.
   */
  reconnectWithMode(mode: DetectionMode): void {
    this.currentMode = mode;
    this.intentionalClose = true; // Evita reconexão automática durante a troca

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    // Reconecta imediatamente com o novo modo
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this._connect();
  }

  /**
   * Envia uma ação de controle (set_mode, start_collect, stop_collect) pelo WebSocket.
   */
  sendAction(action: Record<string, any>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action));
    }
  }

  /**
   * Envia os bytes do frame redimensionado para a API para processamento.
   * @deprecated Use sendLandmarks() para edge computing (muito mais leve).
   */
  sendFrame(frameData: ArrayBuffer | Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(frameData);
    }
  }

  /**
   * Envia landmarks JSON para a API classificar o gesto.
   * Formato esperado pela API: [[{x, y, z}, ...21 pontos], ...mãos]
   * Trafego: ~1KB vs 196KB do sendFrame (redução de 99.5%)
   */
  sendLandmarks(hands: Array<Array<{ x: number; y: number; z: number }>>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(hands));
    }
  }

  /**
   * Verifica se a conexão está ativa.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Retorna o modo de detecção atual.
   */
  getMode(): DetectionMode {
    return this.currentMode;
  }

  /**
   * Desconecta intencionalmente (sem reconexão).
   */
  disconnect(): void {
    this.intentionalClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    this._setStatus("disconnected");
  }

  /**
   * Tenta reconectar com backoff exponencial.
   */
  private _attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log("[WS] Numero maximo de tentativas atingido");
      this._setStatus("failed", `Falha ao reconectar apos ${this.reconnectAttempts} tentativas`);
      return;
    }

    this.reconnectAttempts++;
    // Backoff exponencial com teto em MAX_RECONNECT_DELAY
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY
    );

    console.log(`[WS] Reconectando em ${delay}ms (tentativa ${this.reconnectAttempts})`);
    this._setStatus("reconnecting", `Tentativa ${this.reconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, delay);
  }

  private _setStatus(status: ConnectionStatus, message?: string): void {
    this.onStatusChange?.(status, message);
  }
}

// Singleton — uma única instância para toda a app
export const gestureWS = new GestureWebSocket();
