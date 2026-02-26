
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Product, Representative, Movement } from '../types';
import { generateId, formatCurrency, resizeImage } from '../utils';

interface MaletaOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (movements: Movement[]) => void;
  reps: Representative[];
  products: Product[];
  targetRepId?: string;
}

interface ExtractedItem {
  id: string;
  productName: string;
  quantity: number;
  value: number;
  matchedProductId?: string;
}

const MaletaOCRModal: React.FC<MaletaOCRModalProps> = ({ isOpen, onClose, onImport, reps, products, targetRepId }) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [repId, setRepId] = useState(targetRepId || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep('upload');
    setExtractedItems([]);
    setCurrentImage(null);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('processing');

    try {
      const base64 = await resizeImage(file);
      setCurrentImage(`data:image/jpeg;base64,${base64}`);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64, mimeType: file.type } },
              { text: `Analise esta foto de uma maleta de semijoias ou uma lista de conferência.
                       Identifique todos os produtos e suas quantidades.
                       Para cada item, retorne:
                       - productName (nome ou código do produto)
                       - quantity (número inteiro)
                       - value (preço unitário estimado ou de catálogo)
                       
                       Produtos conhecidos no catálogo: ${products.map(p => `${p.name} (Cod:${p.code}, Preço:${p.price})`).join(', ')}
                       
                       Retorne APENAS um JSON puro no formato array de objetos.` }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                productName: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                value: { type: Type.NUMBER }
              }
            }
          }
        }
      });

      const rawData = JSON.parse(response.text || '[]');
      
      const mapped = rawData.map((item: any) => {
        const matchedProd = products.find(p => 
          p.name.toLowerCase().includes(item.productName?.toLowerCase() || '') ||
          (p.code && item.productName?.toLowerCase().includes(p.code.toLowerCase()))
        );

        return {
          id: generateId(),
          productName: item.productName || 'Desconhecido',
          quantity: item.quantity || 1,
          value: matchedProd?.price || item.value || 0,
          matchedProductId: matchedProd?.id
        };
      });

      setExtractedItems(mapped);
      setStep('review');
    } catch (error) {
      console.error(error);
      alert('Erro ao processar imagem.');
      setStep('upload');
    }
  };

  const handleConfirm = () => {
    if (!repId) return alert('Selecione uma vendedora');
    
    const movements: Movement[] = extractedItems.map(ei => ({
      id: generateId(),
      date: new Date().toISOString(),
      representativeId: repId,
      productId: ei.matchedProductId || '',
      type: 'Entregue',
      quantity: ei.quantity,
      value: ei.value,
      image: currentImage || undefined
    }));

    onImport(movements);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-xl">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 leading-none italic uppercase tracking-tighter">Digitalizar Maleta</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2 italic">IA Vision Scanner</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {step === 'upload' && (
            <div className="text-center space-y-8 py-10">
              <div className="w-24 h-24 bg-zinc-900 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-xl">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="text-xl font-black text-zinc-900 mb-2 uppercase italic">Montagem de Maleta</h3>
                <p className="text-zinc-500 font-medium text-sm">Tire uma foto da maleta aberta ou da lista de itens para registrar o estoque da vendedora.</p>
              </div>
              
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <button 
                  onClick={() => {
                    fileInputRef.current?.setAttribute('capture', 'environment');
                    fileInputRef.current?.click();
                  }}
                  className="bg-zinc-900 text-white font-black py-6 rounded-[24px] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase italic tracking-tighter"
                >
                  Tirar Foto da Maleta
                </button>
                <button 
                  onClick={() => {
                    fileInputRef.current?.removeAttribute('capture');
                    fileInputRef.current?.click();
                  }}
                  className="bg-zinc-100 text-zinc-600 font-black py-4 rounded-[24px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all uppercase text-[10px] tracking-widest"
                >
                  Escolher da Galeria
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*" className="hidden" />
            </div>
          )}

          {step === 'processing' && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 border-[6px] border-zinc-100 border-t-zinc-900 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-black text-zinc-800 uppercase italic">Analisando Maleta...</h3>
              <p className="text-zinc-500 font-medium">A IA está identificando cada joia e contando as peças.</p>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <div className="bg-zinc-50 p-6 rounded-[32px] border border-zinc-100">
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 italic">Vendedora Responsável</label>
                <select 
                  value={repId} 
                  onChange={e => setRepId(e.target.value)}
                  className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl font-black text-sm outline-none focus:border-zinc-900 transition-all"
                >
                  <option value="">Selecione a vendedora...</option>
                  {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2 italic">Itens Detectados ({extractedItems.length})</h3>
                {extractedItems.map((item, idx) => (
                  <div key={item.id} className="p-5 bg-white border-2 border-zinc-100 rounded-3xl">
                    <div className="flex justify-between items-start mb-4">
                      <input 
                        className="bg-zinc-50 border-none p-2 font-black text-zinc-800 focus:ring-0 w-full rounded-xl text-sm"
                        value={item.productName}
                        onChange={e => {
                          const newi = [...extractedItems];
                          newi[idx].productName = e.target.value;
                          setExtractedItems(newi);
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Vincular Produto</span>
                        <select 
                          className="w-full bg-zinc-50 border-none p-2 rounded-xl text-[10px] font-bold"
                          value={item.matchedProductId || ''}
                          onChange={e => {
                            const newi = [...extractedItems];
                            newi[idx].matchedProductId = e.target.value;
                            const p = products.find(x => x.id === e.target.value);
                            if (p) newi[idx].value = p.price;
                            setExtractedItems(newi);
                          }}
                        >
                          <option value="">Não vinculado</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Qtd</span>
                        <input 
                          className="w-full bg-zinc-50 border-none p-2 rounded-xl text-xs font-black text-zinc-800"
                          type="number"
                          value={item.quantity}
                          onChange={e => {
                            const newi = [...extractedItems];
                            newi[idx].quantity = parseInt(e.target.value) || 0;
                            setExtractedItems(newi);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 flex flex-col gap-3">
            <button 
              onClick={handleConfirm}
              className="w-full bg-zinc-900 text-white font-black py-5 rounded-[24px] shadow-xl hover:bg-black transition-all active:scale-95 uppercase italic tracking-tighter"
            >
              Confirmar e Entregar Maleta
            </button>
            <button 
              onClick={reset}
              className="w-full bg-white border border-zinc-200 text-zinc-400 font-black py-4 rounded-[24px] text-[10px] uppercase tracking-widest"
            >
              Recomeçar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaletaOCRModal;
