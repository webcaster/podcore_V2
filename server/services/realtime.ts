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

type ResourceType = 'episode' | 'idea' | 'editorial';

type ClientInfo = {
  socket: WebSocket;
  userId: string;
  username: string;
  displayName: string;
  role?: string;
  resourceKey?: string;
};

type PresenceState = {
  userId: string;
  username: string;
  displayName: string;
  role?: string;
  resourceType: ResourceType;
  resourceId: string;
  blockId?: string;
  status: 'viewing' | 'editing';
  lastSeen: number;
};

type LockState = {
  resourceType: ResourceType;
  resourceId: string;
  blockId: string;
  userId: string;
  username: string;
  displayName: string;
  acquiredAt: string;
  expiresAt: number;
};

const clients = new Set<ClientInfo>();
const presence = new Map<string, Map<string, PresenceState>>();
const locks = new Map<string, LockState>();
let websocketServer: WebSocketServer | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

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

function sendRoom(resourceKey: string, event: PodCoreRealtimeEvent, exceptUserId?: string): void {
  for (const client of clients) {
    if (client.resourceKey === resourceKey && client.userId !== exceptUserId) send(client, event);
  }
}

function resourceKey(resourceType: ResourceType, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

function isResourceType(value: unknown): value is ResourceType {
  return value === 'episode' || value === 'idea' || value === 'editorial';
}

function safePart(value: unknown, max = 160): string {
  return String(value || '').trim().slice(0, max);
}

function getPresenceList(key: string): PresenceState[] {
  return Array.from(presence.get(key)?.values() || []).map(item => ({ ...item }));
}

function broadcastPresence(key: string): void {
  sendRoom(key, { type: 'collaboration.presence.changed', payload: { resourceKey: key, users: getPresenceList(key) } });
}

function removePresence(client: ClientInfo): void {
  if (!client.resourceKey) return;
  const room = presence.get(client.resourceKey);
  if (!room) return;
  room.delete(client.userId);
  if (room.size === 0) presence.delete(client.resourceKey);
  broadcastPresence(client.resourceKey);
}

function releaseLocksForUser(userId: string, key?: string): void {
  const released: LockState[] = [];
  for (const [lockId, lock] of locks) {
    if (lock.userId === userId && (!key || resourceKey(lock.resourceType, lock.resourceId) === key)) {
      locks.delete(lockId);
      released.push(lock);
    }
  }
  for (const lock of released) {
    const lockRoom = resourceKey(lock.resourceType, lock.resourceId);
    sendRoom(lockRoom, { type: 'collaboration.lock.changed', payload: { resourceKey: lockRoom, blockId: lock.blockId, lock: null } });
  }
}

function cleanupExpiredState(): void {
  const now = Date.now();
  for (const [key, room] of presence) {
    let changed = false;
    for (const [userId, state] of room) {
      if (now - state.lastSeen > 70_000) {
        room.delete(userId);
        changed = true;
      }
    }
    if (room.size === 0) presence.delete(key);
    if (changed) broadcastPresence(key);
  }
  for (const [lockId, lock] of locks) {
    if (lock.expiresAt <= now) {
      locks.delete(lockId);
      const key = resourceKey(lock.resourceType, lock.resourceId);
      sendRoom(key, { type: 'collaboration.lock.changed', payload: { resourceKey: key, blockId: lock.blockId, lock: null, reason: 'expired' } });
    }
  }
}

function joinResource(client: ClientInfo, value: any): void {
  const resourceType = value?.resourceType;
  const resourceId = safePart(value?.resourceId);
  if (!isResourceType(resourceType) || !resourceId) return;

  const oldKey = client.resourceKey;
  removePresence(client);
  releaseLocksForUser(client.userId, oldKey);
  const key = resourceKey(resourceType, resourceId);
  client.resourceKey = key;
  const state: PresenceState = {
    userId: client.userId,
    username: client.username,
    displayName: client.displayName,
    role: client.role,
    resourceType,
    resourceId,
    blockId: safePart(value?.blockId) || undefined,
    status: value?.status === 'editing' ? 'editing' : 'viewing',
    lastSeen: Date.now(),
  };
  if (!presence.has(key)) presence.set(key, new Map());
  presence.get(key)!.set(client.userId, state);
  send(client, {
    type: 'collaboration.presence.snapshot',
    payload: { resourceKey: key, users: getPresenceList(key), locks: Array.from(locks.values()).filter(lock => resourceKey(lock.resourceType, lock.resourceId) === key) },
  });
  broadcastPresence(key);
}

function updatePresence(client: ClientInfo, value: any): void {
  if (!client.resourceKey) return;
  const room = presence.get(client.resourceKey);
  const state = room?.get(client.userId);
  if (!state) return;
  state.blockId = safePart(value?.blockId) || undefined;
  state.status = value?.status === 'editing' ? 'editing' : 'viewing';
  state.lastSeen = Date.now();
  broadcastPresence(client.resourceKey);
}

function handleLockMessage(client: ClientInfo, type: string, value: any): void {
  if (!client.resourceKey) return;
  const blockId = safePart(value?.blockId);
  if (!blockId) return;
  const room = presence.get(client.resourceKey);
  const currentPresence = room?.get(client.userId);
  if (currentPresence) {
    currentPresence.blockId = blockId;
    currentPresence.status = type === 'collaboration.lock.release' ? 'viewing' : 'editing';
    currentPresence.lastSeen = Date.now();
  }

  const [resourceType, resourceId] = client.resourceKey.split(':') as [ResourceType, string];
  const lockId = `${client.resourceKey}:${blockId}`;
  const existing = locks.get(lockId);
  if (type === 'collaboration.lock.release') {
    if (existing?.userId === client.userId) {
      locks.delete(lockId);
      sendRoom(client.resourceKey, { type: 'collaboration.lock.changed', payload: { resourceKey: client.resourceKey, blockId, lock: null, reason: 'released' } });
    }
    broadcastPresence(client.resourceKey);
    return;
  }
  if (type === 'collaboration.lock.refresh') {
    if (existing?.userId === client.userId) {
      existing.expiresAt = Date.now() + 45_000;
      send(client, { type: 'collaboration.lock.granted', payload: { resourceKey: client.resourceKey, blockId, lock: existing } });
    }
    return;
  }
  if (existing && existing.expiresAt > Date.now() && existing.userId !== client.userId) {
    send(client, { type: 'collaboration.lock.denied', payload: { resourceKey: client.resourceKey, blockId, lock: existing } });
    return;
  }

  const lock: LockState = {
    resourceType,
    resourceId,
    blockId,
    userId: client.userId,
    username: client.username,
    displayName: client.displayName,
    acquiredAt: existing?.acquiredAt || new Date().toISOString(),
    expiresAt: Date.now() + 45_000,
  };
  locks.set(lockId, lock);
  send(client, { type: 'collaboration.lock.granted', payload: { resourceKey: client.resourceKey, blockId, lock } });
  sendRoom(client.resourceKey, { type: 'collaboration.lock.changed', payload: { resourceKey: client.resourceKey, blockId, lock } }, client.userId);
  broadcastPresence(client.resourceKey);
}

export function initializeRealtime(server: HttpServer): WebSocketServer {
  if (websocketServer) return websocketServer;

  websocketServer = new WebSocketServer({ noServer: true });
  cleanupTimer = setInterval(cleanupExpiredState, 15_000);

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
    const client: ClientInfo = {
      socket,
      userId: String(user.id),
      username: String(user.username || user.id),
      displayName: String(user.displayName || user.display_name || user.username || user.id),
      role: user.role,
    };
    clients.add(client);
    send(client, { type: 'connection.ready', userId: client.userId, payload: { username: client.username, displayName: client.displayName } });

    socket.on('message', raw => {
      try {
        const message = JSON.parse(String(raw));
        const type = String(message?.type || '');
        if (type === 'ping') {
          const room = client.resourceKey ? presence.get(client.resourceKey) : undefined;
          const state = room?.get(client.userId);
          if (state) state.lastSeen = Date.now();
          for (const lock of locks.values()) {
            if (lock.userId === client.userId) lock.expiresAt = Date.now() + 45_000;
          }
          send(client, { type: 'pong' });
        } else if (type === 'collaboration.join') {
          joinResource(client, message.payload);
        } else if (type === 'collaboration.presence.update') {
          updatePresence(client, message.payload);
        } else if (type === 'collaboration.lock.acquire' || type === 'collaboration.lock.release' || type === 'collaboration.lock.refresh') {
          handleLockMessage(client, type, message.payload);
        } else if (type === 'collaboration.leave') {
          const oldKey = client.resourceKey;
          removePresence(client);
          releaseLocksForUser(client.userId, oldKey);
          client.resourceKey = undefined;
        }
      } catch {
        // Unbekannte oder ungültige Clientnachrichten werden bewusst ignoriert.
      }
    });

    const disconnect = () => {
      const oldKey = client.resourceKey;
      removePresence(client);
      releaseLocksForUser(client.userId, oldKey);
      clients.delete(client);
    };
    socket.on('close', disconnect);
    socket.on('error', disconnect);
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

export function stopRealtime(): void {
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = null;
  websocketServer?.close();
  websocketServer = null;
  clients.clear();
  presence.clear();
  locks.clear();
}
