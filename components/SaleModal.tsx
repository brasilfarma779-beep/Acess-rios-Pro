
import React, { useState, useEffect, useRef } from 'react';
import { Category, Sale, Representative, Product, SaleStatus } from '../types';
import { generateId, fileToBase64 } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: Sale) => void;
  reps: Representative[];
  products: Product[];
}

const SaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, onSave, reps, products }) => {
  const [client, setClient] = useState('');
  const [repId, setRepId] = useState('');
  const [productId, setProductId] = useState('');
  const [category, setCategory] = useState<Category>(Category.BRINCOS);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<SaleStatus>('Vendida');
  
  // Estados da Inteligência Artificial
  const [isScanning, setIsScanning] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (reps.length > 0 && !repId) {
      const activeRep = reps.find(r => r.active);
      setRepId(activeRep?.id || reps[0].id);
    }
  }, [reps, isOpen]);

  if (!isOpen) return null;

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setValue(prod.price.toString().replace('.', ','));
      setCategory(prod.category);
    }
    setSuggestions([]);
    setScanPreview(null);
  };

  const handleSmartIdentify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (products.length === 0) {
      alert('Seu catálogo está vazio. Cadastre mercadorias primeiro para que a IA possa identificá-las.');
      return;
    }

    setIsScanning(true);
    setSuggestions([]);
    setScanPreview(URL.createObjectURL(file));

    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Enviamos apenas o necessário do catálogo para economizar tokens e ser mais rápido
      const simplifiedCatalog = products.map(p => ({
        id: p.id,
        nome: p.name,
        codigo: p.code,
        categoria: p.category,
        preco: p.price
      }));

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite-latest",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: `Você é um assistente de vendas de uma loja de acessórios. 
                       Analise a foto deste acessório e identifique qual produto do catálogo abaixo é o MAIS provável de ser o da imagem.
                       
                       Catálogo Disponível:
                       ${JSON.stringify(simplifiedCatalog)}
                       
                       Retorne um JSON com:
                       - matchId: string (o ID do produto se tiver 90% ou mais de certeza)
                       - suggestionsIds: array de strings (lista de até 3 IDs se houver dúvida ou similaridade)
                       - reason: string (breve motivo da escolha)
                       
                       Responda apenas com o JSON.` }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchId: { type: Type.STRING, nullable: true },
              suggestionsIds: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              reason: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      if (result.matchId) {
        handleProductChange(result.matchId);
      } else if (result.suggestionsIds && result.suggestionsIds.length > 0) {
        const found = products.filter(p => result.suggestionsIds.includes(p.id));
        setSuggestions(found);
      } else {
        alert('Não consegui identificar este acessório no seu catálogo atual. Tente selecionar manualmente.');
      }

    } catch (error) {
      console.error('IA Error:', error);
      alert('Houve um problema ao conectar com a IA. Por favor, selecione o produto na lista.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saleValue = parseFloat(value.replace(',', '.'));
    
    if (!repId) return alert('Selecione uma vendedora.');
    if (!productId) return alert('Selecione o produto vendido.');
    if (isNaN(saleValue) || saleValue <= 0) return alert('Insira um valor de venda válido.');

    onSave({
      id: generateId(),
      date: new Date().toISOString(),
      representativeId: repId,
      productId,
      client: client || 'Cliente Avulso',
      category,
      value: saleValue,
      status
    });
    
    // Reset e Fechar
    setClient('');
    setProductId('');
    setValue('');
    setSuggestions([]);
    setScanPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-xl font-black text-zinc-900 leading-none">Venda Rápida</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Lançamento com IA</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Área de Câmera Inteligente */}
          <div className="relative group">
            {scanPreview ? (
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-lg mb-2">
                <img src={scanPreview} className="w-full h-full object-cover" alt="Preview da Venda" />
                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-600/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <span className="font-black text-xs uppercase tracking-widest">Identificando...</span>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => { setScanPreview(null); setSuggestions([]); }}
                  className="absolute top-3 right-3 p-2 bg-white/90 text-rose-500 rounded-xl shadow-md hover:bg-white transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
            ) : (
              <button 
                type="button"
                disabled={isScanning || products.length === 0}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 rounded-[32px] border-4 border-dashed border-emerald-100 bg-emerald-50/30 flex flex-col items-center justify-center gap-3 transition-all hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.98] group"
              >
                <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-200 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <span className="block font-black text-emerald-800 text-sm uppercase tracking-tight">Câmera Inteligente</span>
                  <span className="text-[10px] text-emerald-600 font-bold opacity-60">Toque para reconhecer produto</span>
                </div>
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleSmartIdentify} 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
            />
          </div>

          {/* Sugestões de produtos encontrados pela IA */}
          {suggestions.length > 0 && (
            <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                Vários produtos parecidos encontrados:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProductChange(p.id)}
                    className="flex items-center justify-between p-4 bg-amber-50/50 border border-amber-100 rounded-2xl hover:bg-white hover:border-emerald-500 hover:shadow-lg transition-all text-left"
                  >
                    <div>
                      <span className="block font-black text-zinc-800 text-sm leading-tight">{p.name}</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{p.category} • {p.code || 'S/C'}</span>
                    </div>
                    <span className="font-black text-emerald-600 text-sm">R$ {p.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formulário Manual / Ajuste */}
          <div className="pt-2 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 ml-1">Vendedora Responsável</label>
              <select 
                value={repId} 
                onChange={e => setRepId(e.target.value)} 
                required 
                className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-zinc-700 font-black focus:border-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                {reps.map(r => (
                  <option key={r.id} value={r.id}>{r.name} {!r.active ? '(Inativa)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 ml-1">Produto Vendido</label>
              <select 
                value={productId} 
                onChange={e => handleProductChange(e.target.value)} 
                required 
                className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl text-zinc-700 font-black focus:border-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="">{products.length === 0 ? 'Catálogo Vazio' : 'Selecione ou use a câmera'}</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 ml-1">Valor Venda (R$)</label>
                <input 
                  type="text" 
                  value={value} 
                  onChange={e => setValue(e.target.value.replace(/[^0-9,.]/g, ''))} 
                  required 
                  className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 text-xl focus:border-emerald-500 focus:bg-white transition-all"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 ml-1">Status Entrega</label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value as SaleStatus)} 
                  className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-zinc-700 focus:border-emerald-500 focus:bg-white transition-all"
                >
                  <option value="Vendida">Concluída</option>
                  <option value="Não Vendida">Pendente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 ml-1">Identificação do Cliente</label>
              <input 
                type="text" 
                value={client} 
                onChange={e => setClient(e.target.value)} 
                placeholder="Nome ou observação" 
                className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-medium text-zinc-700 focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-200 transition-all text-lg active:scale-95 flex items-center justify-center gap-2 group"
          >
            CONFIRMAR VENDA AGORA
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default SaleModal;
