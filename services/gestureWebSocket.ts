/**
 * Serviço WebSocket para detecção de gestos em tempo real.
 *
 * Mantém uma conexão persistente com a API, enviando frames base64
 * e recebendo resultados de detecção continuamente.
 *
 * Features:
 * - Reconexão automática com backoff exponencial
 * - Callback de gesto detectado
 * - Callback de status de conexão (para UI)
 * - Limpeza de recursos ao desconectar
 */

const WS_URL = "wss://li-visionv2.onrender.com/ws/detect";

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1s

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "reconnecting" | "failed";

export type GestureResult = {
  gesture: string | null;
  confidence: number;
  error?: string;
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

  /**
   * Conecta ao WebSocket da API.
   * @param onGesture - callback chamado a cada resposta de detecção
   * @param onStatusChange - callback chamado quando o status da conexão muda
   */
  connect(onGesture: GestureCallback, onStatusChange?: StatusCallback): void {
    this.onGesture = onGesture;
    this.onStatusChange = onStatusChange ?? null;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this._connect();
  }

  private _connect(): void {
    // Limpa conexão anterior se existir
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    this._setStatus(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("[WS] Conectado");
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
      console.log("[WS] Erro:", event);
    };

    ws.onclose = () => {
      console.log("[WS] Conexão fechada");

      if (!this.intentionalClose) {
        this._attemptReconnect();
      } else {
        this._setStatus("disconnected");
      }
    };

    this.ws = ws;
  }

  /**
   * Envia as coordenadas puras dos Landmarks para a API (Zero Lag).
   * Só envia se a conexão estiver aberta.
   */
  sendLandmarks(landmarksData: any[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(landmarksData));
    }
  }

  /**
   * Verifica se a conexão está ativa.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
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
      console.log("[WS] Número máximo de tentativas atingido");
      this._setStatus("failed", `Falha ao reconectar após ${MAX_RECONNECT_ATTEMPTS} tentativas`);
      return;
    }

    this.reconnectAttempts++;
    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WS] Reconectando em ${delay}ms (tentativa ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    this._setStatus("reconnecting", `Tentativa ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

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
