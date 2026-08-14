import React, { useEffect, useState } from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { realtimeClient, RealtimeEvent } from '../../lib/realtime';
import { useApp } from '../../contexts/AppContext';

type ResourceType = 'episode' | 'idea' | 'editorial';

interface CollaborationPresenceBarProps {
  resourceType: ResourceType;
  resourceId: string;
  context?: string;
  compact?: boolean;
}

export default function CollaborationPresenceBar({ resourceType, resourceId, context, compact = false }: CollaborationPresenceBarProps) {
  const { user } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const roomKey = `${resourceType}:${resourceId}`;

  useEffect(() => {
    if (!user?.id) return;
    const onEvent = (event: RealtimeEvent) => {
      if (event.payload?.resourceKey !== roomKey) return;
      if (event.type === 'collaboration.presence.snapshot' || event.type === 'collaboration.presence.changed') {
        setUsers(Array.isArray(event.payload?.users) ? event.payload.users : []);
      }
    };
    const unsubscribe = realtimeClient.subscribe(onEvent);
    const unsubscribeStatus = realtimeClient.subscribeStatus(nextStatus => setStatus(nextStatus));
    return () => {
      realtimeClient.leaveResource();
      unsubscribe();
      unsubscribeStatus();
      setUsers([]);
    };
  }, [user?.id, roomKey]);

  useEffect(() => {
    if (status === 'connected') {
      realtimeClient.joinResource(resourceType, resourceId);
      realtimeClient.updatePresence({ blockId: context, status: 'viewing' });
    }
  }, [status, resourceType, resourceId, context]);

  const otherUsers = users.filter(item => item.userId !== user?.id);
  const statusLabel = status === 'connected' ? 'Live verbunden' : status === 'connecting' ? 'Verbinde …' : 'Offline';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? 'text-[11px]' : 'text-xs'} text-text-secondary`}>
      {status === 'connected' ? <Wifi size={14} className="text-accent-green" /> : <WifiOff size={14} className="text-text-muted" />}
      <span className={status === 'connected' ? 'text-accent-green' : 'text-text-muted'}>{statusLabel}</span>
      <span className="text-text-muted">·</span>
      <Users size={14} className="text-accent-purple" />
      {otherUsers.length === 0 ? (
        <span>Du arbeitest allein in diesem Bereich.</span>
      ) : (
        <span>
          {otherUsers.slice(0, 4).map(item => item.displayName).join(', ')} arbeiten ebenfalls hier
          {otherUsers.length > 4 ? ` +${otherUsers.length - 4}` : ''}.
        </span>
      )}
    </div>
  );
}
