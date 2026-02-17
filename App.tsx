
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Representative, Product, Category, MaletaSummary, MovementType, RepStatus } from './types';
import { calculateMaletaSummaries, formatCurrency, formatDate, generateId, calculateCommission, isMonday, getDayName } from './utils';
import StatsCard from './components/StatsCard';
import MovementModal from './components/MovementModal';
import RepresentativeModal from './components/RepresentativeModal';
import ProductModal from './components/ProductModal';
import OCRModal from './components/OCRModal';

type Tab = 'dashboard' | 'maletas' | 'produtos' | 'movimentacoes';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  const [movements, setMovements] = useState<Movement[]>(() => {
    const saved = localStorage.getItem('movs_v4');
    if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    return [
      { id: 'm1', date: new Date().toISOString(), representativeId: 'rep-andressa', productId: 'p1', type: 'Entregue', quantity: 1, value: 8634 },
      { id: 'm2', date: new Date().toISOString(), representativeId: 'rep-andressa', productId: 'p2', type: 'Vendido', quantity: 1, value: 4200 },
    ];
  });

  const [reps, setReps] = useState<Representative[]>(() => {
    const saved = localStorage.getItem('reps_v4');
    if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    return [{
      id: 'rep-andressa',
      name: 'Andressa',
      phone: '(11) 99999-9999',
      city: 'São Paulo',
      startDate: '2026-02-15',
      endDate: '2026-04-15',
      active: true,
      status: 'Em Campo'
    }];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('prods_v4');
    if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);
    return [
      { id: 'p1', name: 'Carga Inicial Maleta', code: 'KIT-01', category: Category.CONJUNTOS, price: 8634, stock: 10 },
      { id: 'p2', name: 'Mix de Peças Vendidas', code: 'MIX-01', category: Category.BRINCOS, price: 4200, stock: 50 }
    ];
  });

  const [ledgerFilterRep, setLedgerFilterRep] = useState<string>('all');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => localStorage.setItem('movs_v4', JSON.stringify(movements)), [movements]);
  useEffect(() => localStorage.setItem('reps_v4', JSON.stringify(reps)), [reps]);
  useEffect(() => localStorage.setItem('prods_v4', JSON.stringify(products)), [products]);

  const [isMovOpen, setIsMovOpen] = useState(false);
  const [defaultMovType, setDefaultMovType] = useState<MovementType>('Vendido');
  const [defaultRepId, setDefaultRepId] = useState<string | undefined>(undefined);
  const [autoScanner, setAutoScanner] = useState(false);

  const [isRepOpen, setIsRepOpen] = useState(false);
  const [isProdOpen, setIsProdOpen] = useState(false);
  const [isOCROpen, setIsOCROpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);

  const maletaSummaries = useMemo(() => calculateMaletaSummaries(movements, reps), [movements, reps]);
  
  const stats = useMemo(() => {
    const totalSold = maletaSummaries.reduce((acc, s) => acc + s.soldValue, 0);
    const totalCommission = maletaSummaries.reduce((acc, s) => acc + s.commissionValue, 0);
    const totalOwner = totalSold - totalCommission;
    return { totalSold, totalCommission, totalOwner };
  }, [maletaSummaries]);

  const salesByDay = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    movements.filter(m => m.type === 'Vendido').forEach(m => {
      const day = new Date(m.date).getDay();
      counts[day] += m.value * m.quantity;
    });
    const max = Math.max(...counts);
    const min = Math.min(...counts.filter(c => c > 0) || [0]);
    return counts.map((val, idx) => ({ 
      day: getDayName(idx), 
      val, 
      isMax: val === max && max > 0, 
      isMin: val === min && min > 0 
    }));
  }, [movements]);

  const topSellerOfMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlySales = movements
      .filter(m => {
        const d = new Date(m.date);
        return m.type === 'Vendido' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, m) => {
        acc[m.representativeId] = (acc[m.representativeId] || 0) + (m.value * m.quantity);
        return acc;
      }, {} as Record<string, number>);

    const topId = Object.keys(monthlySales).sort((a, b) => monthlySales[b] - monthlySales[a])[0];
    if (!topId) return null;

    const rep = reps.find(r => r.id === topId);
    const totalSold = monthlySales[topId];
    const rate = calculateCommission(totalSold);
    const commission = totalSold * rate;
    
    return { name: rep?.name || 'Vendedora', totalSold, commission };
  }, [movements, reps]);

  const ledgerData = useMemo(() => {
    return movements
      .filter(m => m.type === 'Vendido')
      .map(m => {
        const rep = reps.find(r => r.id === m.representativeId);
        const prod = products.find(p => p.id === m.productId);
        const summary = maletaSummaries.find(s => s.repId === m.representativeId);
        const commissionRate = calculateCommission(summary?.soldValue || 0);
        const valorVenda = m.value * m.quantity;
        const comissaoValor = valorVenda * commissionRate;
        const totalLiquido = valorVenda - comissaoValor;

        return {
          id: m.id,
          date: m.date,
          repName: rep?.name || 'Vendedora',
          repId: m.representativeId,
          productName: prod?.name || 'Produto',
          valorVenda,
          comissaoValor,
          totalLiquido,
          ratePercent: (commissionRate * 100).toFixed(0),
          isMonday: isMonday(m.date)
        };
      })
      .filter(item => ledgerFilterRep === 'all' || item.repId === ledgerFilterRep)
      .sort((a, b) => ledgerSortOrder === 'desc' ? b.valorVenda - a.valorVenda : a.valorVenda - b.valorVenda);
  }, [movements, reps, products, maletaSummaries, ledgerFilterRep, ledgerSortOrder]);

  const openReposicao = (repId: string, withScanner = false) => {
    setDefaultRepId(repId);
    setDefaultMovType('Reposição');
    setAutoScanner(withScanner);
    setIsMovOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-28 font-sans">
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-40 px-6 py-5 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276l-4 2a1 1 0 000 1.788l4 2A1 1 0 0016.658 11.236l4-2a1 1 0 000-1.788l-4-2a1 1 0 00-1.447 0zM7 10a1 1 0 011-1h1a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-900 uppercase tracking-tighter italic leading-none">MALETAS PRO</h1>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Inteligência de Vendas</p>
            </div>
          </div>
          <button onClick={() => { setDefaultRepId(undefined); setDefaultMovType('Vendido'); setAutoScanner(false); setIsMovOpen(true); }} className="hidden md:block bg-zinc-900 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all uppercase tracking-widest">Novo Lançamento</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8 mt-2">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* PAINEL DESTAQUE DO MÊS */}
            {topSellerOfMonth && (
              <section className="bg-zinc-900 rounded-[40px] p-8 border border-white/5 shadow-2xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">🏆 Vendedora Destaque do Mês</p>
                      <h2 className="text-4xl font-black tracking-tight">{topSellerOfMonth.name}</h2>
                    </div>
                  </div>
                  <div className="flex gap-12 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-12">
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Vendido</p>
                      <p className="text-2xl font-black">{formatCurrency(topSellerOfMonth.totalSold)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Comissão Gerada</p>
                      <p className="text-2xl font-black text-emerald-400">{formatCurrency(topSellerOfMonth.commission)}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* RAIO-X DA SEMANA (Nova Seção) */}
            <section className="bg-white rounded-[40px] p-8 border border-zinc-200 shadow-sm overflow-hidden">
               <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight leading-none">Raio-X da Semana</h2>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Volume de Vendas Diário</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-zinc-400">Dia de Ouro</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500 rounded-full"></div><span className="text-[9px] font-black uppercase text-zinc-400">Dia Crítico</span></div>
                  </div>
               </div>
               <div className="grid grid-cols-7 gap-3 h-48 items-end">
                  {salesByDay.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 group relative">
                       <div 
                         className={`w-full rounded-2xl transition-all duration-500 ${d.isMax ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : d.isMin ? 'bg-rose-500 shadow-lg shadow-rose-100' : 'bg-zinc-100'} group-hover:opacity-80`}
                         style={{ height: d.val === 0 ? '10%' : `${(d.val / Math.max(...salesByDay.map(x=>x.val))) * 100}%` }}
                       >
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                            {formatCurrency(d.val)}
                          </div>
                       </div>
                       <span className={`text-[10px] font-black uppercase tracking-widest ${d.isMax ? 'text-emerald-600' : d.isMin ? 'text-rose-600' : 'text-zinc-400'}`}>{d.day}</span>
                    </div>
                  ))}
               </div>
            </section>

            {/* Status Geral */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-[40px] p-8 border border-zinc-200 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-3xl font-black text-zinc-900 tracking-tight mb-1">{maletaSummaries[0]?.repName || 'Selecione'}</h3>
                  <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-8">Vigência: 15/02/2026 - 15/04/2026</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-zinc-50 pb-4">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carga Maleta</span>
                      <span className="text-xl font-black text-zinc-800">{formatCurrency(maletaSummaries[0]?.totalDelivered || 0)}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-zinc-50 pb-4">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Vendido</span>
                      <span className="text-xl font-black text-emerald-600">{formatCurrency(maletaSummaries[0]?.soldValue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-zinc-50 pb-4">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Comissão ({maletaSummaries[0]?.commissionRate || 0}%)</span>
                      <span className="text-xl font-black text-rose-500">-{formatCurrency(maletaSummaries[0]?.commissionValue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Valor Dona</span>
                      <span className="text-4xl font-black text-zinc-900">{formatCurrency(maletaSummaries[0]?.ownerValue || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white p-8 rounded-[40px] border border-zinc-200 flex flex-col justify-between shadow-sm">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Venda Bruta Geral</p>
                   <div>
                     <p className="text-5xl font-black text-zinc-900 mb-2">{formatCurrency(stats.totalSold)}</p>
                     <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden">
                       <div className="bg-emerald-500 h-full w-[45%]" />
                     </div>
                   </div>
                </div>
                <div className="bg-emerald-600 p-8 rounded-[40px] text-white flex flex-col justify-between shadow-xl shadow-emerald-100/20">
                   <p className="text-[10px] font-black text-emerald-100/50 uppercase tracking-widest mb-4">Lucro Líquido Dona</p>
                   <div>
                     <p className="text-5xl font-black">{formatCurrency(stats.totalOwner)}</p>
                     <p className="text-[10px] font-bold text-emerald-200 uppercase mt-4">Total após comissões pagas</p>
                   </div>
                </div>
              </div>
            </div>

            {/* PLANILHA DE VENDAS ESTILO EXCEL */}
            <section className="bg-white rounded-[40px] border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight leading-none">Planilha de Vendas</h2>
                  <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mt-1">Produto • Valor • Comissão • Total</p>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <select 
                    value={ledgerFilterRep}
                    onChange={e => setLedgerFilterRep(e.target.value)}
                    className="p-3 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-600 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="all">Filtro: Vendedora</option>
                    {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  
                  <button 
                    onClick={() => setLedgerSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-3 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all flex items-center gap-2"
                  >
                    Valor {ledgerSortOrder === 'desc' ? '↓' : '↑'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produto</th>
                      <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Valor Venda</th>
                      <th className="p-6 text-[10px] font-black text-rose-500 uppercase tracking-widest text-right">Comissão</th>
                      <th className="p-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right">Total Dona</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {ledgerData.length === 0 ? (
                      <tr><td colSpan={4} className="p-20 text-center text-zinc-400 font-bold uppercase text-[10px] tracking-widest italic">Nenhuma venda registrada para este filtro.</td></tr>
                    ) : (
                      ledgerData.map(row => (
                        <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors group">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-zinc-900">{row.productName}</span>
                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                                  {row.repName} • {formatDate(row.date)}
                                </span>
                              </div>
                              {row.isMonday && (
                                <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg shadow-sm animate-bounce" title="Venda de Segunda: +1 ponto para brinde">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-6 text-sm font-black text-zinc-800 text-right">{formatCurrency(row.valorVenda)}</td>
                          <td className="p-6 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-black text-rose-500">{formatCurrency(row.comissaoValor)}</span>
                              <span className="text-[9px] font-black text-rose-300 uppercase tracking-widest leading-none">{row.ratePercent}%</span>
                            </div>
                          </td>
                          <td className="p-6 text-sm font-black text-emerald-600 text-right bg-emerald-50/10">{formatCurrency(row.totalLiquido)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {ledgerData.length > 0 && (
                    <tfoot className="bg-zinc-100/50 font-black border-t border-zinc-200">
                      <tr>
                        <td className="p-8 text-right text-[10px] uppercase tracking-widest text-zinc-400">TOTAIS DA PLANILHA:</td>
                        <td className="p-8 text-lg text-zinc-900 text-right">{formatCurrency(ledgerData.reduce((acc, r) => acc + r.valorVenda, 0))}</td>
                        <td className="p-8 text-lg text-rose-600 text-right">{formatCurrency(ledgerData.reduce((acc, r) => acc + r.comissaoValor, 0))}</td>
                        <td className="p-8 text-2xl text-emerald-700 text-right bg-emerald-100/50">{formatCurrency(ledgerData.reduce((acc, r) => acc + r.totalLiquido, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* LISTA FLUTUANTE - Estrutura HTML solicitada (2 dedos abaixo da planilha) */}
            <div className="lista-flutuante mt-16 space-y-6">
              {ledgerData.map((row) => (
                <div key={`float-${row.id}`} className="item-venda bg-white rounded-[32px] p-8 border border-zinc-200 shadow-sm hover:shadow-md transition-shadow group animate-in slide-in-from-bottom-2 duration-300">
                  <div className="info-principal flex justify-between items-center mb-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Mercadoria</span>
                      <span className="produto text-xl font-black text-zinc-900 leading-none">{row.productName}</span>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Valor Venda</span>
                      <span className="preco text-xl font-black text-zinc-900 leading-none">{formatCurrency(row.valorVenda)}</span>
                    </div>
                  </div>
                  
                  <div className="detalhes-venda grid grid-cols-2 gap-4 border-t border-zinc-50 pt-6">
                    <div className="coluna flex flex-col">
                      <span className="titulo text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Comissão</span>
                      <div className="flex items-center gap-2">
                        <span className="valor text-base font-black text-rose-500">{formatCurrency(row.comissaoValor)}</span>
                        <span className="text-[8px] font-black bg-rose-50 text-rose-400 px-2 py-0.5 rounded-full">{row.ratePercent}%</span>
                      </div>
                    </div>
                    <div className="coluna total flex flex-col items-end">
                      <span className="titulo text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Total</span>
                      <div className="bg-emerald-50 px-5 py-2.5 rounded-2xl border border-emerald-100">
                        <span className="valor text-xl font-black text-emerald-700 leading-none">{formatCurrency(row.totalLiquido)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {ledgerData.length === 0 && (
                 <p className="text-center text-zinc-300 font-bold uppercase text-[10px] tracking-[0.3em] py-20">
                   Nenhum item na lista para exibir...
                 </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'maletas' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            {/* KANBAN: EM CAMPO */}
            <section className="space-y-6">
               <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Em Campo</h2>
                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black">{maletaSummaries.filter(s => s.status === 'Em Campo').length}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Ativas na rua</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {maletaSummaries.filter(s => s.status === 'Em Campo').map(s => {
                  const rep = reps.find(r => r.id === s.repId);
                  return (
                    <div key={s.repId} className="bg-white p-8 rounded-[40px] border border-zinc-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
                      <div className="absolute top-0 right-0 p-6 flex gap-2">
                        <button 
                          onClick={() => openReposicao(s.repId, true)} 
                          title="Digitalizar Reposição Rápida"
                          className="p-3 bg-emerald-600 text-white rounded-2xl transition-all shadow-lg active:scale-90 flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                          <span className="text-[10px] font-black uppercase">Digitalizar</span>
                        </button>
                        <button onClick={() => { setEditingRep(rep!); setIsRepOpen(true); }} className="p-3 bg-zinc-50 text-zinc-300 hover:text-emerald-600 rounded-2xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      </div>
                      <div className="mb-6">
                        <h3 className="text-2xl font-black text-zinc-900 leading-tight">{s.repName}</h3>
                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Vigência: {formatDate(rep?.startDate || '')} - {formatDate(rep?.endDate || '')}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t border-zinc-50 pt-6">
                        <div>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Total Maleta</p>
                          <p className="text-lg font-black text-zinc-800">{formatCurrency(s.totalDelivered)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Vendido</p>
                          <p className="text-lg font-black text-emerald-600">{formatCurrency(s.soldValue)}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 col-span-2">
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1">Progresso Meta</p>
                          <div className="w-full bg-emerald-200/50 h-2 rounded-full overflow-hidden mb-1">
                             <div className="bg-emerald-600 h-full" style={{ width: `${Math.min((s.soldValue / s.totalDelivered) * 100, 100)}%` }}></div>
                          </div>
                          <p className="text-xl font-black text-emerald-700">{formatCurrency(s.ownerValue)} <span className="text-[10px] font-bold text-emerald-500 tracking-normal opacity-60">LÍQUIDO DONA</span></p>
                        </div>
                      </div>
                    </div>
                  );
                })}
               </div>
            </section>

            {/* KANBAN: NA BASE */}
            <section className="space-y-6 opacity-80">
               <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-zinc-400 uppercase tracking-tight">Na Base / Pendentes</h2>
                    <span className="bg-zinc-200 text-zinc-500 px-3 py-1 rounded-full text-[10px] font-black">{maletaSummaries.filter(s => s.status === 'Na Base').length}</span>
                  </div>
                  <button onClick={() => { setEditingRep(null); setIsRepOpen(true); }} className="bg-zinc-900 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] shadow-lg">Nova Vendedora</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {maletaSummaries.filter(s => s.status === 'Na Base').map(s => (
                    <div key={s.repId} className="bg-zinc-100 p-8 rounded-[40px] border border-zinc-200 shadow-inner group transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-black text-zinc-500 leading-tight">{s.repName}</h3>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1 tracking-widest">Aguardando Saída / Reposição</p>
                          </div>
                          <button onClick={() => openReposicao(s.repId)} className="bg-zinc-200 text-zinc-600 p-3 rounded-2xl hover:bg-zinc-800 hover:text-white transition-all">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                    </div>
                 ))}
               </div>
            </section>
          </div>
        )}

        {activeTab === 'produtos' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Catálogo Inteligente</h2>
              <div className="flex gap-2">
                <button onClick={() => setIsOCROpen(true)} className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                <button onClick={() => setIsProdOpen(true)} className="bg-zinc-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Novo Produto</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {products.map(p => (
                 <div key={p.id} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-4">
                       <div className={`p-2 rounded-xl text-white ${p.stock > 10 ? 'bg-emerald-500' : p.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}>
                          <span className="text-[10px] font-black">{p.stock} un.</span>
                       </div>
                       <div className="p-2 bg-zinc-50 rounded-lg opacity-30 border border-zinc-200">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 17h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                       </div>
                    </div>
                    <h4 className="text-lg font-black text-zinc-900 leading-tight">{p.name}</h4>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{p.category} • {p.code || 'S/C'}</p>
                    <div className="mt-6 pt-4 border-t border-zinc-50 flex justify-between items-center">
                       <span className="text-xl font-black text-emerald-600">{formatCurrency(p.price)}</span>
                       <button className="text-zinc-300 hover:text-zinc-800 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707-2.828-2.828.707-.707zM11.366 4.828L12.172 5.63l-1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Movimentações: Mantendo estrutura ledger se necessário */}
        {activeTab === 'movimentacoes' && (
           <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Histórico Geral</h2>
              <div className="bg-white rounded-[40px] border border-zinc-200 overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                       <tr>
                          <th className="p-6 text-[10px] font-black uppercase text-zinc-400">Data</th>
                          <th className="p-6 text-[10px] font-black uppercase text-zinc-400">Tipo</th>
                          <th className="p-6 text-[10px] font-black uppercase text-zinc-400">Vendedora</th>
                          <th className="p-6 text-[10px] font-black uppercase text-zinc-400 text-right">Valor Total</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                       {movements.map(m => {
                          const rep = reps.find(r => r.id === m.representativeId);
                          return (
                            <tr key={m.id}>
                               <td className="p-6 text-xs font-bold text-zinc-500">{formatDate(m.date)}</td>
                               <td className="p-6"><span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${m.type === 'Vendido' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{m.type}</span></td>
                               <td className="p-6 text-sm font-black text-zinc-900">{rep?.name}</td>
                               <td className="p-6 text-sm font-black text-zinc-900 text-right">{formatCurrency(m.value * m.quantity)}</td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-zinc-100 px-8 py-4 flex justify-between items-center z-50 rounded-t-[32px] shadow-2xl">
        <NavBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} label="Início" />
        <NavBtn active={activeTab === 'maletas'} onClick={() => setActiveTab('maletas')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>} label="Maletas" />
        <div className="relative -top-10 scale-125">
           <button onClick={() => { setDefaultRepId(undefined); setDefaultMovType('Vendido'); setAutoScanner(false); setIsMovOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-3xl shadow-2xl active:scale-90 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg></button>
        </div>
        <NavBtn active={activeTab === 'produtos'} onClick={() => setActiveTab('produtos')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} label="Catálogo" />
        <NavBtn active={activeTab === 'movimentacoes'} onClick={() => setActiveTab('movimentacoes')} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>} label="Ledger" />
      </nav>

      <MovementModal 
        isOpen={isMovOpen} 
        onClose={() => setIsMovOpen(false)} 
        initialType={defaultMovType}
        initialRepId={defaultRepId}
        autoOpenScanner={autoScanner}
        onSave={m => {
          setMovements(prev => [m, ...prev]);
          setProducts(prev => prev.map(p => {
            if (p.id === m.productId) {
              let newStock = p.stock;
              if (m.type === 'Entregue' || m.type === 'Reposição') newStock -= m.quantity;
              else if (m.type === 'Devolvido') newStock += m.quantity;
              return { ...p, stock: newStock };
            }
            return p;
          }));
        }} 
        reps={reps} 
        products={products} 
      />
      
      <RepresentativeModal isOpen={isRepOpen} onClose={() => setIsRepOpen(false)} onSave={r => setReps(prev => { const e = prev.find(p => p.id === r.id); return e ? prev.map(p => p.id === r.id ? r : p) : [...prev, r]; })} editingRep={editingRep} />
      <ProductModal isOpen={isProdOpen} onClose={() => setIsProdOpen(false)} onSave={p => setProducts(prev => { const e = prev.find(x => x.id === p.id); return e ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]; })} />
      <OCRModal isOpen={isOCROpen} onClose={() => setIsOCROpen(false)} onImport={prods => setProducts(prev => [...prods, ...prev])} />
    </div>
  );
};

const NavBtn: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-emerald-600 scale-110' : 'text-zinc-400 opacity-60'}`}>
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
