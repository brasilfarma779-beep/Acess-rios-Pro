import React, { useState, useRef } from 'react';
import { Camera, Upload, Send, CheckCircle, Package, X, Image as ImageIcon } from 'lucide-react';
import { formatCurrency } from '../utils';

interface ExpeditionPanelProps {
  sellerName: string;
  sellerPhone: string;
  items: { name: string; quantity: number; price: number }[];
  onComplete: (photoUrl: string) => void;
  onCancel: () => void;
}

const ExpeditionPanel: React.FC<ExpeditionPanelProps> = ({ 
  sellerName, 
  sellerPhone, 
  items, 
  onComplete, 
  onCancel 
}) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinalize = async () => {
    if (!photo) return;
    
    setIsUploading(true);
    
    // Simulação de upload para Storage (S3/Firebase)
    // Em um cenário real, aqui faríamos o POST para o serviço de storage
    setTimeout(() => {
      setIsUploading(false);
      setIsFinished(true);
      
      // Simulando a URL pública gerada pelo storage
      const mockPublicUrl = `https://storage.hubsoberano.com/maletas/expedition-${Date.now()}.jpg`;
      
      setTimeout(() => {
        onComplete(mockPublicUrl);
      }, 2000);
    }, 1500);
  };

  if (isFinished) {
    return (
      <div className="bg-white rounded-[48px] p-12 text-center animate-in zoom-in duration-500 shadow-2xl border border-emerald-100">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter mb-4">Expedição Concluída!</h2>
        <p className="text-zinc-500 font-medium mb-8">
          O recibo detalhado e a foto de conferência foram enviados para o WhatsApp de <strong>{sellerName}</strong>.
        </p>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 mb-8">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Próximo Passo</p>
          <p className="text-sm font-bold text-emerald-800">Aguardar o acerto em 60 dias.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[48px] shadow-2xl overflow-hidden border border-zinc-100 animate-in slide-in-from-bottom-8 duration-500">
      <div className="p-8 md:p-12">
        <div className="flex justify-between items-start mb-10">
          <div>
            <span className="bg-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 inline-block">
              Expedição de Maleta
            </span>
            <h2 className="text-4xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">
              Conferência Final
            </h2>
            <p className="text-zinc-400 font-bold mt-2 uppercase text-xs tracking-widest">
              Vendedora: <span className="text-zinc-900">{sellerName}</span>
            </p>
          </div>
          <button onClick={onCancel} className="p-3 bg-zinc-50 text-zinc-400 hover:text-zinc-900 rounded-2xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Lado Esquerdo: Resumo */}
          <div className="space-y-8">
            <div className="bg-zinc-50 rounded-[32px] p-8 border border-zinc-100">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Package className="w-4 h-4" /> Conteúdo da Maleta
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-zinc-200 last:border-0">
                    <div>
                      <p className="text-sm font-black text-zinc-900 uppercase italic">{item.name}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">{item.quantity} unidades</p>
                    </div>
                    <p className="text-sm font-black text-zinc-900">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t-2 border-zinc-200 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor Total</p>
                  <p className="text-3xl font-black text-zinc-900 tracking-tighter">{formatCurrency(totalValue)}</p>
                </div>
                <p className="text-xs font-black text-zinc-400 uppercase italic">{totalQuantity} peças</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Atenção</p>
              <p className="text-xs font-bold text-amber-800 leading-relaxed">
                Ao finalizar, o sistema calculará automaticamente o prazo de 60 dias e enviará o recibo para o WhatsApp cadastrado.
              </p>
            </div>
          </div>

          {/* Lado Direito: Captura de Foto */}
          <div className="flex flex-col h-full">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Camera className="w-4 h-4" /> Foto de Conferência
            </h3>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 min-h-[300px] rounded-[40px] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group
                ${photo ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-100 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100'}`}
            >
              {photo ? (
                <>
                  <img src={photo} alt="Maleta" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white">
                      <RefreshCw className="w-8 h-8" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4 text-zinc-300 group-hover:text-zinc-500 transition-colors">
                    <Camera className="w-10 h-10" />
                  </div>
                  <p className="text-lg font-black text-zinc-900 uppercase italic tracking-tight">Tirar Foto da Maleta</p>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">Ou clique para fazer upload</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                capture="environment"
                className="hidden" 
              />
            </div>

            <button
              onClick={handleFinalize}
              disabled={!photo || isUploading}
              className={`mt-8 w-full py-6 rounded-[32px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95
                ${photo && !isUploading 
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800' 
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'}`}
            >
              {isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin"></div>
                  Processando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Finalizar e Enviar para Vendedora
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for Refresh icon since it's not imported
const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default ExpeditionPanel;
