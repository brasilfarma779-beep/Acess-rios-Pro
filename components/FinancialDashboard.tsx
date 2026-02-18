
import React, { useMemo } from 'react';
import { Movement, Product, Category, MaletaSummary } from '../types';
import { formatCurrency } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, ComposedChart
} from 'recharts';
import { TrendingUp, DollarSign, Package, Percent, PieChart as PieIcon, BarChart3 } from 'lucide-react';

interface FinancialDashboardProps {
  movements: Movement[];
  products: Product[];
  summaries: MaletaSummary[];
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#ec4899'];

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ movements, products, summaries }) => {
  
  // Data for Sales by Category
  const salesByCategory = useMemo(() => {
    return Object.values(Category).map(cat => {
      const total = movements
        .filter(m => m.type === 'Vendido' && products.find(p => p.id === m.productId)?.category === cat)
        .reduce((acc, m) => acc + (m.value * m.quantity), 0);
      return { name: cat, value: total };
    }).filter(c => c.value > 0);
  }, [movements, products]);

  // Data for Profit vs Commission
  const totalSold = useMemo(() => summaries.reduce((acc, s) => acc + s.soldValue, 0), [summaries]);
  const totalComm = useMemo(() => summaries.reduce((acc, s) => acc + s.commissionValue, 0), [summaries]);
  const totalProfit = totalSold - totalComm;

  const profitData = [
    { name: 'Lucro Dona', value: totalProfit, color: '#10b981' },
    { name: 'Comissões', value: totalComm, color: '#f43f5e' },
  ];

  // Data for Stock by Category (Value and Quantity)
  const stockData = useMemo(() => {
    return Object.values(Category).map(cat => {
      const filtered = products.filter(p => p.category === cat);
      const value = filtered.reduce((acc, p) => acc + (p.price * p.stock), 0);
      const qty = filtered.reduce((acc, p) => acc + p.stock, 0);
      return { name: cat, valor: value, quantidade: qty };
    }).filter(c => c.valor > 0 || c.quantidade > 0);
  }, [products]);

  // Data for Sales Trend (Last 7 days or all available)
  const salesTrend = useMemo(() => {
    const daily: Record<string, { date: string, vendas: number, lucro: number }> = {};
    
    movements.filter(m => m.type === 'Vendido').forEach(m => {
      const date = new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!daily[date]) daily[date] = { date, vendas: 0, lucro: 0 };
      daily[date].vendas += m.value * m.quantity;
      // Simple profit calculation for trend (assuming 70% profit as base if not specified)
      daily[date].lucro += (m.value * m.quantity) * 0.7; 
    });

    return Object.values(daily).sort((a, b) => {
      const [da, ma] = a.date.split('/').map(Number);
      const [db, mb] = b.date.split('/').map(Number);
      return ma !== mb ? ma - mb : da - db;
    });
  }, [movements]);

  const totalItems = useMemo(() => products.reduce((acc, p) => acc + p.stock, 0), [products]);
  const totalStockValue = useMemo(() => products.reduce((acc, p) => acc + (p.price * p.stock), 0), [products]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
        <div>
          <h2 className="text-4xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">Visão Soberana</h2>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-emerald-500" /> Inteligência Financeira & Performance
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl border border-zinc-100 shadow-sm">
            <p className="text-[8px] font-black text-zinc-400 uppercase mb-0.5">Patrimônio Total</p>
            <p className="text-lg font-black text-zinc-900 tracking-tight">{formatCurrency(totalStockValue)}</p>
          </div>
          <div className="bg-zinc-900 px-4 py-2 rounded-2xl shadow-lg">
            <p className="text-[8px] font-black text-zinc-500 uppercase mb-0.5">Peças em Campo</p>
            <p className="text-lg font-black text-white tracking-tight">{totalItems} <span className="text-[10px] text-zinc-500">un.</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TREND CHART */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[40px] border border-zinc-100 shadow-sm min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-zinc-900 italic uppercase tracking-tighter flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" /> Fluxo de Vendas
              </h3>
              <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Desempenho Diário R$</p>
            </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#a1a1aa'}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#a1a1aa'}}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: '800' }}
                  formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                />
                <Area type="monotone" dataKey="vendas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PROFIT PIE */}
        <div className="bg-white p-6 rounded-[40px] border border-zinc-100 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-xl font-black text-zinc-900 italic uppercase tracking-tighter flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-rose-500" /> Saúde do Lucro
            </h3>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Divisão de Receita</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={profitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {profitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: '800' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-3 mt-4">
              {profitData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-black text-zinc-500 uppercase">{item.name}</span>
                  </div>
                  <span className="text-xs font-black text-zinc-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CATEGORY BAR CHART */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[48px] border border-zinc-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-2xl font-black text-zinc-900 italic uppercase tracking-tighter flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-500" /> Performance por Categoria
              </h3>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Volume Financeiro vs Quantidade</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase">Valor R$</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-zinc-900" />
                <span className="text-[9px] font-black text-zinc-400 uppercase">Estoque Un.</span>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 800, fill: '#71717a'}}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#a1a1aa'}}
                  tickFormatter={(value) => `R$${value}`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#a1a1aa'}}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: '800' }}
                />
                <Bar yAxisId="left" dataKey="valor" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={40} />
                <Bar yAxisId="right" dataKey="quantidade" fill="#18181b" radius={[10, 10, 0, 0]} barSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard 
            icon={<DollarSign className="w-5 h-5" />} 
            label="Vendas Totais" 
            value={formatCurrency(totalSold)} 
            color="bg-emerald-50 text-emerald-600" 
          />
          <SummaryCard 
            icon={<Percent className="w-5 h-5" />} 
            label="Comissões Pagas" 
            value={formatCurrency(totalComm)} 
            color="bg-rose-50 text-rose-600" 
          />
          <SummaryCard 
            icon={<TrendingUp className="w-5 h-5" />} 
            label="Lucro Líquido" 
            value={formatCurrency(totalProfit)} 
            color="bg-blue-50 text-blue-600" 
          />
          <SummaryCard 
            icon={<Package className="w-5 h-5" />} 
            label="Itens em Estoque" 
            value={`${totalItems} un.`} 
            color="bg-zinc-100 text-zinc-900" 
          />
        </div>

      </div>
    </div>
  );
};

const SummaryCard: React.FC<{icon: React.ReactNode, label: string, value: string, color: string}> = ({ icon, label, value, color }) => (
  <div className="bg-white p-5 rounded-[32px] border border-zinc-100 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-lg font-black text-zinc-900 tracking-tight">{value}</p>
    </div>
  </div>
);

export default FinancialDashboard;
