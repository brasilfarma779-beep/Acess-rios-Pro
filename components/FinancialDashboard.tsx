
import React from 'react';
import { Movement, Product, Category, MaletaSummary } from '../types';
import { formatCurrency } from '../utils';

interface FinancialDashboardProps {
  movements: Movement[];
  products: Product[];
  summaries: MaletaSummary[];
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ movements, products, summaries }) => {
  
  // Gráfico 1: Vendas por Categoria
  const salesByCategory = Object.values(Category).map(cat => {
    const total = movements
      .filter(m => m.type === 'Vendido' && products.find(p => p.id === m.productId)?.category === cat)
      .reduce((acc, m) => acc + (m.value * m.quantity), 0);
    return { name: cat, value: total };
  }).filter(c => c.value > 0);

  const maxCategoryValue = Math.max(...salesByCategory.map(c => c.value), 1);

  // Gráfico 2: Lucro vs Comissão
  const totalSold = summaries.reduce((acc, s) => acc + s.soldValue, 0);
  const totalComm = summaries.reduce((acc, s) => acc + s.commissionValue, 0);
  const totalProfit = totalSold - totalComm;

  // Gráfico 3: Valor por Categoria (Estoque)
  const stockValueByCategory = Object.values(Category).map(cat => {
    const total = products
      .filter(p => p.category === cat)
      .reduce((acc, p) => acc + (p.price * p.stock), 0);
    return { name: cat, value: total };
  }).filter(c => c.value > 0);

  // Gráfico 4: Performance de Giro (Vendido / Total Entregue)
  const totalDeliveredVal = summaries.reduce((acc, s) => acc + s.totalDelivered, 0);
  const turnoverRate = totalDeliveredVal > 0 ? (totalSold / totalDeliveredVal) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="px-4">
        <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter">Financeiro Pro</h2>
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Dashboards Dinâmicos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Gráfico 1: Distribuição de Vendas */}
        <ChartCard title="Vendas por Categoria" sub="Volume de Saída R$">
          <div className="space-y-4 pt-4">
            {salesByCategory.map((c, i) => (
              <div key={c.name}>
                <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                  <span>{c.name}</span>
                  <span className="text-zinc-400">{formatCurrency(c.value)}</span>
                </div>
                <div className="h-3 bg-zinc-50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-amber-400' : i === 2 ? 'bg-blue-500' : 'bg-rose-400'}`}
                    style={{ width: `${(c.value / maxCategoryValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {salesByCategory.length === 0 && <EmptyState />}
          </div>
        </ChartCard>

        {/* Gráfico 2: Divisão de Receita */}
        <ChartCard title="Saúde do Lucro" sub="Bruto vs Comissões">
          <div className="flex h-full items-center gap-10 pt-4">
             <div className="relative w-40 h-40">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path className="text-zinc-100" strokeDasharray="100, 100" strokeWidth="5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500 transition-all duration-1000" strokeDasharray={`${(totalProfit / (totalSold || 1)) * 100}, 100`} strokeWidth="5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-rose-400 transition-all duration-1000" strokeDasharray={`${(totalComm / (totalSold || 1)) * 100}, 100`} strokeDashoffset={`-${(totalProfit / (totalSold || 1)) * 100}`} strokeWidth="5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <p className="text-[10px] font-black text-zinc-400 uppercase">Bruto</p>
                   <p className="text-xs font-black">{formatCurrency(totalSold)}</p>
                </div>
             </div>
             <div className="space-y-3">
                <LegendItem color="bg-emerald-500" label="Lucro Líquido" value={formatCurrency(totalProfit)} />
                <LegendItem color="bg-rose-400" label="Comissões" value={formatCurrency(totalComm)} />
             </div>
          </div>
        </ChartCard>

        {/* Gráfico 3: Estoque por Categoria */}
        <ChartCard title="Valor em Estoque" sub="Patrimônio Imobilizado">
          <div className="flex items-end gap-3 h-48 pt-6">
            {stockValueByCategory.map((c, i) => {
              const maxVal = Math.max(...stockValueByCategory.map(x => x.value), 1);
              return (
                <div key={c.name} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="flex-1 w-full bg-zinc-50 rounded-xl relative overflow-hidden flex flex-col justify-end">
                    <div 
                      className={`w-full transition-all duration-1000 ${i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-400'}`}
                      style={{ height: `${(c.value / maxVal) * 100}%` }}
                    />
                  </div>
                  <p className="text-[8px] font-black uppercase text-zinc-400 rotate-45 mt-2 origin-left whitespace-nowrap">{c.name}</p>
                </div>
              );
            })}
            {stockValueByCategory.length === 0 && <EmptyState />}
          </div>
        </ChartCard>

        {/* Gráfico 4: Índice de Giro */}
        <ChartCard title="Peças Vendidas %" sub="Meta de Escoamento">
           <div className="flex flex-col justify-center h-full pt-4">
              <div className="flex justify-between items-end mb-4">
                 <h4 className="text-5xl font-black text-zinc-900 tracking-tighter">{turnoverRate.toFixed(1)}<span className="text-2xl text-zinc-300">%</span></h4>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-zinc-400 uppercase">Peças Vendidas</p>
                    <p className="text-sm font-black text-emerald-600">{summaries.reduce((a,s) => a+s.totalSold, 0)} un.</p>
                 </div>
              </div>
              <div className="w-full h-6 bg-zinc-100 rounded-2xl overflow-hidden p-1 shadow-inner">
                 <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl transition-all duration-1000 shadow-lg" style={{ width: `${Math.min(turnoverRate, 100)}%` }} />
              </div>
              <p className="text-[9px] text-zinc-400 font-bold uppercase mt-4 text-center">Referente ao volume total entregue nas maletas</p>
           </div>
        </ChartCard>

      </div>
    </div>
  );
};

const ChartCard: React.FC<{title: string, sub: string, children: React.ReactNode}> = ({ title, sub, children }) => (
  <div className="bg-white p-8 rounded-[48px] border border-zinc-100 shadow-sm flex flex-col h-[320px]">
    <div className="mb-2">
      <h3 className="text-lg font-black text-zinc-900 italic uppercase leading-none">{title}</h3>
      <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-1">{sub}</p>
    </div>
    <div className="flex-1 relative">
      {children}
    </div>
  </div>
);

const LegendItem: React.FC<{color: string, label: string, value: string}> = ({ color, label, value }) => (
  <div className="flex items-center gap-3">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <div>
      <p className="text-[8px] font-black text-zinc-400 uppercase leading-none mb-1">{label}</p>
      <p className="text-xs font-black text-zinc-900">{value}</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="h-full flex items-center justify-center">
    <p className="text-[10px] text-zinc-300 font-black uppercase">Sem dados para exibir</p>
  </div>
);

export default FinancialDashboard;
