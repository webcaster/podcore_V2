import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Clock, Mic2, MessageSquare, 
  ChevronRight, AlertCircle, RefreshCw, Eye, User, Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { approvalsApi, episodesApi } from '../lib/api';
import { useApp } from '../contexts/AppContext';

const ApprovalsPage: React.FC = () => {
  const { can, showSuccess, showError } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ episodes: any[], questions: any[], canApprove?: boolean }>({ episodes: [], questions: [] });
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await approvalsApi.getPending();
      // api.get() gibt data.data zurück (unwrapped), also ist res = { episodes, questions, ... }
      if (res && typeof res === 'object' && ('episodes' in res || 'questions' in res)) {
        setData(res as any);
      } else {
        // Fallback: leere Daten
        setData({ episodes: [], questions: [], canApprove: false });
      }
    } catch (err: any) {
      console.error('Failed to load approvals:', err);
      // Kein showError – stattdessen leere Liste anzeigen
      setData({ episodes: [], questions: [], canApprove: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveEpisode = async (id: string) => {
    setProcessingId(id);
    try {
      await episodesApi.approve(id);
      showSuccess('Episode freigegeben');
      loadData();
    } catch (err) {
      showError('Fehler bei der Freigabe');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectEpisode = async (id: string) => {
    const reason = window.prompt('Grund für die Ablehnung (optional):');
    if (reason === null) return;
    
    setProcessingId(id);
    try {
      await episodesApi.reject(id, reason);
      showSuccess('Episode abgelehnt');
      loadData();
    } catch (err) {
      showError('Fehler beim Ablehnen');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveQuestion = async (id: string) => {
    setProcessingId(id);
    try {
      await episodesApi.approveQuestion(id);
      showSuccess('Interview-Frage freigegeben');
      loadData();
    } catch (err) {
      showError('Fehler bei der Freigabe');
    } finally {
      setProcessingId(null);
    }
  };

  // canApprove: entweder aus API-Response oder lokale Permission-Prüfung
  const canApprove = data.canApprove ?? (can('canApproveEpisodes') || can('canApproveInterviewQuestions'));
  const hasAny = data.episodes.length > 0 || data.questions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Freigabe-Center</h1>
          <p className="text-obsidian-400">
            {canApprove
              ? 'Alle ausstehenden Freigaben für Episoden und Interviews'
              : 'Deine ausstehenden Freigabe-Anfragen'}
          </p>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="p-2 text-obsidian-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-obsidian-800/50 rounded-xl border border-obsidian-700">
          <RefreshCw size={40} className="text-accent-purple animate-spin mb-4" />
          <p className="text-obsidian-400">Freigaben werden geladen...</p>
        </div>
      ) : !hasAny ? (
        <div className="flex flex-col items-center justify-center py-20 bg-obsidian-800/50 rounded-xl border border-obsidian-700">
          <CheckCircle size={48} className="text-green-500/40 mb-4" />
          <p className="text-obsidian-300 font-semibold">Keine ausstehenden Freigaben</p>
          <p className="text-obsidian-500 text-sm mt-1">
            {canApprove ? 'Alle Episoden und Fragen sind auf dem aktuellen Stand.' : 'Du hast keine offenen Freigabe-Anfragen.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Episoden Freigaben */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Mic2 size={18} className="text-accent-purple" />
              <h2 className="text-lg font-semibold text-white">Episoden ({data.episodes.length})</h2>
            </div>
            
            {data.episodes.length === 0 ? (
              <div className="p-8 text-center bg-obsidian-800/30 rounded-xl border border-obsidian-700/50">
                <CheckCircle size={32} className="text-green-500/30 mx-auto mb-3" />
                <p className="text-obsidian-500">Keine ausstehenden Episoden-Freigaben</p>
              </div>
            ) : (
              data.episodes.map((episode: any) => (
                <div key={episode.id} className="bg-obsidian-800 rounded-xl border border-obsidian-700 overflow-hidden hover:border-obsidian-600 transition-all group">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-accent-purple/20 text-accent-purple rounded uppercase tracking-wider">
                            Folge {episode.number}
                          </span>
                          <span className="text-[10px] text-obsidian-500 flex items-center gap-1">
                            <Clock size={10} />
                            {episode.approvalRequestedAt ? new Date(episode.approvalRequestedAt).toLocaleString('de-DE') : '–'}
                          </span>
                        </div>
                        <h3 className="font-bold text-white group-hover:text-accent-purple transition-colors">
                          {episode.title}
                        </h3>
                      </div>
                      <Link to={`/episodes/${episode.id}`} className="p-2 text-obsidian-400 hover:text-white hover:bg-obsidian-700 rounded-lg transition-all">
                        <Eye size={18} />
                      </Link>
                    </div>
                    
                    {episode.approvalComment && (
                      <div className="mb-4 p-3 bg-obsidian-900/50 rounded-lg border border-obsidian-700/50 text-sm text-obsidian-300 italic">
                        "{episode.approvalComment}"
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {canApprove ? (
                        <>
                          <button
                            onClick={() => handleApproveEpisode(episode.id)}
                            disabled={processingId === episode.id}
                            className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle size={16} />
                            Freigeben
                          </button>
                          <button
                            onClick={() => handleRejectEpisode(episode.id)}
                            disabled={processingId === episode.id}
                            className="py-2 px-3 bg-obsidian-700 hover:bg-red-600/20 hover:text-red-500 text-obsidian-300 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            <XCircle size={16} />
                            Ablehnen
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 py-2 px-3 bg-obsidian-700/50 text-obsidian-500 text-xs text-center rounded-lg flex items-center justify-center gap-2">
                          <Clock size={12} />
                          Wartet auf Freigabe durch Moderator
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Interview-Fragen Freigaben */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <MessageSquare size={18} className="text-accent-cyan" />
              <h2 className="text-lg font-semibold text-white">Interview-Fragen ({data.questions.length})</h2>
            </div>

            {data.questions.length === 0 ? (
              <div className="p-8 text-center bg-obsidian-800/30 rounded-xl border border-obsidian-700/50">
                <CheckCircle size={32} className="text-green-500/30 mx-auto mb-3" />
                <p className="text-obsidian-500">Keine ausstehenden Interview-Freigaben</p>
              </div>
            ) : (
              data.questions.map((question: any) => (
                <div key={question.id} className="bg-obsidian-800 rounded-xl border border-obsidian-700 overflow-hidden hover:border-obsidian-600 transition-all group">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-accent-cyan/20 text-accent-cyan rounded uppercase tracking-wider flex items-center gap-1">
                            <User size={10} />
                            {question.partnerName || 'Gast'}
                          </span>
                          {question.episodeTitle && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-obsidian-700 text-obsidian-400 rounded truncate max-w-[150px]">
                              {question.episodeTitle}
                            </span>
                          )}
                        </div>
                        <p className="text-white font-medium leading-relaxed">
                          {question.question}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      {can('canApproveInterviewQuestions') ? (
                        <button
                          onClick={() => handleApproveQuestion(question.id)}
                          disabled={processingId === question.id}
                          className="flex-1 py-2 px-3 bg-accent-cyan hover:bg-accent-cyan-light text-obsidian-900 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Freigeben
                        </button>
                      ) : (
                        <div className="flex-1 py-2 px-3 bg-obsidian-700/50 text-obsidian-500 text-xs text-center rounded-lg flex items-center justify-center gap-2">
                          <Clock size={12} />
                          Wartet auf Freigabe
                        </div>
                      )}
                    </div>
                  </div>
                
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
