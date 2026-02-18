
// @google/genai guidelines followed: Using GoogleGenAI with named parameters and direct API_KEY access.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movement, Representative, Product, Category, MaletaSummary, MovementType } from './types.ts';
import { calculateMaletaSummaries, formatCurrency, generateId, parsePastedProducts, exportFullData } from './utils.ts';
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

  // Auto-Save para segurança total
  useEffect(() => localStorage.setItem('hub_v5_reps', JSON.stringify(reps)), [reps]);
  useEffect(() => localStorage.setItem('hub_v5_prods', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('hub_v5_movs', JSON.stringify(movements)), [movements]);

  // Modais
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [isMountOpen, setIsMountOpen] = useState(false);
  const [isRepOpen, setIsRepOpen] = useState(false);
  const [isProdOpen, setIsProdOpen] = useState(false);
  
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [editingMov, setEditingMov] = useState<Movement | null>(null);
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
          alert("Backup restaurado!");
        }
      } catch (err) { alert("Erro ao ler arquivo."); }
    };
    reader.readAsText(file);
  };

  const handleBatchImport = () => {
    const newItems = parsePastedProducts(pasteText);
    if (newItems.length === 0) return alert('Nenhum dado encontrado.');
    setProducts(prev => [...newItems, ...prev]);
    setPasteText('');
    setIsPasteModalOpen(false);
    alert(`${newItems.length} novos produtos cadastrados via texto!`);
  };

  const handleMountSave = (newMovements: Movement[]) => {
    setMovements(prev => [...newMovements, ...prev]);
    setProducts(prev => prev.map(p => {
      const usedCount = newMovements.filter(m => m.productId === p.id).reduce((sum, m) => sum + m.quantity, 0);
      return usedCount > 0 ? { ...p, stock: p.stock - usedCount } : p;
    }));
    setIsMountOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-32 font-sans">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-md border border-zinc-100 bg-zinc-50 flex items-center justify-center p-1">
              <img src="logo.png" alt="Logo HUB SOBERANO" className="h-full w-full object-contain" onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="text-xs font-black text-zinc-400">HS</div>';
              }} />
            </div>
            <h1 className="text-xl font-black italic tracking-tighter text-zinc-900 uppercase">HUB SOBERANO</h1>
          </div>
          <div className="flex gap-2">
             <button title="Exportar Backup" onClick={exportFullData} className="p-2.5 bg-zinc-100 text-zinc-500 rounded-lg hover:bg-zinc-200 transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></button>
             <button title="Importar Backup" onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-zinc-100 text-zinc-500 rounded-lg hover:bg-zinc-200 transition-all"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
             <input type="file" ref={fileInputRef} onChange={handleImportBackup} accept=".json" className="hidden" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            
            {/* ESTEIRA DE CADASTRO INTELIGENTE */}
            <section className="bg-zinc-900 p-8 md:p-10 rounded-[48px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-12 opacity-10 text-emerald-500 pointer-events-none rotate-12">
                  <svg className="h-48 w-48" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5 a 1 1 0 0 1 1 1 v 3 h 3 a 1 1 0 1 1 0 2 h -3 v 3 a 1 1 0 1 1 -2 0 v -3 H 6 a 1 1 0 1 1 0 -2 h 3 V 6 a 1 1 0 0 1 1 -1 z" clipRule="evenodd" /></svg>
               </div>
               
               <div className="relative z-10">
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Abastecer Estoque</h2>
                  <p className="text-zinc-400 font-medium mb-10 text-sm">Escolha como quer cadastrar suas novas semijoias:</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                     <QuickEntryBtn 
                        onClick={() => setIsOCRModalOpen(true)}
                        icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        label="Pela Câmera (IA)"
                        sub="Lê etiquetas e tags"
                        color="bg-emerald-500 text-zinc-900"
                     />
                     <QuickEntryBtn 
                        onClick={() => setIsPasteModalOpen(true)}
                        icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        label="Importar Lista"
                        sub="Copia e cola do Zap"
                        color="bg-zinc-800 text-zinc-300"
                     />
                     <QuickEntryBtn 
                        onClick={() => { setEditingProd(null); setIsProdOpen(true); }}
                        icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
                        label="Cadastro Manual"
                        sub="Preencher um a um"
                        color="bg-zinc-800 text-zinc-300"
                     />
                  </div>
               </div>
            </section>

            {/* AÇÕES DE GESTÃO RÁPIDA */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <DashboardActionBtn 
                  onClick={() => { setMovType('Vendido'); setIsMovOpen(true); }} 
                  icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a.75.75 0 00-1.258 0A10.51 10.51 0 012.25 10.5a.75.75 0 000 1.5 10.51 10.51 0 014.327 5.803.75.75 0 001.258 0 10.51 10.51 0 0110.33 0 .75.75 0 001.258 0 10.51 10.51 0 014.327-5.803.75.75 0 000-1.5 10.51 10.51 0 01-4.327-5.803.75.75 0 00-1.258 0 10.51 10.51 0 01-10.33 0z" /></svg>} 
                  label="REGISTRAR TRIUNFO" 
               />
               <DashboardActionBtn 
                  onClick={() => { setSelectedRepId(undefined); setIsMountOpen(true); }} 
                  icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} 
                  label="EXPEDIR TESOURO" 
               />
               <DashboardActionBtn 
                  onClick={() => { setEditingRep(null); setIsRepOpen(true); }} 
                  icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} 
                  label="VINCULAR ELITE" 
               />
               <DashboardActionBtn 
                  onClick={() => setActiveTab('financeiro')} 
                  icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} 
                  label="VISÃO SOBERANA" 
               />
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard label="Vendido (Mês)" value={formatCurrency(stats.totalSold)} colorClass="text-zinc-900" />
              <StatsCard label="Lucro Real" value={formatCurrency(stats.profit)} colorClass="text-emerald-600" />
              <div className="bg-white p-8 rounded-[40px] border border-zinc-100 flex flex-col justify-center shadow-sm">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Itens no Estoque</p>
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
                <button onClick={() => { setEditingRep(null); setIsRepOpen(true); }} className="bg-zinc-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">CONVOCAR TALENTO</button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                 {summaries.map(s => (
                    <div key={s.repId} className="bg-white p-8 rounded-[48px] border border-zinc-100 shadow-sm flex flex-col lg:flex-row gap-8 hover:shadow-lg transition-all">
                       <div className="lg:w-1/3">
                          <h3 className="text-2xl font-black text-zinc-900 uppercase italic leading-none mb-4">{s.repName}</h3>
                          <div className="flex gap-2">
                             <button onClick={() => { setSelectedRepId(s.repId); setMovType('Reposição'); setIsMovOpen(true); }} className="flex-1 bg-emerald-500 text-zinc-900 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">+ Reposição</button>
                          </div>
                       </div>
                       <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <SummaryItem label="Patrimônio" value={formatCurrency(s.totalDelivered)} />
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
                <h2 className="text-3xl font-black text-zinc-900 italic uppercase">Acervo</h2>
                <div className="flex gap-2">
                   <button onClick={() => setIsPasteModalOpen(true)} className="bg-zinc-100 text-zinc-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">Colar Lote</button>
                   <button onClick={() => { setEditingProd(null); setIsProdOpen(true); }} className="bg-zinc-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Novo Item</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {products.map(p => (
                   <div key={p.id} onClick={() => { setEditingProd(p); setIsProdOpen(true); }} className="bg-white p-8 rounded-[40px] border border-zinc-100 hover:border-zinc-900 transition-all group cursor-pointer shadow-sm">
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
        <NavBtn 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>} 
          label="MEU HUB" 
        />
        <NavBtn 
          active={activeTab === 'financeiro'} 
          onClick={() => setActiveTab('financeiro')} 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
          label="COFRE REAL" 
        />
        <NavBtn 
          active={activeTab === 'maletas'} 
          onClick={() => setActiveTab('maletas')} 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745V20a2 2 0 002 2h14a2 2 0 002-2v-6.745zM3.136 11.562L12 13l8.864-1.438A23.913 23.913 0 0012 10a23.914 23.914 0 00-8.864 1.562zM12 2l4 4V2H8v4l4-4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 13a2 2 0 100-4 2 2 0 000 4z" /></svg>} 
          label="EQUIPE DE ELITE" 
        />
        <NavBtn 
          active={activeTab === 'produtos'} 
          onClick={() => setActiveTab('produtos')} 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5l6-4 6 4m-12 0l6 14 6-14M6 5l12 0" /></svg>} 
          label="ACERVO SOBERANO" 
        />
        <NavBtn active={activeTab === 'movimentacoes'} onClick={() => setActiveTab('movimentacoes')} icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>} label="Histórico" />
      </nav>

      {/* MODAIS */}
      <MovementModal isOpen={isMovOpen} onClose={() => { setIsMovOpen(false); setEditingMov(null); setMovType('Vendido'); }} editingMovement={editingMov} reps={reps} products={products} initialType={movType} initialRepId={selectedRepId} onSave={m => setMovements(prev => { const e = prev.find(x => x.id === m.id); return e ? prev.map(x => x.id === m.id ? m : x) : [m, ...prev]; })} />
      <ProductModal isOpen={isProdOpen} onClose={() => { setIsProdOpen(false); setEditingProd(null); }} editingProduct={editingProd} onSave={p => setProducts(prev => { const e = prev.find(x => x.id === p.id); return e ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]; })} />
      <RepresentativeModal isOpen={isRepOpen} onClose={() => { setIsRepOpen(false); setEditingRep(null); }} editingRep={editingRep} onSave={r => setReps(prev => { const e = prev.find(x => x.id === r.id); return e ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev]; })} />
      <MaletaMountModal isOpen={isMountOpen} onClose={() => setIsMountOpen(false)} reps={reps} products={products} initialRepId={selectedRepId} onSave={handleMountSave} />
      <OCRModal isOpen={isOCRModalOpen} onClose={() => setIsOCRModalOpen(false)} onImport={p => setProducts(prev => [...p, ...prev])} />
      
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-xl">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter">Importar do WhatsApp</h2>
              <button onClick={() => setIsPasteModalOpen(false)} className="p-3 text-zinc-400 hover:text-rose-500 transition-colors"><svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-10">
              <textarea autoFocus value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Cole o texto aqui. Ex:&#10;Brinco Argola R$ 45,00&#10;Colar Ouro R$ 120,00" className="w-full h-64 p-8 bg-zinc-50 border-2 border-zinc-100 rounded-[32px] font-mono text-sm outline-none focus:border-emerald-500 transition-all resize-none shadow-inner" />
              <button onClick={handleBatchImport} className="w-full py-6 mt-8 rounded-[24px] bg-emerald-500 text-zinc-900 font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Processar e Salvar Tudo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QuickEntryBtn: React.FC<{onClick: () => void, icon: React.ReactNode, label: string, sub: string, color: string}> = ({ onClick, icon, label, sub, color }) => (
   <button onClick={onClick} className={`${color} p-6 rounded-[32px] text-left flex flex-col justify-between h-40 shadow-xl hover:scale-105 active:scale-95 transition-all group`}>
      <div className="bg-white/20 p-2.5 rounded-xl w-fit">{icon}</div>
      <div>
         <p className="font-black uppercase tracking-tighter text-lg leading-none italic">{label}</p>
         <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60">{sub}</p>
      </div>
   </button>
);

const DashboardActionBtn: React.FC<{onClick: () => void, icon: React.ReactNode, label: string}> = ({ onClick, icon, label }) => (
   <button onClick={onClick} className="bg-white p-5 rounded-[28px] flex flex-col items-center justify-center gap-2 border border-zinc-100 shadow-sm hover:shadow-lg transition-all active:scale-95">
      <div className="text-zinc-900">{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
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
