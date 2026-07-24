import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'default';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function handle(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{state.options.title}</h3>
            {state.options.description && (
              <p className="mt-1.5 text-sm text-gray-500">{state.options.description}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => handle(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {state.options.cancelText ?? 'ยกเลิก'}
              </button>
              <button
                onClick={() => handle(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  state.options.tone === 'danger' ? 'bg-close-600 hover:bg-close-700' : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {state.options.confirmText ?? 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
