
import React, { useState } from 'react';
import { Sale } from '../types';
import { parsePastedData } from '../utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sales: Sale[]) => void;
  defaultRepId: string;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, defaultRepId }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleProcess = () => {
    if (!defaultRepId) {
      alert('Você precisa ter pelo menos uma vendedora cadastrada para importar vendas.');
      return;
    }
    const sales = parsePastedData(text, defaultRepId);
    if (sales.length === 0) {
      alert('Não encontramos vendas no texto colado.');
      return;
    }
    onImport(sales);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-xl">
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-10 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter">Importar Vendas</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2 italic">Processamento de texto em lote</p>
          </div>
          <button onClick={onClose} className="p-3 text-zinc-400 hover:text-rose-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-10 space-y-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: Maria, Brincos, 150.00..."
            className="w-full h-64 p-8 bg-zinc-50 border-2 border-zinc-100 rounded-[32px] font-mono text-sm outline-none focus:border-emerald-500 transition-all resize-none shadow-inner"
          />
          <button
            onClick={handleProcess}
            disabled={!text.trim()}
            className="w-full bg-emerald-500 text-zinc-900 font-black py-6 rounded-[24px] shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
          >
            Vincular e Salvar no Sistema
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
