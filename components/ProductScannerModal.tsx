
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from '../types';
import { resizeImage, formatCurrency, validateProductImage } from '../utils';

interface ProductScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onUpdateProduct?: (p: Product) => void;
}

const ProductScannerModal: React.FC<ProductScannerModalProps> = ({ isOpen, onClose, products, onUpdateProduct }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [reason, setReason] = useState('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setFoundProduct(null);
    setSuggestions([]);
    setReason('');

    try {
      await validateProductImage(file);
      const base64Data = await resizeImage(file);
      setScanPreview(`data:image/jpeg;base64,${base64Data}`);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const simplifiedCatalog = products.map(p => ({
        id: p.id,
        nome: p.name,
        codigo: p.code,
        categoria: p.category,
        preco: p.price,
        estoque: p.stock
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
              { text: `Você é um scanner inteligente de catálogo de semijoias.
                       Analise a imagem e identifique qual produto do catálogo abaixo é o correspondente.
                       
                       Catálogo: ${JSON.stringify(simplifiedCatalog)}
                       
                       Retorne um JSON estrito com:
                       - matchId: string (ID se tiver certeza absoluta)
                       - suggestionsIds: array (até 4 IDs similares se houver dúvida)
                       - reason: string (motivo da escolha)
                       
                       Responda APENAS o JSON.` }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchId: { type: Type.STRING },
              suggestionsIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              reason: { type: Type.STRING }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      setReason(result.reason || '');

      if (result.matchId) {
        const prod = products.find(p => p.id === result.matchId);
        if (prod) setFoundProduct(prod);
      }
      
      if (result.suggestionsIds?.length > 0) {
        setSuggestions(products.filter(p => result.suggestionsIds.includes(p.id)));
      }

    } catch (error) {
      console.error(error);
      alert('Erro ao escanear produto.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSavePrice = () => {
    if (!foundProduct || !onUpdateProduct) return;
    const price = parseFloat(newPrice.replace(',', '.')) || 0;
    if (price <= 0) return alert('Preço inválido');
    
    const updated = { ...foundProduct, price };
    onUpdateProduct(updated);
    setFoundProduct(updated);
    setIsEditingPrice(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 leading-none italic uppercase tracking-tighter">Scanner de Produto</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2 italic">Identificação Visual</p>
          </div>
          <button onClick={onClose} className="p-3 text-zinc-400 hover:text-rose-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {!scanPreview ? (
            <div className="space-y-4">
              <button 
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
                className="w-full bg-emerald-500 text-zinc-900 font-black py-8 rounded-[32px] shadow-xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <span className="text-lg uppercase italic tracking-tighter">Tirar Foto Agora</span>
              </button>
              <button 
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="w-full bg-zinc-100 text-zinc-600 font-black py-4 rounded-[32px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all"
              >
                Escolher da Galeria
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative aspect-square rounded-[40px] overflow-hidden border-4 border-zinc-50 shadow-2xl">
                <img src={scanPreview} className="w-full h-full object-cover" alt="Scan" />
                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-600/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
                    <span className="font-black text-sm uppercase tracking-widest animate-pulse">Consultando Catálogo...</span>
                  </div>
                )}
                {!isScanning && (
                  <button 
                    onClick={() => { setScanPreview(null); setFoundProduct(null); setSuggestions([]); }}
                    className="absolute top-4 right-4 p-3 bg-white/90 text-rose-500 rounded-2xl shadow-lg"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              {foundProduct && (
                <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Produto Identificado</span>
                      <h3 className="text-2xl font-black text-zinc-900 leading-tight uppercase italic">{foundProduct.name}</h3>
                    </div>
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">100% Match</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/50 p-3 rounded-2xl relative group/price">
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Preço</span>
                      {isEditingPrice ? (
                        <div className="flex gap-2 mt-1">
                          <input 
                            autoFocus
                            type="text"
                            value={newPrice}
                            onChange={e => setNewPrice(e.target.value.replace(/[^0-9,.]/g, ''))}
                            className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-sm font-black text-emerald-700 outline-none"
                          />
                          <button onClick={handleSavePrice} className="bg-emerald-500 text-white p-1 rounded-lg">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-black text-emerald-700">{formatCurrency(foundProduct.price)}</span>
                          {onUpdateProduct && (
                            <button 
                              onClick={() => { setIsEditingPrice(true); setNewPrice(foundProduct.price.toString().replace('.', ',')); }}
                              className="p-1 text-emerald-400 hover:text-emerald-600 transition-colors"
                              title="Editar Preço"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="bg-white/50 p-3 rounded-2xl">
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Estoque</span>
                      <span className="text-lg font-black text-zinc-900">{foundProduct.stock} un.</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-800/60 font-medium italic">"{reason}"</p>
                </div>
              )}

              {suggestions.length > 0 && !foundProduct && !isScanning && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-2">Produtos Similares Encontrados:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestions.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { setFoundProduct(p); setSuggestions([]); }}
                        className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex justify-between items-center hover:border-emerald-500 transition-all text-left"
                      >
                        <div>
                          <span className="block font-black text-zinc-800 text-sm uppercase">{p.name}</span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{p.category} • {p.code || 'S/C'}</span>
                        </div>
                        <span className="font-black text-emerald-600">{formatCurrency(p.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isScanning && !foundProduct && suggestions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-zinc-400 font-black uppercase tracking-widest text-xs">Nenhum produto correspondente encontrado.</p>
                </div>
              )}
            </div>
          )}
          
          <input type="file" ref={fileInputRef} onChange={handleScan} accept="image/*" className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default ProductScannerModal;
