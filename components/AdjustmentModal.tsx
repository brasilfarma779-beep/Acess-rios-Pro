
import React, { useState, useEffect } from 'react';
import { Movement, AdjustmentTarget } from '../types';
import { generateId } from '../utils';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: AdjustmentTarget;
  repId: string;
  onSave: (m: Movement) => void;
}

const AdjustmentModal: React.FC<AdjustmentModalProps> = ({ isOpen, onClose, target, repId, onSave }) => {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTargetLabel = () => {
    switch (target) {
      case 'sold': return 'Vendido (Preto)';
      case 'commission': return 'Comissão (Verde)';
      case 'total': return 'Total Maleta (Amarelo)';
      case 'additional': return 'Adicionais (Azul)';
      default: return 'Valor';
    }
  };

  const getTargetColor = () => {
    switch (target) {
      case 'sold': return 'text-zinc-900';
      case 'commission': return 'text-emerald-600';
      case 'total': return 'text-amber-500';
      case 'additional': return 'text-blue-600';
      default: return 'text-zinc-900';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(value.replace(',', '.')) || 0;
    if (val === 0) return alert('Insira um valor diferente de zero.');

    onSave({
      id: generateId(),
      date: new Date().toISOString(),
      representativeId: repId,
      productId: 'manual-adj',
      type: 'Ajuste',
      quantity: 1,
      value: val,
      adjustmentTarget: target
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-xl font-black text-zinc-900 leading-none">Ajustar Valor</h2>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${getTargetColor()}`}>{getTargetLabel()}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center py-4">
             <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-4 italic">Insira o valor para ADICIONAR ou REMOVER (use sinal de -) deste campo.</p>
             <input 
               type="text" 
               autoFocus
               value={value} 
               onChange={e => setValue(e.target.value.replace(/[^0-9,.-]/g, ''))} 
               placeholder="0,00"
               className={`w-full text-center text-5xl font-black bg-transparent border-none focus:ring-0 ${getTargetColor()}`}
             />
          </div>

          <div>
             <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 ml-1">Motivo do Ajuste (Opcional)</label>
             <input 
               type="text" 
               value={reason}
               onChange={e => setReason(e.target.value)}
               placeholder="Ex: Correção manual, Brinde, etc."
               className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-bold outline-none focus:border-zinc-400 transition-all"
             />
          </div>

          <button 
            type="submit" 
            className="w-full bg-zinc-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
          >
            Confirmar Ajuste
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdjustmentModal;
