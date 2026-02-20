import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../utils';
import { Camera, Plus, CheckCircle, Clock, Package, Calendar, ArrowRight, Edit2, Trash2 } from 'lucide-react';

// Tipos baseados no schema do banco de dados
type ProductSnapshot = { id: string; name: string; price: number; photoUrl?: string };
type MovementItem = { id: string; product: ProductSnapshot; quantity: number };

type CycleMovement = {
  id: string;
  type: 'RETIRADA_ORIGINAL' | 'ADITIVO';
  date: string;
  proofPhotoUrl?: string;
  items: MovementItem[];
};

type ConsignmentCycle = {
  id: string;
  sellerName: string;
  startDate: string;
  dueDate: string;
  status: 'ABERTO' | 'ACERTADO' | 'ATRASADO';
  movements: CycleMovement[];
};

// Dados mockados para demonstração da estrutura
const MOCK_CYCLE: ConsignmentCycle = {
  id: 'cycle-123',
  sellerName: 'Maria Silva',
  startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 dias atrás
  dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // Faltam 45 dias (60 total)
  status: 'ABERTO',
  movements: [
    {
      id: 'mov-1',
      type: 'RETIRADA_ORIGINAL',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      proofPhotoUrl: 'https://picsum.photos/seed/maleta1/400/300',
      items: [
        { id: 'item-1', product: { id: 'p1', name: 'Colar Riviera Ouro', price: 150.0 }, quantity: 2 },
        { id: 'item-2', product: { id: 'p2', name: 'Brinco Argola M', price: 45.0 }, quantity: 5 },
      ]
    },
    {
      id: 'mov-2',
      type: 'ADITIVO',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      proofPhotoUrl: 'https://picsum.photos/seed/maleta2/400/300',
      items: [
        { id: 'item-3', product: { id: 'p3', name: 'Pulseira Elos', price: 80.0 }, quantity: 3 },
      ]
    }
  ]
};

const CycleManagement: React.FC = () => {
  const [cycle, setCycle] = useState<ConsignmentCycle>(MOCK_CYCLE);
  const [isAdditiveModalOpen, setIsAdditiveModalOpen] = useState(false);

  // Lógica de Estado: Somando o valor total (Retirada Original + Aditivos)
  const totalValue = useMemo(() => {
    return cycle.movements.reduce((total, mov) => {
      const movTotal = mov.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      return total + movTotal;
    }, 0);
  }, [cycle]);

  const totalItems = useMemo(() => {
    return cycle.movements.reduce((total, mov) => {
      return total + mov.items.reduce((sum, item) => sum + item.quantity, 0);
    }, 0);
  }, [cycle]);

  // Cálculo de dias restantes
  const daysRemaining = useMemo(() => {
    const due = new Date(cycle.dueDate).getTime();
    const now = new Date().getTime();
    const diff = due - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [cycle.dueDate]);

  const handleAddAdditive = () => {
    // Simulação de adição de um novo aditivo
    const newMovement: CycleMovement = {
      id: `mov-${Date.now()}`,
      type: 'ADITIVO',
      date: new Date().toISOString(),
      proofPhotoUrl: 'https://picsum.photos/seed/maleta3/400/300',
      items: [
        { id: `item-${Date.now()}`, product: { id: 'p4', name: 'Anel Solitário', price: 120.0 }, quantity: 1 }
      ]
    };
    
    setCycle(prev => ({
      ...prev,
      movements: [...prev.movements, newMovement]
    }));
    setIsAdditiveModalOpen(false);
  };

  const handleDeleteMovement = (movId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta movimentação?')) {
      setCycle(prev => ({
        ...prev,
        movements: prev.movements.filter(m => m.id !== movId)
      }));
    }
  };

  const handleEditMovement = (movId: string) => {
    alert(`Abrir modal de edição para a movimentação: ${movId}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* CABEÇALHO RESUMO */}
      <div className="bg-zinc-900 rounded-[48px] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                Ciclo {cycle.status}
              </span>
              <span className="text-zinc-400 text-xs font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Início: {new Date(cycle.startDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-1">{cycle.sellerName}</h2>
            <p className="text-zinc-400 text-sm font-medium">Gestão de Maleta e Aditivos</p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-[32px] p-6 border border-white/10 flex flex-col justify-center min-w-[140px]">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Prazo Final</span>
              </div>
              <p className="text-3xl font-black tracking-tighter">
                {daysRemaining} <span className="text-sm text-zinc-400 font-bold">dias</span>
              </p>
              <p className="text-[9px] text-zinc-500 uppercase font-bold mt-1">Vence em {new Date(cycle.dueDate).toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="bg-emerald-500 rounded-[32px] p-6 text-zinc-900 flex flex-col justify-center min-w-[180px] shadow-lg shadow-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total na Maleta</span>
              </div>
              <p className="text-3xl font-black tracking-tighter">{formatCurrency(totalValue)}</p>
              <p className="text-[10px] uppercase font-black opacity-70 mt-1">{totalItems} peças em campo</p>
            </div>
          </div>
        </div>
      </div>

      {/* AÇÕES PRINCIPAIS */}
      <div className="flex flex-col sm:flex-row gap-4 px-2">
        <button 
          onClick={() => setIsAdditiveModalOpen(true)}
          className="flex-1 bg-white border-2 border-zinc-100 hover:border-emerald-500 hover:shadow-lg text-zinc-900 p-6 rounded-[32px] flex items-center justify-center gap-3 transition-all group"
        >
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="block font-black uppercase italic tracking-tight text-lg leading-none">Adicionar Aditivo</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Bipar novas peças</span>
          </div>
        </button>

        <button className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white p-6 rounded-[32px] flex items-center justify-center gap-3 shadow-xl transition-all group">
          <div className="w-10 h-10 bg-white/10 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="block font-black uppercase italic tracking-tight text-lg leading-none">Acerto Final</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fechar ciclo de 60 dias</span>
          </div>
        </button>
      </div>

      {/* LINHA DO TEMPO VISUAL (TIMELINE) */}
      <div className="px-2">
        <h3 className="text-xl font-black text-zinc-900 italic uppercase tracking-tighter mb-8 flex items-center gap-2">
          Linha do Tempo da Maleta
        </h3>
        
        <div className="relative border-l-2 border-zinc-100 ml-6 space-y-12 pb-8">
          {cycle.movements.map((mov, index) => {
            const isOriginal = mov.type === 'RETIRADA_ORIGINAL';
            const movTotal = mov.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
            const movQty = mov.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <div key={mov.id} className="relative pl-10">
                {/* Timeline Dot */}
                <div className={`absolute -left-[17px] top-6 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${isOriginal ? 'bg-zinc-900' : 'bg-emerald-500'}`}>
                  {isOriginal ? <Package className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-white" />}
                </div>

                <div className="bg-white rounded-[40px] border border-zinc-100 p-8 shadow-sm hover:shadow-md transition-shadow relative">
                  
                  {/* Ações de Edição/Exclusão */}
                  <div className="absolute top-8 right-8 flex items-center gap-2">
                    <button onClick={() => handleEditMovement(mov.id)} className="p-2 text-zinc-300 hover:text-blue-500 transition-colors bg-zinc-50 hover:bg-blue-50 rounded-full">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteMovement(mov.id)} className="p-2 text-zinc-300 hover:text-rose-500 transition-colors bg-zinc-50 hover:bg-rose-50 rounded-full">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between gap-6 mb-6 pr-24">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isOriginal ? 'bg-zinc-100 text-zinc-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {isOriginal ? 'Retirada Original' : 'Aditivo'}
                        </span>
                        <span className="text-xs font-bold text-zinc-400">
                          {new Date(mov.date).toLocaleDateString('pt-BR')} às {new Date(mov.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-2xl font-black text-zinc-900 tracking-tighter">{formatCurrency(movTotal)}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{movQty} peças adicionadas</p>
                    </div>

                    {mov.proofPhotoUrl && (
                      <div className="relative group cursor-pointer shrink-0">
                        <img src={mov.proofPhotoUrl} alt="Comprovante" className="w-32 h-24 object-cover rounded-2xl border-2 border-zinc-100" />
                        <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lista de SKUs */}
                  <div className="bg-zinc-50 rounded-3xl p-6">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Itens Inclusos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {mov.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-zinc-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-100 rounded-xl flex items-center justify-center text-[10px] font-black text-zinc-500">
                              {item.quantity}x
                            </div>
                            <span className="text-xs font-bold text-zinc-700">{item.product.name}</span>
                          </div>
                          <span className="text-xs font-black text-zinc-900">{formatCurrency(item.product.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Simulado de Aditivo */}
      {isAdditiveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-xl">
          <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden p-8 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 italic uppercase tracking-tighter mb-2">Novo Aditivo</h2>
            <p className="text-sm text-zinc-500 font-medium mb-8">Bipe os produtos ou tire foto da nova maleta para adicionar ao ciclo atual de 60 dias.</p>
            
            <div className="flex gap-4">
              <button onClick={() => setIsAdditiveModalOpen(false)} className="flex-1 py-4 rounded-3xl font-black text-xs uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-colors">Cancelar</button>
              <button onClick={handleAddAdditive} className="flex-1 py-4 rounded-3xl font-black text-xs uppercase tracking-widest bg-emerald-500 text-zinc-900 shadow-xl active:scale-95 transition-all">Simular Bipagem</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CycleManagement;
