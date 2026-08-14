import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { realtimeClient, RealtimeEvent } from '../lib/realtime';

export interface CollaborationUser {
  userId: string;
  username: string;
  displayName: string;
  role?: string;
  resourceType: 'episode' | 'idea' | 'editorial';
  resourceId: string;
  blockId?: string;
  status: 'viewing' | 'editing';
  lastSeen: number;
}

export interface CollaborationLock {
  resourceType: 'episode' | 'idea' | 'editorial';
  resourceId: string;
  blockId: string;
  userId: string;
  username: string;
  displayName: string;
  acquiredAt: string;
  expiresAt: number;
}

function isCurrentRoom(event: RealtimeEvent, roomKey: string): boolean {
  return event.payload?.resourceKey === roomKey;
}

export function useEpisodeCollaboration(episodeId?: string, currentUserId?: string) {
  const roomKey = episodeId ? `episode:${episodeId}` : '';
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [locks, setLocks] = useState<Record<string, CollaborationLock>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const activeBlockRef = useRef<string | null>(null);
  const ownedLockRef = useRef<string | null>(null);

  useEffect(() => {
    if (!episodeId || !currentUserId) return;

    const handleEvent = (event: RealtimeEvent) => {
      if (!isCurrentRoom(event, roomKey)) return;
      if (event.type === 'collaboration.presence.snapshot' || event.type === 'collaboration.presence.changed') {
        setUsers(Array.isArray(event.payload?.users) ? event.payload.users : []);
        if (event.type === 'collaboration.presence.snapshot') {
          const snapshotLocks = Array.isArray(event.payload?.locks) ? event.payload.locks : [];
          setLocks(Object.fromEntries(snapshotLocks.map((lock: CollaborationLock) => [lock.blockId, lock])));
        }
      }
      if (event.type === 'collaboration.lock.changed') {
        setLocks(previous => {
          const next = { ...previous };
          if (event.payload?.lock) next[event.payload.blockId] = event.payload.lock;
          else delete next[event.payload?.blockId];
          return next;
        });
      }
      if (event.type === 'collaboration.lock.granted') {
        const lock = event.payload?.lock as CollaborationLock | undefined;
        if (lock) {
          ownedLockRef.current = lock.blockId;
          setLocks(previous => ({ ...previous, [lock.blockId]: lock }));
          setLockMessage(null);
        }
      }
      if (event.type === 'collaboration.lock.denied') {
        const lock = event.payload?.lock as CollaborationLock | undefined;
        setLockMessage(lock ? `${lock.displayName} bearbeitet diesen Block gerade.` : 'Dieser Block wird gerade von einer anderen Person bearbeitet.');
        if (activeBlockRef.current === event.payload?.blockId) {
          activeBlockRef.current = null;
          setActiveBlockId(null);
        }
      }
    };

    const unsubscribe = realtimeClient.subscribe(handleEvent);
    const unsubscribeStatus = realtimeClient.subscribeStatus(status => setConnectionStatus(status));
    return () => {
      if (ownedLockRef.current) realtimeClient.releaseLock(ownedLockRef.current);
      realtimeClient.leaveResource();
      unsubscribe();
      unsubscribeStatus();
      activeBlockRef.current = null;
      ownedLockRef.current = null;
      setUsers([]);
      setLocks({});
    };
  }, [episodeId, currentUserId, roomKey]);

  useEffect(() => {
    if (connectionStatus === 'connected' && roomKey) realtimeClient.joinResource('episode', episodeId!);
  }, [connectionStatus, roomKey, episodeId]);

  useEffect(() => {
    if (!activeBlockId || connectionStatus !== 'connected') return;
    const timer = window.setInterval(() => realtimeClient.refreshLock(activeBlockId), 15_000);
    return () => window.clearInterval(timer);
  }, [activeBlockId, connectionStatus]);

  const beginEditing = useCallback((blockId: string) => {
    setLockMessage(null);
    if (activeBlockRef.current && activeBlockRef.current !== blockId) {
      realtimeClient.releaseLock(activeBlockRef.current);
    }
    activeBlockRef.current = blockId;
    setActiveBlockId(blockId);
    realtimeClient.updatePresence({ blockId, status: 'editing' });
    realtimeClient.acquireLock(blockId);
  }, []);

  const stopEditing = useCallback((blockId?: string) => {
    const target = blockId || activeBlockRef.current;
    if (!target) return;
    realtimeClient.releaseLock(target);
    realtimeClient.updatePresence({ status: 'viewing' });
    if (activeBlockRef.current === target) {
      activeBlockRef.current = null;
      setActiveBlockId(null);
    }
  }, []);

  const isLockedByOther = useCallback((blockId: string) => {
    const lock = locks[blockId];
    return Boolean(lock && lock.userId !== currentUserId && lock.expiresAt > Date.now());
  }, [locks, currentUserId]);

  const getBlockCollaborators = useCallback((blockId: string) => users.filter(user => user.blockId === blockId), [users]);
  const otherUsers = useMemo(() => users.filter(user => user.userId !== currentUserId), [users, currentUserId]);

  return {
    users,
    otherUsers,
    locks,
    connectionStatus,
    activeBlockId,
    lockMessage,
    beginEditing,
    stopEditing,
    isLockedByOther,
    getBlockCollaborators,
    clearLockMessage: () => setLockMessage(null),
  };
}
