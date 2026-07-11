export interface RealtimeEvent {
  type: string;
  episodeId?: string;
  userId?: string;
  payload?: any;
  timestamp?: string;
}

type Listener = (event: RealtimeEvent) => void;
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private retry = 0;
  private closedIntentionally = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => this.listeners.delete(listener);
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.socket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected');
    this.connect();
    return () => this.statusListeners.delete(listener);
  }

  connect(): void {
    if (typeof window === 'undefined' || this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
    this.closedIntentionally = false;
    this.emitStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${protocol}//${window.location.host}/api/realtime`);
    this.socket.onopen = () => {
      this.retry = 0;
      this.emitStatus('connected');
      this.startHeartbeat();
    };
    this.socket.onmessage = message => {
      try {
        const event = JSON.parse(String(message.data)) as RealtimeEvent;
        this.listeners.forEach(listener => listener(event));
        window.dispatchEvent(new CustomEvent('podcore:realtime', { detail: event }));
      } catch {
        // Nicht interpretierbare Servernachrichten werden isoliert verworfen.
      }
    };
    this.socket.onerror = () => this.socket?.close();
    this.socket.onclose = () => {
      this.stopHeartbeat();
      this.socket = null;
      this.emitStatus('disconnected');
      if (!this.closedIntentionally && (this.listeners.size || this.statusListeners.size)) this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.closedIntentionally = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    const delay = Math.min(30_000, 1_000 * Math.pow(2, this.retry++));
    this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify({ type: 'ping' }));
    }, 25_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private emitStatus(status: 'connecting' | 'connected' | 'disconnected'): void {
    this.statusListeners.forEach(listener => listener(status));
  }
}

export const realtimeClient = new RealtimeClient();
