import React from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border animate-slide-in ${
            toast.type === 'success' ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' :
            toast.type === 'error' ? 'bg-accent-red/10 border-accent-red/30 text-accent-red' :
            toast.type === 'warning' ? 'bg-accent-orange/10 border-accent-orange/30 text-accent-orange' :
            'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
          }`}
        >
          <span className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.type === 'error' && <XCircle size={16} />}
            {toast.type === 'warning' && <AlertTriangle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
          </span>
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
