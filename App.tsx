
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movement, Representative, Product, Category, MaletaSummary, MovementType, AdjustmentTarget } from './types.ts';
import { calculateMaletaSummaries, formatCurrency, formatDate, generateId, parsePastedProducts, exportFullData } from './utils.ts';
import StatsCard from './components/StatsCard.tsx';
import MovementModal from './components/MovementModal.tsx';
import RepresentativeModal from './components/RepresentativeModal.tsx';
import ProductModal from './components/ProductModal.tsx';
import MaletaMountModal from './components/MaletaMountModal.tsx';
import OCRModal from './components/OCRModal.tsx';
import FinancialDashboard from './components/FinancialDashboard.tsx';

type Tab = 'dashboard' | 'financeiro' | 'maletas' | 'produtos' | 'movimentacoes';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [productSearch, setProductSearch] = useState('');
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [reps, setReps] = useState<Representative[]>(() => {
    const saved = localStorage.getItem('hub_v5_reps');
    return saved ? JSON.parse(saved) : [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('hub_v5_prods');
    return saved ? JSON.parse(saved) : [];
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
  
  const [editingMov, setEditingMov] = useState<Movement | null>(null);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [selectedRepId, setSelectedRepId] = useState<string | undefined>(undefined);
  const [movType, setMovType] = useState<MovementType>('Vendido');

  const summaries = useMemo(() => calculateMaletaSummaries(movements, reps), [movements, reps]);
  
  const stats = useMemo(() => {
    const totalSold = summaries.reduce((acc, s) => acc + s.soldValue, 0);
    const totalCom = summaries.reduce((acc, s) => acc + s.commissionValue, 0);
    const profit = totalSold - totalCom;
    const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
    const lowStock = products.filter(p => p.stock <= 5).length;
    
    return { totalSold, totalCom, profit, totalItems, lowStock };
  }, [summaries, products]);

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.reps && data.prods && data.movs) {
          setReps(data.reps);
          setProducts(data.prods);
          setMovements(data.movs);
          alert("Dados restaurados com sucesso!");
        }
      } catch (err) { alert("Erro ao ler o arquivo."); }
    };
    reader.readAsText(file);
  };

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

  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-100 sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-zinc-900 p-2.5 rounded-2xl text-white shadow-xl rotate-3">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17z"/></svg>
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter leading-none text-zinc-900">HUB</h1>
              <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1 italic">Soberana Gestão</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button onClick={exportFullData} className="p-3 bg-zinc-100 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></button>
             <button onClick={() => setIsOCRModalOpen(true)} className="bg-emerald-500 text-zinc-900 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 active:scale-95 transition-all">Setup IA</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* CENTRAL DE COMANDO SOBERANA */}
            <section className="bg-white border-2 border-zinc-100 p-8 md:p-10 rounded-[48px] shadow-sm">
               <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">Controle 360º</h2>
                  <div className="flex gap-2">
                     {stats.lowStock > 0 && (
                        <span className="bg-rose-100 text-rose-600 px-4 py-2 rounded-full text-[9px] font-black uppercase animate-pulse">
                           {stats.lowStock} itens acabando
                        </span>
                     )}
                  </div>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickActionBtn onClick={() => { setMovType('Vendido'); setIsMovOpen(true); }} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /></svg>} label="Venda" color="bg-zinc-900 text-white" />
                  <QuickActionBtn onClick={() => { setEditingProd(null); setIsProdOpen(true); }} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>} label="Produto" color="bg-emerald-50 text-emerald-600" />
                  <QuickActionBtn onClick={() => { setEditingRep(null); setIsRepOpen(true); }} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} label="Equipe" color="bg-amber-50 text-amber-600" />
                  <QuickActionBtn onClick={() => { setSelectedRepId(undefined); setIsMountOpen(true); }} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6" /></svg>} label="Maleta" color="bg-blue-50 text-blue-600" />
               </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard label="Vendido (Mês)" value={formatCurrency(stats.totalSold)} colorClass="text-zinc-900" />
              <StatsCard label="Lucro Real" value={formatCurrency(stats.profit)} colorClass="text-emerald-600" />
              <div className="bg-white p-6 rounded-[32px] border border-zinc-100 flex flex-col justify-center">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Itens Ativos</p>
                <h3 className="text-3xl font-black text-zinc-900 tracking-tighter">{stats.totalItems} un.</h3>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financeiro' && <FinancialDashboard movements={movements} products={products} summaries={summaries} />}

        {activeTab === 'maletas' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-3xl font-black text-zinc-900 italic uppercase">Equipe</h2>
                <button onClick={() => { setEditingRep(null); setIsRepOpen(true); }} className="bg-zinc-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Cadastrar Vendedora</button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                 {summaries.map(s => (
                    <div key={s.repId} className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm flex flex-col lg:flex-row gap-8 hover:shadow-lg transition-all">
                       <div className="lg:w-1/3">
                          <h3 className="text-2xl font-black text-zinc-900 uppercase italic leading-none mb-4">{s.repName}</h3>
                          <div className="flex gap-2">
                             <button onClick={() => { setSelectedRepId(s.repId); setMovType('Reposição'); setIsMovOpen(true); }} className="flex-1 bg-emerald-500 text-zinc-900 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">+ Reposição</button>
                             <button onClick={() => { setSelectedRepId(s.repId); setIsMountOpen(true); }} className="p-4 bg-zinc-100 rounded-2xl hover:bg-zinc-900 hover:text-white transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5" /></svg></button>
                          </div>
                       </div>
                       <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <SummaryItem label="Em Aberto" value={formatCurrency(s.totalDelivered)} />
                          <SummaryItem label="Vendido" value={formatCurrency(s.soldValue)} highlight />
                          <SummaryItem label="Comissão" value={formatCurrency(s.commissionValue)} color="text-rose-500" />
                          <SummaryItem label="Status" value={s.status} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'produtos' && (
           <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-3xl font-black text-zinc-900 italic uppercase">Catálogo</h2>
                <button onClick={() => { setEditingProd(null); setIsProdOpen(true); }} className="bg-zinc-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Novo Item</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {products.map(p => (
                   <div key={p.id} className="bg-white p-6 rounded-[32px] border border-zinc-100 hover:border-zinc-900 transition-all group">
                      <span className="text-[9px] font-black bg-zinc-100 px-3 py-1.5 rounded-full uppercase italic text-zinc-400">{p.category}</span>
                      <h4 className="text-xl font-black text-zinc-900 uppercase italic mt-4">{p.name}</h4>
                      <div className="flex justify-between items-end mt-8">
                         <p className="text-2xl font-black text-zinc-900">{formatCurrency(p.price)}</p>
                         <p className="text-[10px] font-black text-zinc-400">{p.stock} un.</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-zinc-100 px-8 py-6 flex justify-between items-center z-50 rounded-t-[40px] shadow-lg">
        <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3" /></svg>} label="Início" />
        <NavBtn active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" /></svg>} label="Financeiro" />
        <NavBtn active={activeTab === 'maletas'} onClick={() => setActiveTab('maletas')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} label="Vendedoras" />
        <NavBtn active={activeTab === 'produtos'} onClick={() => setActiveTab('produtos')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4" /></svg>} label="Catálogo" />
        <NavBtn active={activeTab === 'movimentacoes'} onClick={() => setActiveTab('movimentacoes')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>} label="Log" />
      </nav>

      <MovementModal isOpen={isMovOpen} onClose={() => { setIsMovOpen(false); setEditingMov(null); setMovType('Vendido'); }} editingMovement={editingMov} reps={reps} products={products} initialType={movType} initialRepId={selectedRepId} onSave={m => setMovements(prev => [m, ...prev])} />
      <ProductModal isOpen={isProdOpen} onClose={() => { setIsProdOpen(false); setEditingProd(null); }} editingProduct={editingProd} onSave={p => setProducts(prev => { const e = prev.find(x => x.id === p.id); return e ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]; })} />
      <RepresentativeModal isOpen={isRepOpen} onClose={() => { setIsRepOpen(false); setEditingRep(null); }} editingRep={editingRep} onSave={r => setReps(prev => { const e = prev.find(x => x.id === r.id); return e ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev]; })} />
      <MaletaMountModal isOpen={isMountOpen} onClose={() => setIsMountOpen(false)} reps={reps} products={products} initialRepId={selectedRepId} onSave={handleMountSave} />
      <OCRModal isOpen={isOCRModalOpen} onClose={() => setIsOCRModalOpen(false)} onImport={p => setProducts(prev => [...p, ...prev])} />
    </div>
  );
};

const QuickActionBtn: React.FC<{onClick: () => void, icon: React.ReactNode, label: string, color: string}> = ({ onClick, icon, label, color }) => (
   <button onClick={onClick} className={`${color} p-6 rounded-[28px] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-sm`}>
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
   </button>
);

const SummaryItem: React.FC<{label: string, value: string, highlight?: boolean, color?: string}> = ({ label, value, highlight, color }) => (
   <div className={`p-5 rounded-3xl border border-zinc-50 ${highlight ? 'bg-zinc-50 border-emerald-100' : ''}`}>
      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-base font-black tracking-tight ${color || 'text-zinc-900'}`}>{value}</p>
   </div>
);

const NavBtn: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-zinc-900 scale-110' : 'text-zinc-400 opacity-60'}`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-1">{label}</span>
  </button>
);

export default App;
