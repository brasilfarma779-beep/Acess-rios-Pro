import React, { useState, useMemo } from 'react';
import { Clock, Plus, CheckCircle, Package, Camera, Calendar, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';

// --- TIPAGEM DO ESTADO (STATE MANAGEMENT) ---
type MovementType = 'RETIRADA_ORIGINAL' | 'ADITIVO';

interface CycleItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

interface CycleMovement {
  id: string;
  type: MovementType;
  date: string;
  photoUrl: string;
  items: CycleItem[];
}

interface ConsignmentCycle {
  id: string;
  repName: string;
  startDate: string;
  dueDate: string;
  status: 'ABERTO' | 'ACERTADO';
  movements: CycleMovement[];
}

// --- DADOS MOCKADOS PARA DEMONSTRAÇÃO VISUAL ---
const MOCK_CYCLE: ConsignmentCycle = {
  id: 'ciclo-123',
  repName: 'Maria Silva (Elite)',
  startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 dias atrás
  dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // Faltam 45 dias
  status: 'ABERTO',
  movements: [
    {
      id: 'mov-1',
      type: 'RETIRADA_ORIGINAL',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      photoUrl: 'https://picsum.photos/seed/maleta1/400/300',
      items: [
        { id: 'p1', productName: 'Argola Dourada M', sku: 'ARG-001', quantity: 10, unitPrice: 45.0 },
        { id: 'p2', productName: 'Colar Ponto de Luz', sku: 'COL-002', quantity: 5, unitPrice: 120.0 },
      ]
    },
    {
      id: 'mov-2',
      type: 'ADITIVO',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      photoUrl: 'https://picsum.photos/seed/maleta2/400/300',
      items: [
        { id: 'p3', productName: 'Pulseira Riviera', sku: 'PUL-003', quantity: 3, unitPrice: 250.0 },
      ]
    }
  ]
};

const ConsignmentDashboard: React.FC = () => {
  const [cycle, setCycle] = useState<ConsignmentCycle>(MOCK_CYCLE);

  // --- LÓGICA DE ESTADO (STATE MANAGEMENT) ---
  
  // 1. Cálculo de Dias Restantes
  const daysRemaining = useMemo(() => {
    const today = new Date().getTime();
    const due = new Date(cycle.dueDate).getTime();
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [cycle.dueDate]);

  // 2. Cálculo do Valor Total Acumulado (Retirada Original + Aditivos)
  const totalAccumulatedValue = useMemo(() => {
    return cycle.movements.reduce((total, movement) => {
      const movementTotal = movement.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      return total + movementTotal;
    }, 0);
  }, [cycle.movements]);

  // 3. Contagem Total de Peças
  const totalItemsCount = useMemo(() => {
    return cycle.movements.reduce((total, movement) => {
      return total + movement.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  }, [cycle.movements]);

  // Cor do indicador de prazo
  const deadlineColor = daysRemaining > 15 ? 'text-emerald-500' : daysRemaining > 5 ? 'text-amber-500' : 'text-rose-500';
  const deadlineBg = daysRemaining > 15 ? 'bg-emerald-50' : daysRemaining > 5 ? 'bg-amber-50' : 'bg-rose-50';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      
      {/* 1. CABEÇALHO RESUMO */}
      <div className="bg-white p-8 rounded-[48px] border border-zinc-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-zinc-900 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-zinc-200">
            <Package className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">{cycle.repName}</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Ciclo iniciado em {formatDate(cycle.startDate)}
            </p>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className={`flex-1 md:flex-none px-6 py-4 rounded-[24px] border border-zinc-50 flex flex-col justify-center ${deadlineBg}`}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-zinc-500">Prazo (60 Dias)</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black tracking-tighter ${deadlineColor}`}>{daysRemaining}</span>
              <span className={`text-xs font-bold uppercase ${deadlineColor}`}>dias</span>
            </div>
          </div>
          <div className="flex-1 md:flex-none px-6 py-4 rounded-[24px] bg-zinc-900 text-white flex flex-col justify-center shadow-lg">
            <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-zinc-400">Valor em Posse</p>
            <span className="text-2xl font-black tracking-tight">{formatCurrency(totalAccumulatedValue)}</span>
            <p className="text-[9px] font-bold text-emerald-400 mt-1">{totalItemsCount} peças ativas</p>
          </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO PRINCIPAIS */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button className="flex-1 bg-white border-2 border-dashed border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 text-zinc-800 font-black py-6 rounded-[32px] flex items-center justify-center gap-3 transition-all group">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="block text-sm uppercase tracking-widest">Adicionar Aditivo</span>
            <span className="block text-[9px] text-zinc-400 mt-0.5">Bipar novas peças para a maleta</span>
          </div>
        </button>
        
        <button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 rounded-[32px] shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 transition-all active:scale-95 group">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <span className="block text-sm uppercase tracking-widest">Realizar Acerto Final</span>
            <span className="block text-[9px] text-emerald-200 mt-0.5">Encerrar ciclo e calcular comissões</span>
          </div>
        </button>
      </div>

      {/* 2. LINHA DO TEMPO VISUAL (TIMELINE) */}
      <div className="bg-white p-10 rounded-[48px] border border-zinc-100 shadow-sm">
        <h3 className="text-xl font-black text-zinc-900 italic uppercase tracking-tighter mb-10 flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-500" /> Linha do Tempo da Maleta
        </h3>

        <div className="relative pl-4 md:pl-8 border-l-2 border-zinc-100 space-y-12">
          {cycle.movements.map((mov, index) => {
            const isOriginal = mov.type === 'RETIRADA_ORIGINAL';
            const movTotal = mov.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            const movQty = mov.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div key={mov.id} className="relative">
                {/* Timeline Dot */}
                <div className={`absolute -left-[21px] md:-left-[37px] w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white ${isOriginal ? 'bg-blue-500 text-white' : 'bg-amber-400 text-zinc-900'}`}>
                  {isOriginal ? <Package className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>

                {/* Content Card */}
                <div className="ml-6 md:ml-10 bg-zinc-50 rounded-[32px] border border-zinc-100 overflow-hidden hover:border-zinc-300 transition-colors">
                  <div className="p-6 border-b border-zinc-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isOriginal ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isOriginal ? 'Retirada Original' : 'Aditivo'}
                        </span>
                        <span className="text-xs font-bold text-zinc-400">{formatDate(mov.date)}</span>
                      </div>
                      <h4 className="text-lg font-black text-zinc-900 tracking-tight">
                        {movQty} peças adicionadas
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Subtotal</p>
                      <p className="text-xl font-black text-zinc-900">{formatCurrency(movTotal)}</p>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col md:flex-row gap-6">
                    {/* Foto da Maleta */}
                    <div className="w-full md:w-48 shrink-0 space-y-2">
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-zinc-200 relative group">
                        <img src={mov.photoUrl} alt="Foto da Maleta" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest text-center">Registro Visual</p>
                    </div>

                    {/* Lista de Itens */}
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Itens Inclusos</p>
                      <div className="space-y-2">
                        {mov.items.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center text-[10px] font-black text-zinc-500">
                                {item.quantity}x
                              </div>
                              <div>
                                <p className="text-xs font-black text-zinc-900">{item.productName}</p>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{item.sku}</p>
                              </div>
                            </div>
                            <span className="text-xs font-black text-zinc-900">{formatCurrency(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default ConsignmentDashboard;
