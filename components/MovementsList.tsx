import React from 'react';
import { Movement, Product, Representative } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { History, ArrowUpRight, ArrowDownLeft, RefreshCcw, Settings } from 'lucide-react';

interface MovementsListProps {
  movements: Movement[];
  products: Product[];
  reps: Representative[];
}

const MovementsList: React.FC<MovementsListProps> = ({ movements, products, reps }) => {
  const sortedMovements = [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getIcon = (type: string) => {
    switch (type) {
      case 'Vendido': return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
      case 'Entregue': return <ArrowDownLeft className="w-4 h-4 text-blue-500" />;
      case 'Reposição': return <RefreshCcw className="w-4 h-4 text-amber-500" />;
      case 'Ajuste': return <Settings className="w-4 h-4 text-zinc-500" />;
      default: return <History className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="bg-white rounded-[40px] border border-zinc-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-zinc-900 italic uppercase tracking-tighter">Registro de Atividades</h3>
          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-1">Histórico completo de movimentações</p>
        </div>
        <div className="bg-zinc-50 px-4 py-2 rounded-2xl">
          <span className="text-[10px] font-black text-zinc-400 uppercase">{movements.length} Registros</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50">
              <th className="px-8 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
              <th className="px-8 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Tipo</th>
              <th className="px-8 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Representante</th>
              <th className="px-8 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Produto</th>
              <th className="px-8 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {sortedMovements.map((m) => {
              const product = products.find(p => p.id === m.productId);
              const rep = reps.find(r => r.id === m.representativeId);
              return (
                <tr key={m.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-8 py-5 text-xs font-bold text-zinc-500">{formatDate(m.date)}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-zinc-50 group-hover:bg-white transition-colors">
                        {getIcon(m.type)}
                      </div>
                      <span className="text-xs font-black text-zinc-900 uppercase italic">{m.type}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-zinc-900 uppercase">{rep?.name || 'Sistema'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-bold text-zinc-900">{product?.name || 'Ajuste Manual'}</p>
                    <p className="text-[9px] font-black text-zinc-400 uppercase">{m.quantity} un. x {formatCurrency(m.value)}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="text-sm font-black text-zinc-900">{formatCurrency(m.value * m.quantity)}</span>
                  </td>
                </tr>
              );
            })}
            {movements.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center">
                  <p className="text-xs font-black text-zinc-300 uppercase italic">Nenhuma movimentação registrada</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MovementsList;
