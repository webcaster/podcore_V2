import { IncomingMessage, Server as HttpServer } from 'http';
import { URL } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from '../middleware/auth';

export interface PodCoreRealtimeEvent {
  type: string;
  episodeId?: string;
  userId?: string;
  payload?: unknown;
  timestamp?: string;
}

type ClientInfo = {
  socket: WebSocket;
  userId: string;
  username: string;
};

const clients = new Set<ClientInfo>();
let websocketServer: WebSocketServer | null = null;

function readCookie(request: IncomingMessage, name: string): string | null {
  const cookies = request.headers.cookie || '';
  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

function send(client: ClientInfo, event: PodCoreRealtimeEvent): void {
  if (client.socket.readyState !== WebSocket.OPEN) return;
  client.socket.send(JSON.stringify({ ...event, timestamp: event.timestamp || new Date().toISOString() }));
}

export function initializeRealtime(server: HttpServer): WebSocketServer {
  if (websocketServer) return websocketServer;

  websocketServer = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    if (requestUrl.pathname !== '/api/realtime') return;

    const token = readCookie(request, 'podcore_session') || requestUrl.searchParams.get('token');
    const user = token ? verifyToken(token) : null;
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    websocketServer!.handleUpgrade(request, socket, head, ws => {
      websocketServer!.emit('connection', ws, request, user);
    });
  });

  websocketServer.on('connection', (socket: WebSocket, _request: IncomingMessage, user: any) => {
    const client: ClientInfo = { socket, userId: user.id, username: user.username };
    clients.add(client);
    send(client, { type: 'connection.ready', userId: user.id, payload: { username: user.username } });

    socket.on('message', raw => {
      try {
        const message = JSON.parse(String(raw));
        if (message?.type === 'ping') send(client, { type: 'pong' });
      } catch {
        // Unbekannte Clientnachrichten werden bewusst ignoriert.
      }
    });

    socket.on('close', () => clients.delete(client));
    socket.on('error', () => clients.delete(client));
  });

  return websocketServer;
}

export function broadcastRealtime(event: PodCoreRealtimeEvent): void {
  for (const client of clients) send(client, event);
}

export function notifyUserRealtime(userId: string, event: PodCoreRealtimeEvent): void {
  for (const client of clients) {
    if (client.userId === userId) send(client, { ...event, userId });
  }
}

export function realtimeClientCount(): number {
  return clients.size;
}
