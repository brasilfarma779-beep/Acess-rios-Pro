
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Representative, Product, Category, MaletaSummary, MovementType, RepStatus, AdjustmentTarget } from './types';
import { calculateMaletaSummaries, formatCurrency, formatDate, generateId, calculateCommission, parsePastedProducts } from './utils';
import StatsCard from './components/StatsCard';
import MovementModal from './components/MovementModal';
import RepresentativeModal from './components/RepresentativeModal';
import ProductModal from './components/ProductModal';
import OCRModal from './components/OCRModal';
import AdjustmentModal from './components/AdjustmentModal';

type Tab = 'dashboard' | 'financeiro' | 'maletas' | 'produtos' | 'movimentacoes';
type RepSubTab = 'campo' | 'base';

interface SpreadsheetRow {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [activeRepTab, setActiveRepTab] = useState<RepSubTab>('campo');
  
  const [spreadsheetRows, setSpreadsheetRows] = useState<SpreadsheetRow[]>(() => {
    const saved = localStorage.getItem('spreadsheet_draft');
    return saved ? JSON.parse(saved) : [{ id: generateId(), name: '', category: '', price: 0, quantity: 0 }];
  });

  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('movs_v5_final');
    return saved ? JSON.parse(saved) : [];
  });

  const [reps, setReps] = useState<Representative[]>(() => {
    const saved = localStorage.getItem('reps_v5_final');
    if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    return [{
      id: 'rep-andressa',
      name: 'Andressa Souza',
      phone: '(11) 99999-9999',
      city: 'São Paulo',
      startDate: '2026-02-15',
      endDate: '2026-04-15',
      active: true,
      status: 'Em Campo'
    }];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('prods_v5_final');
    if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    return [
      { id: 'p1', name: 'Kit Maleta Premium', code: 'KIT-01', category: Category.CONJUNTOS, price: 8634, stock: 10 },
      { id: 'p2', name: 'Brinco Argola Ouro', code: 'ARG-01', category: Category.BRINCOS, price: 4200, stock: 3 }
    ];
  });

  useEffect(() => localStorage.setItem('movs_v5_final', JSON.stringify(movements)), [movements]);
  useEffect(() => localStorage.setItem('reps_v5_final', JSON.stringify(reps)), [reps]);
  useEffect(() => localStorage.setItem('prods_v5_final', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('spreadsheet_draft', JSON.stringify(spreadsheetRows)), [spreadsheetRows]);

  const [isMovOpen, setIsMovOpen] = useState(false);
  const [defaultMovType, setDefaultMovType] = useState<MovementType>('Vendido');
  const [defaultRepId, setDefaultRepId] = useState<string | undefined>(undefined);
  
  const [isRepOpen, setIsRepOpen] = useState(false);
  const [isProdOpen, setIsProdOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isOCROpen, setIsOCROpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [productSearch, setProductSearch] = useState('');
  
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [adjTarget, setAdjTarget] = useState<AdjustmentTarget>('sold');

  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [batchRepId, setBatchRepId] = useState<string | null>(null);
  const [batchStocks, setBatchStocks] = useState<Record<string, number>>({});
  const [batchSearch, setBatchSearch] = useState('');

  const maletaSummaries = useMemo(() => calculateMaletaSummaries(movements, reps), [movements, reps]);
  
  const stats = useMemo(() => {
    const totalSold = maletaSummaries.reduce((acc, s) => acc + s.soldValue, 0);
    const totalCommission = maletaSummaries.reduce((acc, s) => acc + s.commissionValue, 0);
    const patrimonyInField = maletaSummaries
      .filter(s => {
        const r = reps.find(rep => rep.id === s.repId);
        return r?.status === 'Em Campo';
      })
      .reduce((acc, s) => acc + (s.totalDelivered - s.soldValue), 0);

    const totalInStock = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
    const totalBusinessValue = totalInStock + patrimonyInField;

    return { 
      totalSold, 
      totalCommission, 
      totalOwner: totalSold - totalCommission,
      patrimonyInField,
      totalBusinessValue
    };
  }, [maletaSummaries, reps, products]);

  const renderRepPieChart = (repId: string) => {
    const summary = maletaSummaries.find(s => s.repId === repId);
    if (!summary || summary.soldValue === 0) return null;

    const ownerPercent = (summary.ownerValue / summary.soldValue) * 100;
    const commissionPercent = (summary.commissionValue / summary.soldValue) * 100;

    return (
      <div className="space-y-4">
        <div className="flex h-3 w-full bg-zinc-200 rounded-full overflow-hidden shadow-inner">
          <div style={{ width: `${ownerPercent}%` }} className="bg-zinc-900 h-full transition-all duration-1000" />
          <div style={{ width: `${commissionPercent}%` }} className="bg-emerald-500 h-full transition-all duration-1000" />
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1 leading-none italic">
          <div className="flex items-center gap-2 text-zinc-900">
            <span className="w-2 h-2 bg-zinc-900 rounded-full"></span>
            Dona {Math.round(ownerPercent)}%
          </div>
          <div className="flex items-center gap-2 text-emerald-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Equipe {Math.round(commissionPercent)}%
          </div>
        </div>
      </div>
    );
  };

  const openBatchEdit = (repId: string) => {
    const repMovs = movements.filter(m => m.representativeId === repId);
    const stocks: Record<string, number> = {};
    
    products.forEach(p => {
      const delivered = repMovs.filter(m => m.productId === p.id && (m.type === 'Entregue' || m.type === 'Reposição')).reduce((a, b) => a + b.quantity, 0);
      const sold = repMovs.filter(m => m.productId === p.id && m.type === 'Vendido').reduce((a, b) => a + b.quantity, 0);
      const returned = repMovs.filter(m => m.productId === p.id && m.type === 'Devolvido').reduce((a, b) => a + b.quantity, 0);
      const currentQty = delivered - sold - returned;
      if (currentQty > 0) stocks[p.id] = currentQty;
    });

    setBatchStocks(stocks);
    setBatchRepId(repId);
    setBatchSearch('');
    setIsBatchEditOpen(true);
  };

  const handleSaveBatch = () => {
    if (!batchRepId) return;
    const newMovements: Movement[] = [];
    const updatedProducts = [...products];

    products.forEach(prod => {
      const prodId = prod.id;
      const repMovs = movements.filter(m => m.representativeId === batchRepId && m.productId === prodId);
      const currentDelivered = repMovs.filter(m => (m.type === 'Entregue' || m.type === 'Reposição')).reduce((a, b) => a + b.quantity, 0);
      const currentSold = repMovs.filter(m => m.type === 'Vendido').reduce((a, b) => a + b.quantity, 0);
      const currentReturned = repMovs.filter(m => m.type === 'Devolvido').reduce((a, b) => a + b.quantity, 0);
      const currentQty = currentDelivered - currentSold - currentReturned;
      
      const newQty = batchStocks[prodId] || 0;

      if (newQty !== currentQty) {
        const diff = newQty - currentQty;
        const type: MovementType = diff > 0 ? 'Reposição' : 'Ajuste';
        
        newMovements.push({
          id: generateId(),
          date: new Date().toISOString(),
          representativeId: batchRepId,
          productId: prodId,
          type,
          quantity: Math.abs(diff),
          value: prod.price,
          adjustmentTarget: diff < 0 ? 'total' : undefined
        });

        const idx = updatedProducts.findIndex(p => p.id === prodId);
        if (idx !== -1) {
          if (diff > 0) updatedProducts[idx].stock -= diff;
          else updatedProducts[idx].stock += Math.abs(diff);
        }
      }
    });

    setMovements(prev => [...newMovements, ...prev]);
    setProducts(updatedProducts);
    setIsBatchEditOpen(false);
    alert('Maleta montada e estoque atualizado!');
  };

  const toggleRepStatus = (repId: string) => {
    setReps(prev => prev.map(r => {
      if (r.id === repId) {
        const newStatus: RepStatus = r.status === 'Em Campo' ? 'Na Base' : 'Em Campo';
        return { ...r, status: newStatus, active: newStatus === 'Em Campo' };
      }
      return r;
    }));
  };

  const openAdjustment = (repId: string, target: AdjustmentTarget) => {
    setDefaultRepId(repId);
    setAdjTarget(target);
    setIsAdjOpen(true);
  };

  const updateSpreadsheetRow = (id: string, field: keyof SpreadsheetRow, value: any) => {
    setSpreadsheetRows(spreadsheetRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addSpreadsheetRow = () => {
    setSpreadsheetRows([...spreadsheetRows, { id: generateId(), name: '', category: '', price: 0, quantity: 0 }]);
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) return;
    const newRows = parsePastedProducts(pasteText);
    
    // Filtra linhas vazias iniciais da planilha se houver apenas uma sem dados
    const currentValidRows = spreadsheetRows.filter(r => r.name !== '' || r.price !== 0);
    
    setSpreadsheetRows([...currentValidRows, ...newRows]);
    setPasteText('');
    setIsPasteModalOpen(false);
  };

  const handleSaveToCatalog = () => {
    const validRows = spreadsheetRows.filter(r => r.name.trim() !== '' && r.price > 0);
    if (validRows.length === 0) return alert('Nenhum produto válido.');
    const newProducts: Product[] = validRows.map(row => ({
      id: generateId(),
      name: row.name,
      code: `PRO-${generateId().toUpperCase().substring(0,4)}`,
      category: Category.BRINCOS,
      price: row.price,
      stock: row.quantity
    }));
    setProducts(prev => [...prev, ...newProducts]);
    setSpreadsheetRows([{ id: generateId(), name: '', category: '', price: 0, quantity: 0 }]);
    alert('Produtos adicionados ao catálogo!');
  };

  const filteredBatchProducts = products.filter(p => 
    p.name.toLowerCase().includes(batchSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(batchSearch.toLowerCase()) ||
    (batchStocks[p.id] || 0) > 0
  );

  const filteredCatalogProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const spreadsheetTotal = useMemo(() => spreadsheetRows.reduce((acc, row) => acc + (row.price * row.quantity), 0), [spreadsheetRows]);

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsProdOpen(true);
  };

  const handleDeleteProduct = (prodId: string) => {
    if (window.confirm('Tem certeza que deseja remover este produto do catálogo?')) {
      setProducts(prev => prev.filter(p => p.id !== prodId));
      setIsProdOpen(false);
      setEditingProduct(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-32 font-sans selection:bg-emerald-100">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-40 px-6 py-5 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276l-4 2a1 1 0 000 1.788l4 2A1 1 0 0016.658 11.236l4-2a1 1 0 000-1.788l-4-2a1 1 0 00-1.447 0zM7 10a1 1 0 011-1h1a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-black text-zinc-900 uppercase tracking-tighter italic leading-none">MALETAS PRO</h1>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1 italic leading-none">Intelligence Hub</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard label="Faturamento Bruto" value={formatCurrency(stats.totalSold)} colorClass="text-zinc-900" />
              <StatsCard label="Comissões Equipe" value={formatCurrency(stats.totalCommission)} colorClass="text-emerald-600" />
              <div className="bg-zinc-900 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 italic">Lucro da Dona (Real)</p>
                <h3 className="text-3xl font-black text-emerald-400 tracking-tighter">{formatCurrency(stats.totalOwner)}</h3>
              </div>
            </div>

            <section className="bg-white rounded-[48px] p-8 md:p-12 border border-zinc-200 shadow-sm overflow-hidden relative">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -z-0 translate-x-1/2 -translate-y-1/2" />
               <div className="relative z-10">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                      <h2 className="text-3xl font-black text-zinc-900 uppercase tracking-tight italic leading-none">Cadastro Rápido</h2>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase mt-2 tracking-widest italic leading-none">Modo Planilha Dinâmica</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setIsPasteModalOpen(true)} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-6 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Colar Vários
                      </button>
                      <button onClick={addSpreadsheetRow} className="bg-zinc-900 hover:bg-black text-white px-6 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">+ Nova Linha</button>
                    </div>
                 </div>
                 <div className="overflow-x-auto custom-scrollbar pb-4">
                   <table className="w-full border-separate border-spacing-y-2">
                      <thead>
                         <tr className="text-zinc-400 text-[10px] font-black uppercase tracking-widest italic">
                            <th className="px-6 py-2 text-left">Item / Mercadoria</th>
                            <th className="px-6 py-2 text-left">Preço Venda</th>
                            <th className="px-6 py-2 text-left">Estoque Inicial</th>
                            <th className="px-6 py-2 text-right">Total Previsto</th>
                         </tr>
                      </thead>
                      <tbody>
                         {spreadsheetRows.map((row) => (
                           <tr key={row.id} className="bg-zinc-50/50 hover:bg-zinc-50 transition-colors group">
                              <td className="px-6 py-4 rounded-l-[24px] border-y border-l border-zinc-100"><input type="text" value={row.name} onChange={(e) => updateSpreadsheetRow(row.id, 'name', e.target.value)} className="w-full bg-transparent border-none text-sm font-black text-zinc-800 placeholder:text-zinc-300 outline-none focus:ring-0" placeholder="Nome da peça..." /></td>
                              <td className="px-6 py-4 border-y border-zinc-100"><input type="number" step="0.01" value={row.price || ''} onChange={(e) => updateSpreadsheetRow(row.id, 'price', parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-none text-sm font-black text-emerald-600 outline-none focus:ring-0" /></td>
                              <td className="px-6 py-4 border-y border-zinc-100"><input type="number" value={row.quantity || ''} onChange={(e) => updateSpreadsheetRow(row.id, 'quantity', parseInt(e.target.value) || 0)} className="w-full bg-transparent border-none text-sm font-black text-zinc-900 outline-none focus:ring-0" /></td>
                              <td className="px-6 py-4 rounded-r-[24px] border-y border-r border-zinc-100 text-right"><span className="text-sm font-black text-zinc-900">{formatCurrency(row.price * row.quantity)}</span></td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                 </div>
                 <div className="mt-10 p-8 bg-zinc-900 rounded-[40px] flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl">
                    <div className="text-center md:text-left">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 italic">Total Geral Importação</p>
                      <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(spreadsheetTotal)}</p>
                    </div>
                    <button onClick={handleSaveToCatalog} className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-900 px-12 py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Sincronizar Catálogo</button>
                 </div>
               </div>
            </section>
          </div>
        )}

        {activeTab === 'financeiro' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 ease-out">
             <div className="px-2">
                <h2 className="text-5xl font-black text-zinc-900 italic uppercase leading-none tracking-tighter">Financeiro</h2>
                <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-[0.3em] mt-3 italic leading-none">Fintech Executive Dashboard</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-12 rounded-[56px] border border-zinc-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-blue-200 transition-all">
                   <div className="absolute top-0 right-0 p-10 text-blue-50 group-hover:text-blue-100 group-hover:scale-110 transition-all duration-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                   </div>
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3 italic">Estoque Ativo (Na Rua)</p>
                      <h3 className="text-5xl font-black text-blue-600 tracking-tighter mb-10">{formatCurrency(stats.patrimonyInField)}</h3>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-zinc-400 italic">
                            <span>Ocupação da Rede</span>
                            <span className="text-blue-600">{Math.round((stats.patrimonyInField / (stats.totalBusinessValue || 1)) * 100)}% do Capital</span>
                         </div>
                         <div className="h-6 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100 p-1 shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-200/50" 
                              style={{ width: `${(stats.patrimonyInField / (stats.totalBusinessValue || 1)) * 100}%` }}
                            />
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-12 rounded-[56px] border border-zinc-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-200 transition-all">
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3 italic">Faturamento Bruto</p>
                      <h3 className="text-5xl font-black text-emerald-500 tracking-tighter mb-6">{formatCurrency(stats.totalSold)}</h3>
                      <div className="h-24 w-full mt-6">
                         <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                            <path d="M0 18 Q 10 5, 20 15 T 40 10 T 60 15 T 80 5 T 100 12" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" className="animate-draw-path" />
                            <path d="M0 18 Q 10 5, 20 15 T 40 10 T 60 15 T 80 5 T 100 12 L 100 20 L 0 20 Z" fill="url(#gradient-neon)" className="opacity-10" />
                            <defs><linearGradient id="gradient-neon" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
                         </svg>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-12 rounded-[56px] border border-zinc-100 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-200 transition-all">
                   <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3 italic">Custo Operacional (Equipe)</p>
                        <h3 className="text-5xl font-black text-amber-500 tracking-tighter mb-4">{formatCurrency(stats.totalCommission)}</h3>
                        <p className="text-[9px] text-zinc-400 font-bold italic uppercase mt-4 max-w-[180px] leading-tight">Payout de comissões calculadas sobre as vendas reais</p>
                      </div>
                      <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                         <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-zinc-100" strokeWidth="4" />
                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-amber-500 transition-all duration-1000 ease-out" strokeWidth="4" strokeDasharray={`${(stats.totalCommission / (stats.totalSold || 1)) * 100} 100`} strokeLinecap="round" />
                         </svg>
                         <div className="absolute flex flex-col items-center leading-none">
                            <span className="text-lg font-black text-zinc-900">{Math.round((stats.totalCommission / (stats.totalSold || 1)) * 100)}%</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="bg-zinc-900 p-12 rounded-[56px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col justify-between relative overflow-hidden group border border-white/5">
                   <div className="absolute top-0 right-0 p-10 text-emerald-900/30 group-hover:scale-125 transition-transform duration-1000">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-3 italic leading-none">Caixa Líquido (Real)</p>
                      <h3 className="text-6xl font-black text-emerald-400 tracking-tighter mb-12">{formatCurrency(stats.totalOwner)}</h3>
                      <div className="flex items-end gap-3 h-24">
                         {[30, 50, 40, 70, 60, 85, 100].map((h, i) => (
                           <div key={i} className="flex-1 bg-white/5 rounded-t-xl relative group overflow-hidden">
                              <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 shadow-[0_-10px_20px_rgba(16,185,129,0.4)] transition-all duration-[1500ms] delay-[100ms] ease-out" style={{ height: `${h}%` }} />
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'maletas' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                 <h2 className="text-3xl font-black text-zinc-900 italic uppercase leading-none">Mesa de Equipe</h2>
                 <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2 italic leading-none">Gestão de Maletas Ativas</p>
               </div>
               <div className="flex bg-white p-2 rounded-[28px] border border-zinc-100 shadow-sm w-full md:w-auto">
                 <button onClick={() => setActiveRepTab('campo')} className={`flex-1 px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${activeRepTab === 'campo' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-400'}`}>🚀 Em Campo</button>
                 <button onClick={() => setActiveRepTab('base')} className={`flex-1 px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${activeRepTab === 'base' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-400'}`}>🏠 Comigo (Base)</button>
               </div>
               <button onClick={() => { setEditingRep(null); setIsRepOpen(true); }} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 active:scale-95 transition-all">Nova Vendedora</button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {maletaSummaries.filter(s => {
                const r = reps.find(rep => rep.id === s.repId);
                return activeRepTab === 'campo' ? r?.status === 'Em Campo' : r?.status === 'Na Base';
              }).map(s => {
                const rep = reps.find(r => r.id === s.repId);
                const isNaBase = rep?.status === 'Na Base';
                return (
                  <div key={s.repId} className={`bg-white p-8 md:p-10 rounded-[48px] border-2 transition-all flex flex-col lg:flex-row gap-8 relative overflow-hidden ${isNaBase ? 'border-amber-100 shadow-xl shadow-amber-50/20' : 'border-zinc-50 shadow-sm'}`}>
                    <div className="flex-1 space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-3xl font-black text-zinc-900 italic uppercase leading-none tracking-tighter">{s.repName}</h3>
                          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-3 italic">{rep?.city} • {rep?.phone}</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => toggleRepStatus(s.repId)} className={`p-5 rounded-[24px] transition-all shadow-md active:scale-90 ${isNaBase ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`} title={isNaBase ? "Enviar para Campo" : "Retornar para Base"}>
                             {isNaBase ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                           </button>
                           <button onClick={() => { setEditingRep(rep!); setIsRepOpen(true); }} className="p-5 bg-zinc-50 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-[24px] transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM11.366 4.828L12.172 5.63l-1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-zinc-900 p-5 rounded-[28px] cursor-pointer group/card" onClick={() => openAdjustment(s.repId, 'sold')}>
                           <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1 italic">Vendido</p>
                           <h4 className="text-xl font-black text-white leading-none tracking-tighter">{formatCurrency(s.soldValue)}</h4>
                        </div>
                        <div className="bg-emerald-50 p-5 rounded-[28px] cursor-pointer border border-emerald-100 group/card" onClick={() => openAdjustment(s.repId, 'commission')}>
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Comissão</p>
                           <h4 className="text-xl font-black text-emerald-600 leading-none tracking-tighter">{formatCurrency(s.commissionValue)}</h4>
                        </div>
                        <div className="bg-amber-50 p-5 rounded-[28px] border border-amber-100">
                           <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1 italic">Na Maleta</p>
                           <h4 className="text-xl font-black text-amber-500 leading-none tracking-tighter">{formatCurrency(s.totalDelivered - s.soldValue)}</h4>
                        </div>
                        <div className="bg-blue-50 p-5 rounded-[28px] border border-blue-100">
                           <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">Itens Qtd.</p>
                           <h4 className="text-xl font-black text-blue-600 leading-none tracking-tighter">{s.currentStockQty} un.</h4>
                        </div>
                      </div>
                      <button onClick={() => openBatchEdit(s.repId)} className="w-full bg-zinc-900 hover:bg-black text-white p-6 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 group">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                         Editar Tudo / Montar Maleta
                      </button>
                    </div>
                    <div className="w-full lg:w-[320px] bg-zinc-50 rounded-[48px] p-10 border border-zinc-100 flex flex-col justify-center">
                       <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 italic text-center leading-none">Análise de Lucros</h4>
                       {renderRepPieChart(s.repId) || <p className="text-center italic text-[9px] text-zinc-300 font-bold uppercase">Sem registros</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isBatchEditOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-t-8 border-zinc-900">
              <div className="p-8 md:p-12 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-zinc-50/50">
                <div className="flex-1">
                  <h2 className="text-4xl font-black text-zinc-900 uppercase italic leading-none tracking-tighter">Editor Maleta</h2>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase mt-3 tracking-widest italic leading-none">Ajustando carga para {reps.find(r=>r.id===batchRepId)?.name}</p>
                  <div className="relative mt-8 max-w-md">
                     <input type="text" value={batchSearch} onChange={e => setBatchSearch(e.target.value)} placeholder="Buscar no catálogo..." className="w-full p-5 pl-14 bg-white border-2 border-zinc-100 rounded-[24px] text-sm font-black focus:border-emerald-500 outline-none transition-all shadow-sm" />
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
                <button onClick={() => setIsBatchEditOpen(false)} className="p-5 bg-white shadow-sm border border-zinc-100 rounded-full text-zinc-400 hover:text-rose-500 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBatchProducts.map(p => {
                    const qty = (batchStocks[p.id] || 0);
                    return (
                      <div key={p.id} className={`p-8 rounded-[40px] border-2 transition-all flex flex-col justify-between h-52 group ${qty > 0 ? 'border-emerald-500 bg-emerald-50/20 shadow-lg shadow-emerald-50/50' : 'border-zinc-50 bg-zinc-50/40'}`}>
                         <div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase italic leading-none tracking-widest">{p.category}</span>
                            <h4 className="text-lg font-black text-zinc-900 mt-2 line-clamp-2 uppercase leading-tight italic tracking-tighter">{p.name}</h4>
                            <p className="text-[10px] text-emerald-600 font-bold mt-2 leading-none uppercase tracking-widest">Base: {p.stock} un.</p>
                         </div>
                         <div className="flex items-center justify-between mt-6">
                            <span className="text-sm font-black text-zinc-900">{formatCurrency(p.price)}</span>
                            <div className="flex items-center gap-4">
                               <button onClick={() => setBatchStocks(prev => ({...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - 1)}))} className="w-12 h-12 bg-white shadow-md rounded-2xl flex items-center justify-center text-rose-500 font-black text-xl hover:bg-rose-50 transition-colors">-</button>
                               <span className={`text-2xl font-black w-10 text-center ${qty > 0 ? 'text-emerald-700' : 'text-zinc-200'}`}>{qty}</span>
                               <button onClick={() => setBatchStocks(prev => ({...prev, [p.id]: (prev[p.id] || 0) + 1}))} className="w-12 h-12 bg-white shadow-md rounded-2xl flex items-center justify-center text-emerald-500 font-black text-xl hover:bg-emerald-50 transition-colors">+</button>
                            </div>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-10 border-t border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row gap-8 items-center">
                 <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic leading-none">Volume de Carga Maleta</p>
                    <p className="text-4xl font-black text-zinc-900 mt-2 tracking-tighter">{formatCurrency(Object.entries(batchStocks).reduce((acc: number, [id, q]: [string, number]) => acc + (products.find(p=>p.id===id)?.price || 0) * (q as number), 0))}</p>
                 </div>
                 <div className="flex gap-4 w-full md:w-auto ml-auto">
                    <button onClick={() => setIsBatchEditOpen(false)} className="px-10 py-6 rounded-[28px] bg-white border border-zinc-200 text-zinc-400 font-black text-[10px] uppercase tracking-widest transition-all hover:bg-zinc-50">Descartar</button>
                    <button onClick={handleSaveBatch} className="flex-1 md:flex-none bg-zinc-900 text-white px-16 py-6 rounded-[28px] font-black text-[14px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-black">Finalizar Carga</button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'produtos' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
                <div>
                  <h2 className="text-4xl font-black text-zinc-900 italic uppercase leading-none tracking-tighter">Estoque Base</h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2 italic leading-none tracking-[0.2em]">Silo Central de Mercadorias</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                  <div className="relative">
                     <input 
                        type="text" 
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Buscar no estoque..."
                        className="w-full md:w-64 p-4 pl-12 bg-white border-2 border-zinc-100 rounded-[24px] text-sm font-black focus:border-emerald-500 outline-none transition-all shadow-sm"
                     />
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setIsOCROpen(true)} className="flex-1 md:flex-none bg-emerald-50 text-emerald-600 px-6 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                      Digitalizar
                    </button>
                    <button onClick={() => { setEditingProduct(null); setIsProdOpen(true); }} className="flex-1 md:flex-none bg-zinc-900 text-white px-10 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Novo Item</button>
                  </div>
                </div>
             </div>
             
             {filteredCatalogProducts.length === 0 ? (
               <div className="py-20 text-center bg-white rounded-[48px] border-2 border-dashed border-zinc-100">
                  <p className="text-zinc-300 font-black uppercase tracking-[0.2em] italic">Nenhum item encontrado</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCatalogProducts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => openEditProduct(p)}
                      className="bg-white p-10 rounded-[48px] border-2 border-zinc-100 shadow-sm flex flex-col justify-between h-56 group hover:border-emerald-400 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-all">
                         <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full">Clique para Editar</span>
                      </div>
                      <div>
                         <span className="text-[9px] font-black bg-zinc-100 text-zinc-500 px-4 py-1.5 rounded-full uppercase italic leading-none tracking-widest">{p.category}</span>
                         <h4 className="text-2xl font-black text-zinc-900 leading-tight uppercase italic mt-4 tracking-tighter group-hover:text-emerald-600 transition-colors">{p.name}</h4>
                         <p className="text-[10px] text-zinc-300 font-bold mt-1 uppercase tracking-widest">{p.code || 'Sem Código'}</p>
                      </div>
                      <div className="flex justify-between items-end border-t border-zinc-50 pt-6 mt-4">
                         <p className="text-3xl font-black text-zinc-900 tracking-tighter group-hover:scale-105 transition-transform">{formatCurrency(p.price)}</p>
                         <span className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest ${p.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.stock} un.</span>
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </main>

      {/* MODAL DE IMPORTAÇÃO EM MASSA (COPIA E COLA) */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white/90 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
            <div className="p-8 border-b border-zinc-100/50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 uppercase italic">Colar Vários Itens</h2>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Excel • WhatsApp • Google Sheets</p>
              </div>
              <button onClick={() => setIsPasteModalOpen(false)} className="p-3 text-zinc-400 hover:text-rose-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8">
              <p className="text-[11px] text-zinc-500 font-medium mb-4 italic">Cole abaixo suas linhas. O sistema identificará automaticamente Nome, Preço e Quantidade.</p>
              <textarea 
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder="Exemplo:&#10;Brinco Pérola R$ 45,00 10&#10;Colar Ouro;60,00;5"
                className="w-full h-64 p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[32px] font-mono text-sm focus:border-emerald-500 outline-none transition-all shadow-inner resize-none"
              />
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button onClick={() => setIsPasteModalOpen(false)} className="py-5 rounded-[24px] bg-zinc-100 text-zinc-500 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                <button onClick={handleProcessPaste} disabled={!pasteText.trim()} className="py-5 rounded-[24px] bg-zinc-900 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl disabled:opacity-30 active:scale-95 transition-all">Importar Linhas</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-zinc-100 px-10 py-5 flex justify-between items-center z-50 rounded-t-[48px] shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
        <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>} label="Início" />
        <NavBtn active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Financeiro" />
        <NavBtn active={activeTab === 'maletas'} onClick={() => setActiveTab('maletas')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} label="Equipe" />
        <div className="relative -top-12 scale-125">
           <button onClick={() => { setDefaultRepId(undefined); setDefaultMovType('Vendido'); setIsMovOpen(true); }} className="bg-emerald-600 text-white p-5 rounded-[24px] shadow-2xl shadow-emerald-200 active:scale-90 transition-all hover:bg-emerald-700">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
           </button>
        </div>
        <NavBtn active={activeTab === 'produtos'} onClick={() => setActiveTab('produtos')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} label="Estoque" />
        <NavBtn active={activeTab === 'movimentacoes'} onClick={() => setActiveTab('movimentacoes')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Log" />
      </nav>

      <MovementModal isOpen={isMovOpen} onClose={() => setIsMovOpen(false)} initialType={defaultMovType} initialRepId={defaultRepId} onSave={m => { setMovements(prev => [m, ...prev]); setProducts(prev => prev.map(p => { if (p.id === m.productId) { let newStock = p.stock; if (m.type === 'Entregue' || m.type === 'Reposição') newStock -= m.quantity; else if (m.type === 'Devolvido') newStock += m.quantity; return { ...p, stock: newStock }; } return p; })); }} reps={reps} products={products} />
      <RepresentativeModal isOpen={isRepOpen} onClose={() => setIsRepOpen(false)} onSave={r => setReps(prev => { const e = prev.find(p => p.id === r.id); return e ? prev.map(p => p.id === r.id ? r : p) : [...prev, r]; })} editingRep={editingRep} />
      <ProductModal isOpen={isProdOpen} onClose={() => { setIsProdOpen(false); setEditingProduct(null); }} onSave={p => setProducts(prev => { const e = prev.find(x => x.id === p.id); return e ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]; })} editingProduct={editingProduct} onDelete={handleDeleteProduct} />
      <OCRModal isOpen={isOCROpen} onClose={() => setIsOCROpen(false)} onImport={prods => setProducts(prev => [...prods, ...prev])} />
      <AdjustmentModal isOpen={isAdjOpen} onClose={() => setIsAdjOpen(false)} target={adjTarget} repId={defaultRepId || ''} onSave={adj => setMovements(prev => [adj, ...prev])} />
      
      <style>{`
        @keyframes drawPath { from { stroke-dasharray: 0, 100; } to { stroke-dasharray: 100, 0; } }
        .animate-draw-path { stroke-dasharray: 100; animation: drawPath 3s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f4f4f5; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d4d4d8; }
      `}</style>
    </div>
  );
};

const NavBtn: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-emerald-600 scale-110' : 'text-zinc-400 opacity-60 hover:opacity-100'}`}>
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-1 italic">{label}</span>
  </button>
);

export default App;
