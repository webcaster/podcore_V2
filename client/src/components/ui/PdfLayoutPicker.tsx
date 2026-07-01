import { useState, useEffect } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import { pdfLayoutsApi } from '../../lib/api';

interface PdfLayoutPickerProps {
  exportType: 'episode' | 'idea' | 'calendar' | 'invoice';
  value: string;
  onChange: (layoutId: string) => void;
  className?: string;
}

export default function PdfLayoutPicker({ exportType, value, onChange, className = '' }: PdfLayoutPickerProps) {
  const [layouts, setLayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    pdfLayoutsApi.list()
      .then(data => {
        // Show layouts matching this type or 'all'
        const filtered = data.filter((l: any) => l.exportType === exportType || l.exportType === 'all');
        setLayouts(filtered);
        // Auto-select default if nothing selected
        if (!value) {
          const def = filtered.find((l: any) => l.isDefault) || filtered[0];
          if (def) onChange(def.id);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [exportType]);

  if (isLoading || layouts.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FileText size={13} className="text-text-muted shrink-0" />
      <label className="text-xs text-text-muted shrink-0">Layout:</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none bg-obsidian-800 border border-surface-border rounded px-2 py-1 pr-6 text-xs text-text-primary cursor-pointer hover:border-accent-purple/50 transition-colors"
        >
          {layouts.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}{l.isDefault ? ' (Standard)' : ''}
            </option>
          ))}
        </select>
        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      </div>
    </div>
  );
}
