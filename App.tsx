
// @google/genai guidelines followed: Using GoogleGenAI with named parameters and direct API_KEY access.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movement, Representative, Product, Category, MaletaSummary, MovementType } from './types.ts';
import { calculateMaletaSummaries, formatCurrency, generateId, exportFullData } from './utils.ts';
import StatsCard from './components/StatsCard.tsx';
import MovementModal from './components/MovementModal.tsx';
import RepresentativeModal from './components/RepresentativeModal.tsx';
import ProductModal from './components/ProductModal.tsx';
import OCRModal from './components/OCRModal.tsx';
import ProductScannerModal from './components/ProductScannerModal.tsx';
import AdjustmentModal from './components/AdjustmentModal.tsx';
import SaleModal from './components/SaleModal.tsx';
import BulkSaleOCRModal from './components/BulkSaleOCRModal.tsx';
import { AdjustmentTarget, Sale } from './types.ts';

type Tab = 'dashboard' | 'maletas';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [reps, setReps] = useState<Representative[]>(() => {
    try {
      const saved = localStorage.getItem('hub_v5_reps');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar vendedoras:", e);
      return [];
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('hub_v5_prods');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar produtos:", e);
      return [];
    }
  });

  const [movements, setMovements] = useState<Movement[]>(() => {
    try {
      const saved = localStorage.getItem('hub_v5_movs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Erro ao carregar movimentos:", e);
      return [];
    }
  });

  // Auto-Save com tratamento de erro (QuotaExceededError)
  useEffect(() => {
    try {
      localStorage.setItem('hub_v5_reps', JSON.stringify(reps));
    } catch (e) {
      console.error("Erro ao salvar vendedoras:", e);
    }
  }, [reps]);

  useEffect(() => {
    try {
      localStorage.setItem('hub_v5_prods', JSON.stringify(products));
    } catch (e) {
      console.error("Erro ao salvar produtos:", e);
    }
  }, [products]);

  useEffect(() => {
    try {
      // Removemos imagens pesadas antes de salvar no localStorage para evitar estouro de memória
      const movementsToSave = movements.map(({ image, ...rest }) => rest);
      localStorage.setItem('hub_v5_movs', JSON.stringify(movementsToSave));
    } catch (e) {
      console.error("Erro ao salvar movimentos (Memória cheia):", e);
      alert("Atenção: Memória do navegador cheia. Algumas fotos não foram salvas, mas os dados numéricos estão seguros.");
    }
  }, [movements]);

  // Modais
  const [isMovOpen, setIsMovOpen] = useState(false);
  const [isRepOpen, setIsRepOpen] = useState(false);
  const [isProdOpen, setIsProdOpen] = useState(false);
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isBulkOCROpen, setIsBulkOCROpen] = useState(false);
  const [adjTarget, setAdjTarget] = useState<AdjustmentTarget>('sold');
  const [targetRepId, setTargetRepId] = useState('');
  
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

  return (
    <div className="min-h-screen bg-zinc-50 pb-32 font-sans">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-md border border-zinc-100 bg-zinc-50 flex items-center justify-center p-1">
              <img src="https://i.imgur.com/aXyxkp9.png" alt="Logo HUB SOBERANO" className="h-full w-full object-contain" onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="text-xs font-black text-zinc-400">HS</div>';
              }} />
            </div>
            <h1 className="text-xl font-black italic tracking-tighter text-zinc-900 uppercase">HUB SOBERANO</h1>
          </div>
          <div className="flex gap-2">
             <button title="Limpar Tudo (CUIDADO)" onClick={() => {
               if(window.confirm("ISSO APAGARÁ TODOS OS DADOS. Tem certeza? Faça um backup antes!")) {
                 localStorage.clear();
                 window.location.reload();
               }
             }} className="p-2.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-all">
               <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <QuickEntryBtn 
                        onClick={() => setIsOCRModalOpen(true)}
                        icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        label="Pela Câmera (IA)"
                        sub="Lê etiquetas e tags"
                        color="bg-emerald-500 text-zinc-900"
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
                   onClick={() => setIsSaleOpen(true)} 
                   icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
                   label="VENDA RÁPIDA" 
                />
                <DashboardActionBtn 
                   onClick={() => setIsScannerOpen(true)} 
                   icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>} 
                   label="SCANNER" 
                />
                <DashboardActionBtn 
                   onClick={() => setIsBulkOCROpen(true)} 
                   icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} 
                   label="DIGITALIZAR" 
                />
                <DashboardActionBtn 
                   onClick={() => setActiveTab('maletas')} 
                   icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} 
                   label="VISÃO GERAL" 
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
                          <h3 className="text-2xl font-black text-zinc-900 uppercase italic leading-none mb-1">{s.repName}</h3>
                          <a 
                            href={`https://wa.me/${s.repPhone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 hover:underline block"
                          >
                            {s.repPhone}
                          </a>
                          <div className="flex gap-2">
                             <button onClick={() => { setSelectedRepId(s.repId); setMovType('Reposição'); setIsMovOpen(true); }} className="flex-1 bg-emerald-500 text-zinc-900 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">+ Reposição</button>
                             <button onClick={() => { setSelectedRepId(s.repId); setIsSaleOpen(true); }} className="flex-1 bg-zinc-900 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Venda Rápida</button>
                             <button 
                                onClick={() => {
                                  const rep = reps.find(r => r.id === s.repId);
                                  if (rep) {
                                    setEditingRep(rep);
                                    setIsRepOpen(true);
                                  }
                                }}
                                className="p-4 bg-zinc-100 text-zinc-600 rounded-2xl hover:bg-zinc-200 transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Deseja excluir a vendedora ${s.repName}?`)) {
                                    setReps(prev => prev.filter(r => r.id !== s.repId));
                                  }
                                }} 
                                className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                          </div>
                       </div>
                       <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div onClick={() => { setTargetRepId(s.repId); setAdjTarget('total'); setIsAdjOpen(true); }} className="cursor-pointer hover:opacity-80 transition-opacity">
                             <SummaryItem label="Patrimônio" value={formatCurrency(s.totalDelivered)} />
                          </div>
                          <div onClick={() => { setTargetRepId(s.repId); setAdjTarget('sold'); setIsAdjOpen(true); }} className="cursor-pointer hover:opacity-80 transition-opacity">
                             <SummaryItem label="Vendido" value={formatCurrency(s.soldValue)} highlight />
                          </div>
                          <div onClick={() => { setTargetRepId(s.repId); setAdjTarget('commission'); setIsAdjOpen(true); }} className="cursor-pointer hover:opacity-80 transition-opacity">
                             <SummaryItem label="Comissão" value={formatCurrency(s.commissionValue)} color="text-rose-500" />
                          </div>
                          <SummaryItem label="Status" value={s.status} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-zinc-100 px-8 py-6 flex justify-around items-center z-50 rounded-t-[40px] shadow-lg">
        <NavBtn 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>} 
          label="MEU HUB" 
        />
        <NavBtn 
          active={activeTab === 'maletas'} 
          onClick={() => setActiveTab('maletas')} 
          icon={<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745V20a2 2 0 002 2h14a2 2 0 002-2v-6.745zM3.136 11.562L12 13l8.864-1.438A23.913 23.913 0 0012 10a23.914 23.914 0 00-8.864 1.562zM12 2l4 4V2H8v4l4-4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 13a2 2 0 100-4 2 2 0 000 4z" /></svg>} 
          label="EQUIPE DE ELITE" 
        />
      </nav>

      {/* MODAIS */}
      <MovementModal 
        isOpen={isMovOpen} 
        onClose={() => { setIsMovOpen(false); setEditingMov(null); setMovType('Vendido'); }} 
        editingMovement={editingMov} 
        reps={reps} 
        products={products} 
        initialType={movType} 
        initialRepId={selectedRepId} 
        onSave={m => {
          setMovements(prev => {
            const exists = prev.find(x => x.id === m.id);
            if (exists) {
              // If editing, we'd need to revert old stock and apply new. 
              // For simplicity in this "varedura", let's handle new movements stock update.
              return prev.map(x => x.id === m.id ? m : x);
            }
            return [m, ...prev];
          });
          
          // Update stock if it's a new movement
          const exists = movements.find(x => x.id === m.id);
          if (!exists) {
            setProducts(prev => prev.map(p => {
              if (p.id === m.productId) {
                if (m.type === 'Vendido' || m.type === 'Devolvido') {
                  // These types usually come FROM the representative's bag, 
                  // but if we are tracking GLOBAL stock, 'Vendido' doesn't change global stock (it was already removed when 'Entregue')
                  // However, 'Entregue' and 'Reposição' definitely REDUCE global stock.
                  // 'Devolvido' INCREASES global stock.
                  return p; 
                }
                if (m.type === 'Entregue' || m.type === 'Reposição') {
                  return { ...p, stock: Math.max(0, p.stock - m.quantity) };
                }
                if (m.type === 'Devolvido') {
                  // If returned to base, it goes back to global stock
                  return { ...p, stock: p.stock + m.quantity };
                }
              }
              return p;
            }));
          }
        }} 
      />
      <ProductModal isOpen={isProdOpen} onClose={() => { setIsProdOpen(false); setEditingProd(null); }} editingProduct={editingProd} onSave={p => setProducts(prev => { const e = prev.find(x => x.id === p.id); return e ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]; })} />
      <RepresentativeModal isOpen={isRepOpen} onClose={() => { setIsRepOpen(false); setEditingRep(null); }} editingRep={editingRep} onSave={r => setReps(prev => { const e = prev.find(x => x.id === r.id); return e ? prev.map(x => x.id === r.id ? r : x) : [r, ...prev]; })} />
      <OCRModal isOpen={isOCRModalOpen} onClose={() => setIsOCRModalOpen(false)} onImport={p => setProducts(prev => [...p, ...prev])} />
      <ProductScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} products={products} />
      <AdjustmentModal 
        isOpen={isAdjOpen} 
        onClose={() => setIsAdjOpen(false)} 
        target={adjTarget} 
        repId={targetRepId} 
        onSave={m => setMovements(prev => [m, ...prev])} 
      />
      <SaleModal 
        isOpen={isSaleOpen} 
        onClose={() => { setIsSaleOpen(false); setSelectedRepId(''); }} 
        reps={reps} 
        products={products} 
        initialRepId={selectedRepId}
        onSave={(s: Sale) => {
          const movement: Movement = {
            id: s.id,
            date: s.date,
            representativeId: s.representativeId,
            productId: s.productId,
            type: 'Vendido',
            quantity: s.quantity || 1,
            value: s.value
          };
          setMovements(prev => [movement, ...prev]);
        }} 
      />
      <BulkSaleOCRModal 
        isOpen={isBulkOCROpen} 
        onClose={() => setIsBulkOCROpen(false)} 
        reps={reps} 
        products={products} 
        onImport={(sales) => {
          const newMovs = sales.map(s => ({
            id: s.id,
            date: s.date,
            representativeId: s.representativeId,
            productId: s.productId,
            type: 'Vendido' as const,
            quantity: s.quantity || 1,
            value: s.value
          }));
          setMovements(prev => [...newMovs, ...prev]);
        }} 
      />
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
