
import React, { useState, useEffect, useMemo } from 'react';
import { Sale, Representative, Product, Category } from './types';
import { calculateRepSummaries, formatCurrency, formatDate, generateId } from './utils';
import StatsCard from './components/StatsCard';
import SaleModal from './components/SaleModal';
import RepresentativeModal from './components/RepresentativeModal';
import ProductModal from './components/ProductModal';
import OCRModal from './components/OCRModal';

type Tab = 'dashboard' | 'sales' | 'reps' | 'merchandise';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // Data State
  const [sales, setSales] = useState<Sale[]>(() => JSON.parse(localStorage.getItem('vendas_v3') || '[]'));
  const [reps, setReps] = useState<Representative[]>(() => JSON.parse(localStorage.getItem('reps_v3') || '[]'));
  const [products, setProducts] = useState<Product[]>(() => JSON.parse(localStorage.getItem('products_v3') || '[]'));
  
  // Search State
  const [searchProd, setSearchProd] = useState('');
  const [filterCat, setFilterCat] = useState<string>('Todas');

  // UI State
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isRepOpen, setIsRepOpen] = useState(false);
  const [isProdOpen, setIsProdOpen] = useState(false);
  const [isOCROpen, setIsOCROpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [editingProd, setEditingProd] = useState<Product | null>(null);

  // Persistence
  useEffect(() => localStorage.setItem('vendas_v3', JSON.stringify(sales)), [sales]);
  useEffect(() => localStorage.setItem('reps_v3', JSON.stringify(reps)), [reps]);
  useEffect(() => localStorage.setItem('products_v3', JSON.stringify(products)), [products]);

  // Summaries
  const repSummaries = useMemo(() => calculateRepSummaries(sales, reps), [sales, reps]);
  const totalGlobal = useMemo(() => repSummaries.reduce((acc, r) => acc + r.totalSold, 0), [repSummaries]);
  const totalComissoes = useMemo(() => repSummaries.reduce((acc, r) => acc + r.commission, 0), [repSummaries]);
  const totalEmpresa = totalGlobal - totalComissoes;

  // Handlers
  const handleSaveRep = (rep: Representative) => {
    setReps(prev => {
      const exists = prev.find(r => r.id === rep.id);
      if (exists) return prev.map(r => r.id === rep.id ? rep : r);
      return [...prev, rep];
    });
    setEditingRep(null);
  };

  const handleSaveProd = (prod: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.id === prod.id);
      if (exists) return prev.map(p => p.id === prod.id ? prod : p);
      return [...prev, prod];
    });
    setEditingProd(null);
  };

  const handleOCRImport = (newProducts: Product[]) => {
    setProducts(prev => [...newProducts, ...prev]);
    alert(`${newProducts.length} mercadorias importadas com sucesso!`);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchProd.toLowerCase()) || p.code.toLowerCase().includes(searchProd.toLowerCase());
      const matchCat = filterCat === 'Todas' || p.category === filterCat;
      return matchSearch && matchCat;
    });
  }, [products, searchProd, filterCat]);

  return (
    <div className="min-h-screen bg-zinc-50 pb-28 md:pb-12 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Header Premium */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-40 px-6 py-5 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-900 tracking-tighter uppercase">Acessórios Pro</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">Gestão Completa & IA</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSaleOpen(true)}
            className="hidden md:flex bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all gap-2 items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            NOVA VENDA
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8 mt-2">
        
        {/* TAB DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatsCard label="Venda Bruta" value={formatCurrency(totalGlobal)} colorClass="text-zinc-900" />
              <StatsCard label="Total Comissões" value={formatCurrency(totalComissoes)} colorClass="text-rose-600" />
              <StatsCard label="Lucro Empresa" value={formatCurrency(totalEmpresa)} colorClass="text-emerald-600" />
            </div>

            <section className="bg-white rounded-[32px] p-8 border border-zinc-100 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full opacity-50" />
               <div className="flex justify-between items-end mb-8 relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Performance da Equipe</h2>
                  <p className="text-zinc-400 text-sm font-medium">Comissões calculadas sobre vendas finalizadas.</p>
                </div>
                <button onClick={() => { setActiveTab('reps'); setIsRepOpen(true); }} className="bg-zinc-100 text-zinc-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors">CADASTRAR VENDEDORA</button>
               </div>
              
              {repSummaries.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-3xl">
                   <p className="text-zinc-400 font-bold">Inicie cadastrando vendedoras para ver o ranking.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {repSummaries.map(rep => (
                    <div key={rep.repId} className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-emerald-200 transition-colors group">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Vendedora</span>
                        <p className="font-black text-zinc-800 text-lg">{rep.repName}</p>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black">{rep.commissionRate}% Comis.</span>
                           <span className="text-zinc-400 text-[10px] font-bold">Total: {formatCurrency(rep.totalSold)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-rose-600 font-black text-xl">{formatCurrency(rep.commission)}</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">A Pagar</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB VENDEDORAS */}
        {activeTab === 'reps' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Vendedoras</h2>
                <p className="text-zinc-400 font-medium">{reps.length} cadastradas</p>
              </div>
              <button onClick={() => { setEditingRep(null); setIsRepOpen(true); }} className="bg-emerald-600 text-white font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-100">+ ADICIONAR</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reps.map(rep => (
                <div key={rep.id} className={`bg-white p-6 rounded-3xl border transition-all ${rep.active ? 'border-zinc-100' : 'border-rose-100 opacity-75 grayscale'}`}>
                  <div className="flex justify-between mb-4">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl">
                      {rep.name.charAt(0)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingRep(rep); setIsRepOpen(true); }} className="p-3 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                      </button>
                      <button onClick={() => setReps(prev => prev.filter(r => r.id !== rep.id))} className="p-3 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-zinc-800">{rep.name}</h3>
                  <p className="text-zinc-400 text-sm font-bold uppercase tracking-wide">{rep.city || 'Cidade não inf.'}</p>
                  <div className="mt-4 pt-4 border-t border-zinc-50 flex justify-between items-center">
                    <span className="text-zinc-500 font-medium text-xs">{rep.phone}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${rep.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{rep.active ? 'Ativa' : 'Inativa'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB MERCADORIAS (ESTOQUE) */}
        {activeTab === 'merchandise' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Estoque</h2>
                <p className="text-zinc-400 font-medium">{products.length} itens cadastrados</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsOCROpen(true)} 
                  className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-black px-6 py-4 rounded-2xl shadow-sm hover:bg-emerald-100 active:scale-95 transition-all flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  LER PLANILHA
                </button>
                <button 
                  onClick={() => { setEditingProd(null); setIsProdOpen(true); }} 
                  className="bg-zinc-800 text-white font-black px-6 py-4 rounded-2xl shadow-xl shadow-zinc-200 active:scale-95 transition-all"
                >
                  + NOVO ITEM
                </button>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Buscar mercadoria..." 
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                  className="w-full p-4 pl-12 bg-white border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 shadow-sm"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-4.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <select 
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="p-4 bg-white border border-zinc-100 rounded-2xl font-bold text-zinc-600 shadow-sm"
              >
                <option value="Todas">Todas Categorias</option>
                {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(prod => (
                <div key={prod.id} className="bg-white p-6 rounded-[32px] border border-zinc-100 group relative hover:shadow-2xl hover:-translate-y-1 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">{prod.category}</span>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingProd(prod); setIsProdOpen(true); }} className="p-2 text-zinc-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                      </button>
                    </div>
                  </div>
                  
                  <h4 className="font-black text-zinc-800 text-xl mb-1">{prod.name}</h4>
                  <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Código: {prod.code || 'S/C'}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                    <div>
                      <p className="text-[10px] text-zinc-400 font-black uppercase mb-1">Valor Venda</p>
                      <p className="text-2xl font-black text-zinc-900">{formatCurrency(prod.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-400 font-black uppercase mb-1">Estoque</p>
                      <div className={`flex items-center gap-2 font-black text-lg ${prod.stock < 3 ? 'text-amber-600' : 'text-zinc-800'}`}>
                        {prod.stock < 3 && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}
                        {prod.stock} un
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center bg-zinc-100/50 rounded-3xl border-2 border-dashed border-zinc-200">
                   <p className="text-zinc-400 font-bold">Nenhuma mercadoria encontrada.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB VENDAS */}
        {activeTab === 'sales' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Vendas</h2>
              <button onClick={() => setIsSaleOpen(true)} className="bg-emerald-600 text-white font-black px-6 py-4 rounded-2xl shadow-xl shadow-emerald-100">+ LANÇAR VENDA</button>
            </div>
            <div className="space-y-3">
              {sales.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(sale => {
                const rep = reps.find(r => r.id === sale.representativeId);
                const prod = products.find(p => p.id === sale.productId);
                return (
                  <div key={sale.id} className="bg-white p-6 rounded-3xl border border-zinc-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${sale.status === 'Vendida' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                           {sale.status === 'Vendida' ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /> : <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />}
                         </svg>
                       </div>
                       <div>
                        <p className="text-[10px] text-zinc-400 font-black uppercase">{formatDate(sale.date)} • {rep?.name || 'Vendedora Excl.'}</p>
                        <h4 className="font-black text-zinc-800">{prod?.name || 'Manual'} - {sale.client}</h4>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{sale.category}</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-zinc-50">
                      <div className="text-right">
                        <span className="block text-2xl font-black text-zinc-900">{formatCurrency(sale.value)}</span>
                        <span className={`text-[10px] font-black uppercase ${sale.status === 'Vendida' ? 'text-emerald-500' : 'text-rose-400'}`}>{sale.status}</span>
                      </div>
                      <button onClick={() => setSales(prev => prev.filter(s => s.id !== sale.id))} className="text-zinc-200 hover:text-rose-500 transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>

      {/* Navegação Mobile Fiel ao Aplicativo */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-zinc-100 px-8 py-4 flex justify-between items-center z-50 rounded-t-[32px] shadow-2xl">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} label="Início" />
        <NavButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>} label="Vendas" />
        <div className="relative -top-10 scale-125">
           <button onClick={() => setIsSaleOpen(true)} className="bg-emerald-600 text-white p-4 rounded-3xl shadow-2xl shadow-emerald-500 active:scale-90 transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
           </button>
        </div>
        <NavButton active={activeTab === 'reps'} onClick={() => setActiveTab('reps')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} label="Time" />
        <NavButton active={activeTab === 'merchandise'} onClick={() => setActiveTab('merchandise')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" /><path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" /></svg>} label="Estoque" />
      </nav>

      {/* Modais Integrados */}
      <SaleModal 
        isOpen={isSaleOpen} 
        onClose={() => setIsSaleOpen(false)} 
        onSave={(s) => setSales(prev => [s, ...prev])} 
        reps={reps} 
        products={products}
      />

      <RepresentativeModal
        isOpen={isRepOpen}
        onClose={() => setIsRepOpen(false)}
        onSave={handleSaveRep}
        editingRep={editingRep}
      />

      <ProductModal
        isOpen={isProdOpen}
        onClose={() => setIsProdOpen(false)}
        onSave={handleSaveProd}
        editingProduct={editingProd}
      />

      <OCRModal
        isOpen={isOCROpen}
        onClose={() => setIsOCROpen(false)}
        onImport={handleOCRImport}
      />
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-emerald-600 scale-105' : 'text-zinc-400'}`}>
    <div className={`p-1.5 rounded-xl ${active ? 'bg-emerald-50' : ''}`}>{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
