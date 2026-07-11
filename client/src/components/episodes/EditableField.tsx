import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2, Pencil, Redo2, Undo2 } from 'lucide-react';
import { episodeWorkflowApi } from '../../lib/api';

type InputKind = 'text' | 'textarea' | 'number' | 'date' | 'select';

export interface EditableFieldProps {
  episodeId: string;
  field: string;
  label: string;
  value: any;
  onChange: (value: any) => void;
  onSaved?: (data: any) => void;
  validate?: (value: any) => string | null;
  inputKind?: InputKind;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  expectedUpdatedAt?: string;
  toApiValue?: (value: any) => any;
}

function normalizeValue(value: any, inputKind: InputKind): any {
  if (inputKind === 'number') return value === '' ? null : Number(value);
  return value;
}

export default function EditableField({
  episodeId,
  field,
  label,
  value,
  onChange,
  onSaved,
  validate,
  inputKind = 'text',
  options = [],
  placeholder,
  disabled = false,
  rows = 4,
  className = '',
  expectedUpdatedAt,
  toApiValue,
}: EditableFieldProps) {
  const [draft, setDraft] = useState(value ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastSavedValue, setLastSavedValue] = useState(value ?? '');
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyRef = useRef<any[]>([value ?? '']);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const localValue = normalizeValue(draft, inputKind);
  const validationError = validate?.(toApiValue ? toApiValue(localValue) : localValue) || null;

  useEffect(() => () => {
    mountedRef.current = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!isFocused && value !== draft) {
      setDraft(value ?? '');
      setLastSavedValue(value ?? '');
      historyRef.current = [value ?? ''];
      setHistoryIndex(0);
    }
  }, [value, isFocused]);

  const save = useCallback(async (nextValue = draft) => {
    const normalized = normalizeValue(nextValue, inputKind);
    const apiValue = toApiValue ? toApiValue(normalized) : normalized;
    const error = validate?.(apiValue);
    if (error || disabled || normalized === lastSavedValue) return;
    setSaveState('saving');
    setServerError(null);
    try {
      const result = await episodeWorkflowApi.updateField(episodeId, field, apiValue, expectedUpdatedAt);
      if (!mountedRef.current) return;
      setLastSavedValue(normalized);
      setSaveState('saved');
      onSaved?.(result);
      window.setTimeout(() => mountedRef.current && setSaveState('idle'), 1400);
    } catch (error: any) {
      if (!mountedRef.current) return;
      setSaveState('error');
      setServerError(error?.message || 'Speichern fehlgeschlagen');
    }
  }, [draft, inputKind, validate, disabled, lastSavedValue, episodeId, field, expectedUpdatedAt, onSaved, toApiValue]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const normalized = normalizeValue(draft, inputKind);
    if (disabled || validationError || normalized === lastSavedValue) return;
    setSaveState('pending');
    timerRef.current = window.setTimeout(() => save(draft), 2000);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [draft, disabled, validationError, lastSavedValue, inputKind, save]);

  const applyValue = (nextValue: any, recordHistory = true) => {
    setDraft(nextValue);
    onChange(normalizeValue(nextValue, inputKind));
    setServerError(null);
    if (!recordHistory) return;
    const currentHistory = historyRef.current.slice(0, historyIndex + 1);
    if (currentHistory[currentHistory.length - 1] !== nextValue) currentHistory.push(nextValue);
    historyRef.current = currentHistory.slice(-50);
    setHistoryIndex(historyRef.current.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    applyValue(historyRef.current[nextIndex], false);
  };

  const redo = () => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    applyValue(historyRef.current[nextIndex], false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    } else if (event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
    }
  };

  const sharedProps = {
    value: draft ?? '',
    disabled,
    placeholder,
    onFocus: () => setIsFocused(true),
    onBlur: () => { setIsFocused(false); if (!validationError) save(draft); },
    onKeyDown: handleKeyDown,
    className: `input w-full pr-24 ${validationError || serverError ? 'border-accent-red' : saveState === 'saved' ? 'border-accent-green/60' : ''}`,
    'aria-invalid': !!validationError,
    'aria-describedby': `${field}-feedback`,
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5" htmlFor={`editable-${field}`}>
          <Pencil size={11} className="text-accent-purple" /> {label}
        </label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} disabled={historyIndex <= 0 || disabled} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30" title="Rückgängig (Strg+Z)"><Undo2 size={12} /></button>
          <button type="button" onClick={redo} disabled={historyIndex >= historyRef.current.length - 1 || disabled} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30" title="Wiederholen (Strg+Y)"><Redo2 size={12} /></button>
        </div>
      </div>
      <div className="relative">
        {inputKind === 'textarea' ? (
          <textarea id={`editable-${field}`} rows={rows} {...sharedProps} onChange={event => applyValue(event.target.value)} />
        ) : inputKind === 'select' ? (
          <select id={`editable-${field}`} {...sharedProps} onChange={event => applyValue(event.target.value)}>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : (
          <input id={`editable-${field}`} type={inputKind} {...sharedProps} onChange={event => applyValue(event.target.value)} />
        )}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px]">
          {saveState === 'pending' && <span className="text-text-muted">Auto-Save…</span>}
          {saveState === 'saving' && <Loader2 size={13} className="animate-spin text-accent-purple" />}
          {saveState === 'saved' && <Check size={13} className="text-accent-green" />}
          {saveState === 'error' && <AlertCircle size={13} className="text-accent-red" />}
        </span>
      </div>
      <div id={`${field}-feedback`} className="min-h-[16px] text-[11px]">
        {validationError ? <span className="text-accent-red">{validationError}</span> : serverError ? <span className="text-accent-red">{serverError}</span> : <span className="text-text-muted">Änderungen werden nach 2 Sekunden automatisch gespeichert.</span>}
      </div>
    </div>
  );
}
