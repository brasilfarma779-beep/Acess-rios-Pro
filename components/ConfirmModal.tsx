
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirmar', 
  cancelLabel = 'Cancelar',
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 text-center">
          <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${variant === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
            {variant === 'danger' ? (
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : (
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          
          <h2 className="text-xl font-black text-zinc-900 italic uppercase leading-tight mb-2">{title}</h2>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">{message}</p>
        </div>
        
        <div className="p-6 bg-zinc-50 flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={`flex-1 py-4 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all ${variant === 'danger' ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
