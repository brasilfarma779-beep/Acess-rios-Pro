
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Representative, Product, Category, MaletaSummary, MovementType, AdjustmentTarget } from './types.ts';
import { calculateMaletaSummaries, formatCurrency, formatDate, generateId, parsePastedProducts, calculateCommissionRate } from './utils.ts';
import StatsCard from './components/StatsCard.tsx';
import MovementModal from './components/MovementModal.tsx';
import RepresentativeModal from './components/RepresentativeModal.tsx';
import ProductModal from './components/ProductModal.tsx';
import AdjustmentModal from './components/AdjustmentModal.tsx';
import MaletaMountModal from './components/MaletaMountModal.tsx';
import OCRModal from './components/OCRModal.tsx';

type Tab = 'dashboard' | 'financeiro' | 'maletas' | 'produtos' | 'movimentacoes';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [productSearch, setProductSearch] = useState('');
  const [repSearch, setRepSearch] = useState('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  
  const [reps, setReps] = useState<Representative[]>(() => {
    const saved = localStorage.getItem('hub_v5_reps');
    return saved ? JSON.parse(saved) : [{
      id: 'rep-1', name: 'Andressa Souza', phone: '(11) 99999-9999', city: 'São Paulo', startDate: '2026-02-15', endDate: '2026-04-15', active: true, status: 'Em Campo'
    }];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('hub_v5_prods');
    return saved ? JSON.parse(saved) : [
      { id: 'p1', name: 'Kit Maleta Premium', code: 'KIT-P', category: Category.CONJUNTOS, price: 4200, stock: 50 },
      { id: 'p2', name: 'Brinco Argola Cravejada', code: 'BR-01', category: Category.BRINCOS, price: 120, stock: 100 }
    ];
  });

  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('hub_v5_movs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => localStorage.setItem('hub_v5_reps', JSON.stringify(reps)), [reps]);
  useEffect(() => localStorage.setItem('hub_v5_prods', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('hub_v5_movs', JSON.stringify(movements)), [movements]);

  // Modais
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [isMountOpen, setIsMountOpen] = useState(false);
  const [isRepOpen, setIsRepOpen] = useState(false);
  const [isProdOpen, setIsProdOpen] = useState(false);
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  
  const [editingMov, setEditingMov] = useState<Movement | null>(null);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | undefined>(undefined);
  const [movType, setMovType] = useState<MovementType>('Vendido');
  const [adjTarget, setAdjTarget] = useState<AdjustmentTarget>('sold');

  const summaries = useMemo(() => calculateMaletaSummaries(movements, reps), [movements, reps]);
  
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => s.repName.toLowerCase().includes(repSearch.toLowerCase()));
  }, [summaries, repSearch]);

  const filteredProducts = useMemo(() => {
    const s = productSearch.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(s) || 
      (p.code && p.code.toLowerCase().includes(s))
    );
  }, [products, productSearch]);

  const stats = useMemo(() => {
    const totalSold = summaries.reduce((acc, s) => acc + s.soldValue, 0);
    const totalCom = summaries.reduce((acc, s) => acc + s.commissionValue, 0);
    const profit = totalSold - totalCom;
    
    return { totalSold, totalCom, profit };
  }, [summaries]);

  const handleBatchImport = () => {
    const newItems = parsePastedProducts(pasteText);
    if (newItems.length === 0) return alert('Nenhum dado válido encontrado.');
    setProducts(prev => [...prev, ...newItems]);
    setPasteText('');
    setIsPasteModalOpen(false);
  };

  const handleMountSave = (newMovements: Movement[]) => {
    setMovements(prev => [...newMovements, ...prev]);
    setProducts(prev => prev.map(p => {
      const usedCount = newMovements
        .filter(m => m.productId === p.id)
        .reduce((sum, m) => sum + m.quantity, 0);
      return usedCount > 0 ? { ...p, stock: p.stock - usedCount } : p;
    }));
    setIsMountOpen(false);
  };

  const handleMassStockUpdate = () => {
    const q = prompt('Definir nova quantidade de estoque para TODOS os itens do catálogo:');
    if (q !== null) {
      const newQty = parseInt(q);
      if (isNaN(newQty)) return alert('Por favor, insira um número válido.');
      setProducts(prev => prev.map(p => ({ ...p, stock: newQty })));
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto do catálogo definitivamente?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      setIsProdOpen(false);
    }
  };

  const handleQuickRefill = (repId: string) => {
    setSelectedRepId(repId);
    setMovType('Reposição');
    setIsMovOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-100 sticky top-0 z-40 px-6 py-5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-zinc-900 p-2.5 rounded-2xl text-white shadow-xl rotate-3">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276l-4 2a1 1 0 000 1.788l4 2A1 1 0 0016.658 11.236l4-2a1 1 0 000-1.788l-4-2a1 1 0 00-1.447 0zM7 10a1 1 0 011-1h1a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter leading-none text-zinc-900">HUB</h1>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.3em] mt-1 italic">Soberana Gestão</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setIsOCRModalOpen(true)} className="bg-emerald-500 text-zinc-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all">Digitalizar Catálogo</button>
             <button onClick={() => { setSelectedRepId(undefined); setIsMountOpen(true); }} className="bg-zinc-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Montar Maleta</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard label="Vendido (Mês)" value={formatCurrency(stats.totalSold)} colorClass="text-zinc-900" />
              <StatsCard label="Comissões Pagas" value={formatCurrency(stats.totalCom)} colorClass="text-rose-500" />
              <div className="bg-white p-6 rounded-[32px] border-2 border-emerald-500 shadow-xl shadow-emerald-500/5">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Lucro Líquido (Real)</p>
                <h3 className="text-3xl font-black text-zinc-900 tracking-tighter">{formatCurrency(stats.profit)}</h3>
              </div>
            </div>

            <section className="bg-white p-8 md:p-12 rounded-[48px] border border-zinc-100 shadow-sm relative overflow-hidden">
               <div className="flex flex-col md:flex-row gap-10 items-center">
                  <div className="flex-1 space-y-6">
                     <div>
                        <h2 className="text-4xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">Setup sem dor de cabeça.</h2>
                        <p className="text-zinc-500 mt-4 font-medium">Use nossa inteligência artificial para digitalizar seu estoque de uma vez ou cole sua lista de pedidos aqui.</p>
                     </div>
                     <div className="flex flex-wrap gap-4">
                        <button onClick={() => setIsOCRModalOpen(true)} className="bg-zinc-900 text-white px-8 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                           <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           Tirar Foto do Catálogo
                        </button>
                        <button onClick={() => setIsPasteModalOpen(true)} className="bg-zinc-100 text-zinc-600 px-8 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-zinc-200 transition-all">
                           Colar Lista em Texto
                        </button>
                     </div>
                  </div>
                  <div className="hidden lg:block w-64 h-64 bg-zinc-50 rounded-[48px] border-4 border-dashed border-zinc-100 flex items-center justify-center">
                     <svg className="h-24 w-24 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
               </div>
            </section>
          </div>
        )}

        {activeTab === 'maletas' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 gap-6">
                <div>
                   <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter">Equipe & Maletas</h2>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Gestão de Vendedoras</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                   <input 
                     type="text" 
                     value={repSearch} 
                     onChange={e => setRepSearch(e.target.value)} 
                     placeholder="Buscar vendedora..." 
                     className="flex-1 md:w-64 p-3 bg-white border-2 border-zinc-100 rounded-2xl text-xs font-black outline-none focus:border-zinc-900 transition-all shadow-sm"
                   />
                   <button onClick={() => { setEditingRep(null); setIsRepOpen(true); }} className="bg-zinc-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl">Nova Vendedora</button>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-6">
                {filteredSummaries.map(s => {
                  const rep = reps.find(r => r.id === s.repId);
                  return (
                    <div key={s.repId} className="bg-white p-8 rounded-[48px] border border-zinc-100 shadow-sm flex flex-col lg:flex-row gap-8 hover:shadow-xl transition-all group relative">
                       {/* Botão de Reposição Rápida */}
                       <button 
                         onClick={() => handleQuickRefill(s.repId)}
                         className="absolute -top-3 -right-3 w-14 h-14 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform active:scale-90 z-10"
                         title="Reposição Rápida"
                       >
                         <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                       </button>

                       <div className="lg:w-1/3 space-y-4">
                          <div className="flex justify-between items-start">
                             <h3 className="text-2xl font-black text-zinc-900 uppercase italic leading-none">{s.repName}</h3>
                             <button onClick={() => { setEditingRep(rep || null); setIsRepOpen(true); }} className="p-2 bg-zinc-100 rounded-xl hover:bg-zinc-900 hover:text-white transition-all"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                          </div>
                          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                             <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic mb-1">Status</p>
                             <p className="text-xs font-black text-zinc-900">{s.status}</p>
                          </div>
                          <button onClick={() => { setSelectedRepId(s.repId); setIsMountOpen(true); }} className="w-full bg-emerald-500 text-zinc-900 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all">Montagem em Lote</button>
                       </div>

                       <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                             <p className="text-[10px] font-black text-zinc-400 uppercase italic mb-2">Vendido</p>
                             <p className="text-2xl font-black text-zinc-900 tracking-tighter">{formatCurrency(s.soldValue)}</p>
                          </div>
                          <div className={`p-6 rounded-3xl border border-zinc-100 ${s.commissionRate >= 50 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                             <p className={`text-[10px] font-black uppercase italic mb-2 ${s.commissionRate >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>Comissão ({s.commissionRate}%)</p>
                             <p className={`text-2xl font-black tracking-tighter ${s.commissionRate >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>{formatCurrency(s.commissionValue)}</p>
                          </div>
                          <div className="col-span-full bg-zinc-900 p-8 rounded-[32px] shadow-xl border-b-4 border-emerald-500">
                             <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 italic">Líquido Dona</p>
                             <h4 className="text-4xl font-black text-emerald-400 tracking-tighter">{formatCurrency(s.ownerValue)}</h4>
                          </div>
                       </div>
                    </div>
                  )
                })}
             </div>
          </div>
        )}

        {activeTab === 'produtos' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
                <div>
                  <h2 className="text-3xl font-black text-zinc-900 italic uppercase leading-none tracking-tighter">Estoque Central</h2>
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleMassStockUpdate} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100">Definir Qtd</button>
                    <button onClick={() => { if(confirm('Zerar TODOS os itens?')) setProducts(prev => prev.map(p => ({ ...p, stock: 0 }))); }} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100">Zerar Tudo</button>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                     <input 
                       type="text" 
                       value={productSearch} 
                       onChange={e => setProductSearch(e.target.value)} 
                       placeholder="Buscar no catálogo..." 
                       className="w-full p-3 pl-10 bg-white border-2 border-zinc-100 rounded-2xl text-xs font-black outline-none focus:border-zinc-900 transition-all shadow-sm"
                     />
                     <svg className="h-4 w-4 absolute left-3.5 top-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   </div>
                   <button onClick={() => { setEditingProd(null); setIsProdOpen(true); }} className="bg-zinc-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl whitespace-nowrap">Novo Item</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(p => (
                  <div key={p.id} className={`bg-white p-8 rounded-[40px] border-2 transition-all group relative overflow-hidden ${p.stock <= 5 ? 'border-rose-100 bg-rose-50/20' : 'border-zinc-100 hover:border-zinc-900'}`}>
                    <div className="mb-4">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-black bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full uppercase italic tracking-widest">{p.category}</span>
                        {p.stock <= 5 && <span className="text-[7px] font-black text-rose-600 uppercase animate-pulse">Estoque Baixo!</span>}
                      </div>
                      <h4 className="text-lg font-black text-zinc-900 uppercase italic mt-2 tracking-tighter leading-tight">{p.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-widest">{p.code || 'S/C'}</p>
                    </div>
                    
                    <div className="flex justify-between items-end pb-6 border-b border-zinc-50">
                      <p className="text-xl font-black text-zinc-900">{formatCurrency(p.price)}</p>
                      <div className="text-right">
                        <p className="text-[8px] text-zinc-400 font-black uppercase mb-1">Qtd Atual</p>
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase ${p.stock <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-600'}`}>
                          {p.stock} un.
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-6">
                       <button 
                         onClick={() => { setEditingProd(p); setIsProdOpen(true); }}
                         className="flex-1 bg-zinc-900 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-zinc-200"
                       >
                         Editar
                       </button>
                       <button 
                         onClick={() => handleDeleteProduct(p.id)}
                         className="px-4 bg-rose-50 text-rose-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-100"
                       >
                         Excluir
                       </button>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'movimentacoes' && (
           <div className="space-y-6 animate-in fade-in duration-500">
              <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter">Histórico Total</h2>
              <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-zinc-50">
                       <tr className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          <th className="p-6">Data</th>
                          <th className="p-6">Tipo</th>
                          <th className="p-6">Vendedora</th>
                          <th className="p-6">Valor</th>
                          <th className="p-6 text-right">Ação</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                       {movements.map(m => (
                         <tr key={m.id} className="hover:bg-zinc-50 transition-all">
                            <td className="p-6 font-black text-zinc-900 text-xs">{formatDate(m.date)}</td>
                            <td className="p-6 italic font-bold text-xs"><span className="px-2 py-1 bg-zinc-100 rounded-full text-[9px] uppercase">{m.type}</span></td>
                            <td className="p-6 text-xs font-bold text-zinc-500">{reps.find(r => r.id === m.representativeId)?.name || '-'}</td>
                            <td className="p-6 font-black text-emerald-600">{formatCurrency(m.value * m.quantity)}</td>
                            <td className="p-6 text-right">
                                <button onClick={() => { setEditingMov(m); setIsMovOpen(true); }} className="p-2 bg-zinc-100 rounded-lg hover:bg-zinc-900 hover:text-white transition-all"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-zinc-100 px-8 py-6 flex justify-between items-center z-50 rounded-t-[40px] shadow-lg">
        <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} label="Início" />
        <NavBtn active={activeTab === 'maletas'} onClick={() => setActiveTab('maletas')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} label="Maletas" />
        <NavBtn active={activeTab === 'produtos'} onClick={() => setActiveTab('produtos')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} label="Catálogo" />
        <NavBtn active={activeTab === 'movimentacoes'} onClick={() => setActiveTab('movimentacoes')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Histórico" />
      </nav>

      <MovementModal isOpen={isMovOpen} onClose={() => { setIsMovOpen(false); setEditingMov(null); setMovType('Vendido'); }} editingMovement={editingMov} reps={reps} products={products} initialType={movType} initialRepId={selectedRepId} onSave={m => { setMovements(prev => [m, ...prev]); setEditingMov(null); }} />
      <ProductModal isOpen={isProdOpen} onClose={() => { setIsProdOpen(false); setEditingProd(null); }} editingProduct={editingProd} onSave={p => setProducts(prev => { const e = prev.find(x => x.id === p.id); return e ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]; })} onDelete={handleDeleteProduct} />
      <RepresentativeModal isOpen={isRepOpen} onClose={() => { setIsRepOpen(false); setEditingRep(null); }} editingRep={editingRep} onSave={r => setReps(prev => { const e = prev.find(x => x.id === r.id); return e ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev]; })} />
      <AdjustmentModal isOpen={isAdjOpen} onClose={() => setIsAdjOpen(false)} target={adjTarget} repId={selectedRepId || ''} onSave={m => setMovements(prev => [m, ...prev])} />
      <MaletaMountModal isOpen={isMountOpen} onClose={() => setIsMountOpen(false)} reps={reps} products={products} initialRepId={selectedRepId} onSave={handleMountSave} />
      <OCRModal isOpen={isOCRModalOpen} onClose={() => setIsOCRModalOpen(false)} onImport={p => setProducts(prev => [...p, ...prev])} />
      
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-xl">
          <div className="bg-white/95 w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter">Importar Lista</h2>
              <button onClick={() => setIsPasteModalOpen(false)} className="p-3 text-zinc-400 hover:text-rose-500 transition-colors"><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10">
              <textarea autoFocus value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Cole aqui sua lista. Formatos aceitos:&#10;Brinco Ouro 45.00&#10;Colar Veneziana 120,00" className="w-full h-64 p-8 bg-zinc-50 border-2 border-zinc-100 rounded-[32px] font-mono text-sm outline-none focus:border-emerald-500 transition-all resize-none shadow-inner" />
              <button onClick={handleBatchImport} className="w-full py-6 mt-8 rounded-[24px] bg-emerald-500 text-zinc-900 font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Processar e Salvar Itens</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NavBtn: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-zinc-900 scale-110 font-bold' : 'text-zinc-400 opacity-60 hover:opacity-100'}`}>
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-2 italic">{label}</span>
  </button>
);

export default App;
