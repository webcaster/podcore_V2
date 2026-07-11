import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Loader2, Megaphone, RefreshCw, Sparkles, Target } from 'lucide-react';
import { episodeWorkflowApi } from '../../lib/api';

interface SponsoringQuickBookProps {
  episodeId: string;
  onBooked?: (booking: any) => void;
}

export default function SponsoringQuickBook({ episodeId, onBooked }: SponsoringQuickBookProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [position, setPosition] = useState('mid-roll');
  const [loading, setLoading] = useState(true);
  const [bookingKey, setBookingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecommendations(await episodeWorkflowApi.getSponsoringRecommendations(episodeId));
    } catch (requestError: any) {
      setError(requestError?.message || 'Empfehlungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => { void load(); }, [load]);

  const book = async (recommendation: any, slot: any) => {
    const key = `${recommendation.sponsor.id}:${slot.id}`;
    setBookingKey(key);
    setError(null);
    setSuccess(null);
    try {
      const result = await episodeWorkflowApi.quickBookSponsor(episodeId, {
        sponsorId: recommendation.sponsor.id,
        slotId: slot.id,
        position,
        duration: slot.default_duration || slot.duration || undefined,
        presentationText: recommendation.sponsor.presentation_text || undefined,
      });
      setSuccess(`${recommendation.sponsor.name} wurde als ${position.replace('-', ' ')} gebucht.`);
      setRecommendations(previous => previous.map(item => item.sponsor.id === recommendation.sponsor.id
        ? { ...item, slots: item.slots.filter((candidate: any) => candidate.id !== slot.id) }
        : item));
      onBooked?.({ ...result, position, sponsor_name: recommendation.sponsor.name });
    } catch (requestError: any) {
      setError(requestError?.message || 'Schnellbuchung fehlgeschlagen.');
    } finally {
      setBookingKey(null);
    }
  };

  return (
    <section className="card border-accent-orange/25 bg-accent-orange/5 space-y-4" aria-label="Sponsoring-Empfehlungen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-text-primary"><Sparkles size={16} className="text-accent-orange" /> Intelligente Sponsoring-Empfehlungen</h3>
          <p className="mt-1 text-xs text-text-muted">Tags, Zielgruppe, Episodenlänge und verfügbare Werbeplätze werden gewichtet abgeglichen.</p>
        </div>
        <button type="button" onClick={() => void load()} className="btn-ghost flex items-center gap-1 text-xs" disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Neu berechnen</button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Werbeposition">
        {['pre-roll', 'mid-roll', 'post-roll'].map(value => (
          <button key={value} type="button" onClick={() => setPosition(value)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${position === value ? 'border-accent-orange bg-accent-orange/20 text-accent-orange' : 'border-surface-border text-text-muted hover:text-text-primary'}`}>{value.replace('-', ' ')}</button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">{error}</div>}
      {success && <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 text-xs text-accent-green"><CheckCircle size={14} /> {success}</div>}
      {loading ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted"><Loader2 size={16} className="animate-spin" /> Matchmaking läuft…</div> : recommendations.length === 0 ? <div className="py-8 text-center text-sm text-text-muted">Keine aktiven Sponsorenprofile gefunden.</div> : (
        <div className="space-y-3">
          {recommendations.slice(0, 6).map(recommendation => (
            <article key={recommendation.sponsor.id} className="rounded-xl border border-surface-border bg-obsidian-900/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><Target size={14} className="text-accent-purple" /><h4 className="font-medium text-text-primary">{recommendation.sponsor.name}</h4><span className="badge bg-accent-purple/15 text-accent-purple">{recommendation.score}% Match</span></div>
                  <div className="mt-2 flex flex-wrap gap-1.5">{recommendation.reasons.map((reason: string) => <span key={reason} className="rounded-full bg-surface-overlay px-2 py-1 text-[10px] text-text-muted">{reason}</span>)}</div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {recommendation.slots.length === 0 ? <p className="text-xs text-text-muted">Derzeit kein buchbarer Werbeplatz.</p> : recommendation.slots.map((slot: any) => {
                  const key = `${recommendation.sponsor.id}:${slot.id}`;
                  return <button key={slot.id} type="button" onClick={() => void book(recommendation, slot)} disabled={!!bookingKey} className="flex items-center justify-between gap-3 rounded-lg border border-accent-orange/25 bg-accent-orange/5 p-3 text-left hover:bg-accent-orange/10 disabled:opacity-50"><span><span className="block text-xs font-medium text-text-primary">{slot.name || slot.category_name || 'Werbeplatz'}</span><span className="text-[10px] text-text-muted">{slot.default_duration || slot.duration ? `${slot.default_duration || slot.duration} Sek.` : 'Dauer nach Absprache'}</span></span>{bookingKey === key ? <Loader2 size={15} className="animate-spin text-accent-orange" /> : <span className="flex items-center gap-1 text-xs font-semibold text-accent-orange"><Megaphone size={13} /> 1-Klick buchen</span>}</button>;
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
