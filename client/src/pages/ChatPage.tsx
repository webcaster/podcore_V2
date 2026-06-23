import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Hash, Send, Trash2, RefreshCw, MessageSquare, Bell, Settings, Edit,
  Loader2, ChevronRight,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { api } from '../lib/api';

const CHANNELS = [
  { id: 'allgemein', name: 'Allgemein', icon: <Hash size={14} />, description: 'Allgemeine Teamkommunikation' },
  { id: 'redaktion', name: 'Redaktion', icon: <Edit size={14} />, description: 'Redaktionelle Abstimmungen' },
  { id: 'technik', name: 'Technik', icon: <Settings size={14} />, description: 'Technische Themen' },
  { id: 'ankuendigungen', name: 'Ankündigungen', icon: <Bell size={14} />, description: 'Wichtige Mitteilungen' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-400',
  moderator: 'text-yellow-400',
  redakteur: 'text-accent-blue',
  gast: 'text-text-muted',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  redakteur: 'Redakteur',
  gast: 'Gast',
};

export default function ChatPage() {
  const { user, addToast } = useApp();
  const [activeChannel, setActiveChannel] = useState('allgemein');
  const [channels, setChannels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const loadChannels = async () => {
    try {
      const res = await api.get<any[]>('/chat/channels');
      setChannels(res);
    } catch (_) {}
  };

  const loadMessages = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await api.get<any[]>(`/chat/messages/${activeChannel}?limit=50`);
      setMessages(res);
      if (res.length > 0) lastMessageIdRef.current = res[res.length - 1].id;
      // Refresh channels to update unread counts
      loadChannels();
    } catch (err: any) {
      if (showLoader) addToast('error', err.message || 'Nachrichten konnten nicht geladen werden');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [activeChannel]);

  useEffect(() => {
    loadMessages(true);
    // Polling every 5 seconds
    pollingRef.current = setInterval(() => loadMessages(false), 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadMessages]);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    setIsSending(true);
    try {
      await api.post('/chat/messages', { channel: activeChannel, message: input.trim() });
      setInput('');
      await loadMessages(false);
    } catch (err: any) {
      addToast('error', err.message || 'Nachricht konnte nicht gesendet werden');
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      await api.delete(`/chat/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      addToast('success', 'Nachricht gelöscht');
    } catch (err: any) {
      addToast('error', err.message || 'Fehler beim Löschen');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const activeChannelInfo = CHANNELS.find(c => c.id === activeChannel);
  const channelWithData = channels.find(c => c.id === activeChannel);
  const totalUnread = channels.reduce((sum, c) => sum + (c.unread || 0), 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 bg-obsidian-900 rounded-xl overflow-hidden border border-obsidian-700">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-obsidian-800 border-r border-obsidian-700 flex flex-col">
        <div className="p-4 border-b border-obsidian-700">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-accent-blue" />
            <h2 className="font-semibold text-text-primary text-sm">Team-Chat</h2>
            {totalUnread > 0 && (
              <span className="ml-auto bg-accent-blue text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs font-semibold text-text-muted px-2 py-1 uppercase tracking-wider">Kanäle</p>
          {CHANNELS.map(ch => {
            const chData = channels.find(c => c.id === ch.id);
            const unread = chData?.unread || 0;
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'text-text-secondary hover:bg-obsidian-700 hover:text-text-primary'
                }`}
              >
                <span className="flex-shrink-0">{ch.icon}</span>
                <span className="flex-1 text-left truncate">{ch.name}</span>
                {unread > 0 && (
                  <span className="bg-accent-blue text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
                {isActive && <ChevronRight size={12} className="flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        {/* User info */}
        <div className="p-3 border-t border-obsidian-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-bold">
              {user?.displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{user?.displayName}</p>
              <p className={`text-xs ${ROLE_COLORS[user?.role || ''] || 'text-text-muted'}`}>
                {ROLE_LABELS[user?.role || ''] || user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="px-4 py-3 border-b border-obsidian-700 bg-obsidian-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">{activeChannelInfo?.icon}</span>
            <div>
              <h3 className="font-semibold text-text-primary text-sm">{activeChannelInfo?.name}</h3>
              <p className="text-xs text-text-muted">{activeChannelInfo?.description}</p>
            </div>
          </div>
          <button
            onClick={() => loadMessages(true)}
            className="p-1.5 hover:bg-obsidian-700 rounded-lg transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw size={14} className={`text-text-muted ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-text-muted" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={40} className="text-text-muted mb-3" />
              <p className="text-text-secondary font-medium">Noch keine Nachrichten</p>
              <p className="text-text-muted text-sm mt-1">Schreibe die erste Nachricht im #{activeChannelInfo?.name} Kanal</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.senderId === user?.id;
              const prevMsg = messages[idx - 1];
              const isSameUser = prevMsg && prevMsg.senderId === msg.senderId;
              const timeDiff = prevMsg
                ? (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) / 60000
                : 999;
              const showHeader = !isSameUser || timeDiff > 5;

              return (
                <div key={msg.id} className={`group flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {showHeader && !isOwn && (
                    <div className="w-7 h-7 rounded-full bg-obsidian-600 flex items-center justify-center text-xs font-bold text-text-primary flex-shrink-0 mt-0.5">
                      {msg.senderName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  {!showHeader && !isOwn && <div className="w-7 flex-shrink-0" />}
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showHeader && (
                      <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-semibold text-text-primary">{msg.senderName}</span>
                        <span className={`text-xs ${ROLE_COLORS[msg.senderRole] || 'text-text-muted'}`}>
                          {ROLE_LABELS[msg.senderRole] || msg.senderRole}
                        </span>
                        <span className="text-xs text-text-muted">{formatTime(msg.createdAt)}</span>
                      </div>
                    )}
                    <div className={`relative px-3 py-2 rounded-xl text-sm ${
                      isOwn
                        ? 'bg-accent-blue text-white rounded-tr-sm'
                        : 'bg-obsidian-700 text-text-primary rounded-tl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      {!showHeader && (
                        <span className="text-xs opacity-60 mt-0.5 block">{formatTime(msg.createdAt)}</span>
                      )}
                      {(isOwn || user?.role === 'admin') && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex"
                          title="Löschen"
                        >
                          <Trash2 size={10} className="text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-obsidian-700 bg-obsidian-800">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Nachricht an #${activeChannelInfo?.name}...`}
              className="flex-1 bg-obsidian-700 border border-obsidian-600 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="btn-primary text-sm px-4 disabled:opacity-50"
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
          <p className="text-xs text-text-muted mt-1">
            Aktualisiert automatisch alle 5 Sekunden
          </p>
        </div>
      </div>
    </div>
  );
}
