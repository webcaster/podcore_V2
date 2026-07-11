import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, Circle, Loader2, MessageSquare, Radio, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { episodeWorkflowApi } from '../../lib/api';
import { realtimeClient, RealtimeEvent } from '../../lib/realtime';

interface NotificationCenterProps {
  compact?: boolean;
}

function normalize(item: any) {
  return {
    id: item.id,
    type: item.type || 'info',
    title: item.title || 'PodCore-Benachrichtigung',
    message: item.message || '',
    episodeId: item.episodeId || item.entity_id || item.entityId || null,
    metadata: item.metadata || {},
    isRead: Boolean(item.isRead ?? item.is_read),
    createdAt: item.createdAt || item.created_at || item.timestamp || new Date().toISOString(),
  };
}

export default function NotificationCenter({ compact = false }: NotificationCenterProps) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await episodeWorkflowApi.getNotifications(40);
      setItems(result.map(normalize));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => realtimeClient.subscribeStatus(setConnection), []);
  useEffect(() => realtimeClient.subscribe((event: RealtimeEvent) => {
    if (event.type !== 'notification.created') return;
    const created = normalize({ ...event.payload, episodeId: event.episodeId, timestamp: event.timestamp });
    setItems(previous => [created, ...previous.filter(item => item.id !== created.id)].slice(0, 40));
  }), []);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = useMemo(() => items.filter(item => !item.isRead).length, [items]);
  const markRead = async (ids?: string[]) => {
    await episodeWorkflowApi.markNotificationsRead(ids);
    setItems(previous => previous.map(item => !ids || ids.includes(item.id) ? { ...item, isRead: true } : item));
  };
  const openItem = async (item: any) => {
    if (!item.isRead) await markRead([item.id]);
    setOpen(false);
    if (item.episodeId) navigate(`/episodes/${item.episodeId}`);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" onClick={() => setOpen(value => !value)} className={`relative flex items-center rounded-lg text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary ${compact ? 'justify-center p-2' : 'w-full gap-2 px-2 py-1.5 text-sm'}`} title="Benachrichtigungen" aria-label={`${unread} ungelesene Benachrichtigungen`}>
        <Bell size={16} />{!compact && <span>Benachrichtigungen</span>}{unread > 0 && <span className={`${compact ? 'absolute -right-1 -top-1' : 'ml-auto'} flex min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[9px] font-bold leading-4 text-white`}>{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && <div className={`fixed inset-x-3 top-16 z-[70] max-h-[75vh] overflow-hidden rounded-xl border border-surface-border bg-obsidian-800 shadow-2xl md:absolute md:bottom-0 md:left-full md:right-auto md:top-auto md:ml-3 md:w-96`}>
        <div className="flex items-center justify-between border-b border-surface-border p-3"><div><h3 className="text-sm font-semibold text-text-primary">Benachrichtigungen</h3><div className="mt-0.5 flex items-center gap-1 text-[10px] text-text-muted"><Radio size={9} className={connection === 'connected' ? 'text-accent-green' : connection === 'connecting' ? 'text-accent-amber' : 'text-accent-red'} /> {connection === 'connected' ? 'Live verbunden' : connection === 'connecting' ? 'Verbindung wird aufgebaut' : 'Offline – Wiederverbindung aktiv'}</div></div><div className="flex items-center gap-1"><button type="button" onClick={() => void load()} className="btn-ghost p-1.5" title="Neu laden"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button><button type="button" onClick={() => setOpen(false)} className="btn-ghost p-1.5" title="Schließen"><X size={12} /></button></div></div>
        <div className="max-h-[58vh] overflow-y-auto">{loading && items.length === 0 ? <div className="flex items-center justify-center gap-2 py-10 text-xs text-text-muted"><Loader2 size={14} className="animate-spin" /> Feed wird geladen…</div> : items.length === 0 ? <div className="py-10 text-center text-xs text-text-muted">Keine Benachrichtigungen vorhanden.</div> : items.map(item => <button type="button" key={item.id} onClick={() => void openItem(item)} className={`flex w-full items-start gap-3 border-b border-surface-border/60 p-3 text-left transition-colors hover:bg-surface-overlay/70 ${item.isRead ? 'opacity-65' : 'bg-accent-purple/5'}`}><div className={`mt-0.5 rounded-full p-1.5 ${item.type === 'mention' ? 'bg-accent-blue/15 text-accent-blue' : 'bg-accent-purple/15 text-accent-purple'}`}>{item.type === 'mention' ? <MessageSquare size={12} /> : <Bell size={12} />}</div><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><p className="flex-1 text-xs font-medium text-text-primary">{item.title}</p>{!item.isRead && <Circle size={7} className="mt-1 fill-accent-blue text-accent-blue" />}</div><p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{item.message}</p><p className="mt-1 text-[9px] text-text-muted">{new Date(item.createdAt).toLocaleString('de-DE')}</p></div></button>)}</div>
        {items.length > 0 && <button type="button" onClick={() => void markRead()} className="flex w-full items-center justify-center gap-1 border-t border-surface-border p-2 text-xs text-accent-blue hover:bg-surface-overlay"><CheckCheck size={13} /> Alle als gelesen markieren</button>}
      </div>}
    </div>
  );
}
