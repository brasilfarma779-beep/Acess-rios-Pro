
import React, { useMemo } from 'react';
import { Representative, Product, Movement } from '../types';
import { getRepInventory, formatCurrency } from '../utils';

interface MaletaInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  rep: Representative;
  movements: Movement[];
  products: Product[];
  onAddJewel: (repId: string) => void;
  onDigitize: (repId: string) => void;
  onQuickSale: (repId: string) => void;
}

const MaletaInventoryModal: React.FC<MaletaInventoryModalProps> = ({ 
  isOpen, 
  onClose, 
  rep, 
  movements, 
  products,
  onAddJewel,
  onDigitize,
  onQuickSale
}) => {
  const inventory = useMemo(() => getRepInventory(movements, products, rep.id), [movements, products, rep.id]);
  const totalValue = inventory.reduce((acc, item) => acc + item.totalValue, 0);

  if (!isOpen) return null;

  const handleWhatsApp = () => {
    let message = `*CONTROLE DE MALETA - HUB SOBERANO*\n`;
    message += `*Vendedora:* ${rep.name}\n`;
    message += `*Data:* ${new Date().toLocaleDateString()}\n\n`;
    message += `*ITENS NA MALETA:*\n`;
    
    inventory.forEach(item => {
      message += `• ${item.productName} (${item.productCode})\n`;
      message += `  Qtd: ${item.quantity} | Un: ${formatCurrency(item.unitPrice)}\n`;
    });
    
    message += `\n*VALOR TOTAL: ${formatCurrency(totalValue)}*`;
    message += `\n\n_Por favor, confira os itens e qualquer divergência avise imediatamente._`;
    
    const encoded = encodeURIComponent(message);
    const phone = rep.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 leading-none italic uppercase tracking-tighter">Conteúdo da Maleta</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2 italic">{rep.name}</p>
          </div>
          <button onClick={onClose} className="p-3 text-zinc-400 hover:text-rose-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-6 rounded-[32px] text-white shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">Valor em Mãos</span>
              <span className="text-3xl font-black italic">{formatCurrency(totalValue)}</span>
            </div>
            <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total de Peças</span>
              <span className="text-3xl font-black text-zinc-900 italic">{inventory.reduce((acc, i) => acc + i.quantity, 0)} un.</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2 italic">Lista de Itens</h3>
            {inventory.length === 0 ? (
              <div className="py-12 text-center bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-100">
                <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] italic">Maleta Vazia</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {inventory.map(item => (
                  <div key={item.productId} className="flex justify-between items-center p-4 bg-white border border-zinc-100 rounded-2xl hover:border-emerald-500 transition-all group">
                    <div>
                      <h4 className="font-black text-zinc-800 uppercase text-sm">{item.productName}</h4>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Cód: {item.productCode} • {formatCurrency(item.unitPrice)}/un</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-black text-zinc-900 text-lg">{item.quantity} un.</span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{formatCurrency(item.totalValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => onDigitize(rep.id)}
              className="bg-zinc-900 text-white font-black py-5 rounded-[24px] shadow-xl flex flex-col items-center justify-center gap-1 hover:bg-black transition-all active:scale-95 text-[8px] uppercase tracking-widest"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Digitalizar
            </button>
            <button 
              onClick={() => onQuickSale(rep.id)}
              className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black py-5 rounded-[24px] shadow-sm flex flex-col items-center justify-center gap-1 hover:bg-emerald-100 transition-all active:scale-95 text-[8px] uppercase tracking-widest"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Venda Rápida
            </button>
            <button 
              onClick={() => onAddJewel(rep.id)}
              className="bg-emerald-500 text-zinc-900 font-black py-5 rounded-[24px] shadow-xl flex flex-col items-center justify-center gap-1 hover:bg-emerald-600 transition-all active:scale-95 text-[8px] uppercase tracking-widest"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              + Joia
            </button>
          </div>
          <button 
            onClick={handleWhatsApp}
            className="w-full bg-emerald-100 text-emerald-700 font-black py-5 rounded-[24px] flex items-center justify-center gap-2 hover:bg-emerald-200 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            Enviar Resumo para Vendedora
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaletaInventoryModal;
