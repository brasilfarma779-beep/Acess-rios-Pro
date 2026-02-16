
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">Importação em Lote</h2>
            <p className="text-sm text-zinc-500">Cole aqui os dados da sua planilha antiga</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: Maria, Brincos, 150.00..."
            className="w-full h-64 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-mono text-sm resize-none"
          />
          <button
            onClick={handleProcess}
            disabled={!text.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg transition-all"
          >
            Processar e Vincular à Vendedora Principal
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
