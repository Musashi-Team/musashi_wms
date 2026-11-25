import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (type, message) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  const value = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-lg border bg-white p-3 text-sm shadow-lg ${
              t.type === 'success' ? 'border-green-200' : 'border-brand-200'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0 text-brand-500" />
            )}
            <p className="flex-1 break-words">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-ink-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
