
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Representative, Movement } from '../types';
import { generateId, formatCurrency } from '../utils';

interface MaletaMountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (movements: Movement[]) => void;
  reps: Representative[];
  products: Product[];
  initialRepId?: string;
}

const MaletaMountModal: React.FC<MaletaMountModalProps> = ({ isOpen, onClose, onSave, reps, products, initialRepId }) => {
  const [repId, setRepId] = useState('');
  const [items, setItems] = useState<{ [prodId: string]: number }>({});
  const [search, setSearch] = useState('');
  const [bulkQty, setBulkQty] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRepId(initialRepId || (reps.length > 0 ? reps[0].id : ''));
      setItems({});
      setSearch('');
      setBulkQty('');
    }
  }, [isOpen, initialRepId, reps]);

  const filteredProducts = useMemo(() => {
    const s = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(s) || 
      (p.code && p.code.toLowerCase().includes(s))
    );
  }, [products, search]);

  if (!isOpen) return null;

  const handleQtyChange = (prodId: string, val: string) => {
    const qty = parseInt(val) || 0;
    setItems(prev => ({ ...prev, [prodId]: qty }));
  };

  const handleApplyBulk = () => {
    const qty = parseInt(bulkQty) || 0;
    const newItems = { ...items };
    filteredProducts.forEach(p => {
      newItems[p.id] = qty;
    });
    setItems(newItems);
  };

  const handleClearAll = () => {
    if (confirm('Deseja zerar todas as quantidades selecionadas?')) {
      setItems({});
    }
  };

  const totalValue = Object.entries(items).reduce((acc, [id, qty]) => {
    const p = products.find(x => x.id === id);
    return acc + (p ? p.price * (qty as number) : 0);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repId) return alert('Selecione uma vendedora.');
    
    const movements: Movement[] = Object.entries(items)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([id, qty]) => ({
        id: generateId(),
        date: new Date().toISOString(),
        representativeId: repId,
        productId: id,
        type: 'Entregue',
        quantity: qty as number,
        value: products.find(p => p.id === id)?.price || 0
      }));

    if (movements.length === 0) return alert('Selecione pelo menos um item.');
    onSave(movements);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/90 backdrop-blur-md">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">Montador de Maleta</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2">Reposição e Entrega em Lote</p>
          </div>
          <button onClick={onClose} className="p-4 text-zinc-400 hover:text-rose-500 transition-colors"><svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
           <div className="w-full md:w-80 p-8 border-r border-zinc-100 bg-zinc-50/50 space-y-6">
              <div>
                 <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Vendedora</label>
                 <select value={repId} onChange={e => setRepId(e.target.value)} className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl font-black text-sm outline-none focus:border-zinc-900">
                    {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                 </select>
              </div>
              <div className="p-6 bg-zinc-900 rounded-[32px] text-white">
                 <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1 italic">Patrimônio Maleta</p>
                 <h4 className="text-3xl font-black text-emerald-400 tracking-tighter">{formatCurrency(totalValue)}</h4>
                 <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                    <div>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Peças</p>
                        {/* Fix: Explicitly typing the accumulator to 'number' to avoid 'unknown' type errors in the reduce function */}
                        <p className="text-sm font-black text-white">{Object.values(items).reduce((a: number, b) => a + (b as number), 0)} un.</p>
                    </div>
                    <button onClick={handleClearAll} className="text-[10px] text-rose-400 font-black uppercase tracking-widest hover:text-rose-300">Zerar</button>
                 </div>
              </div>
              <button onClick={handleSubmit} className="w-full bg-emerald-500 text-zinc-900 font-black py-5 rounded-[24px] text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Concluir Montagem</button>
           </div>

           <div className="flex-1 flex flex-col p-8 bg-white">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={search} 
                      onChange={e => setSearch(e.target.value)} 
                      placeholder="Pesquisar por Código ou Nome..." 
                      className="w-full p-4 bg-zinc-100 border-none rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-zinc-900 pl-12" 
                    />
                    <svg className="h-5 w-5 absolute left-4 top-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={bulkQty} 
                      onChange={e => setBulkQty(e.target.value)} 
                      placeholder="Qtd" 
                      className="w-16 p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-center text-sm outline-none" 
                    />
                    <button 
                      type="button"
                      onClick={handleApplyBulk}
                      disabled={!bulkQty}
                      className="bg-emerald-600 text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      Repor Tudo
                    </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                 {filteredProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-white border-2 border-zinc-50 rounded-2xl hover:border-zinc-200 transition-all group">
                       <div className="flex-1">
                          <p className="font-black text-zinc-800 uppercase italic text-sm group-hover:text-emerald-600 transition-colors">{p.name}</p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{p.code || 'S/C'} • {formatCurrency(p.price)}</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <p className="text-[9px] text-zinc-400 font-black uppercase text-right">Central: {p.stock}</p>
                          <input 
                            type="number" 
                            min="0" 
                            value={items[p.id] || ''} 
                            onChange={e => handleQtyChange(p.id, e.target.value)} 
                            className="w-20 p-3 bg-zinc-50 border-2 border-zinc-100 rounded-xl font-black text-center text-sm outline-none focus:border-zinc-900 group-hover:bg-white" 
                            placeholder="0"
                          />
                       </div>
                    </div>
                 ))}
                 {filteredProducts.length === 0 && (
                   <div className="py-20 text-center">
                     <p className="text-zinc-400 font-black uppercase tracking-widest text-xs italic">Nenhum item encontrado no catálogo</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MaletaMountModal;
