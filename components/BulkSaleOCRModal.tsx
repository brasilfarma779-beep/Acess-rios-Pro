
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Sale, Product, Representative, SaleStatus } from '../types';
import { fileToBase64, generateId, formatCurrency, resizeImage } from '../utils';

interface BulkSaleOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sales: Sale[]) => void;
  reps: Representative[];
  products: Product[];
}

interface ExtractedSale {
  id: string;
  date: string;
  client: string;
  productName: string;
  quantity: number;
  value: number;
  repName: string;
  category: Category;
  matchedProductId?: string;
  matchedRepId?: string;
}

const BulkSaleOCRModal: React.FC<BulkSaleOCRModalProps> = ({ isOpen, onClose, onImport, reps, products }) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [extractedSales, setExtractedSales] = useState<ExtractedSale[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep('upload');
    setExtractedSales([]);
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
              { text: `Analise esta planilha física ou anotação de vendas. 
                       Extraia todas as linhas de venda identificadas.
                       Para cada venda, retorne:
                       - date (ISO string se detectada, senão hoje)
                       - client (nome do cliente ou 'Cliente')
                       - productName (nome ou código do produto)
                       - quantity (número inteiro, padrão 1)
                       - value (número decimal, preço unitário)
                       - repName (nome da vendedora se houver)
                       - category (uma das: ${Object.values(Category).join(', ')})
                       
                       Tente mapear os produtos e vendedoras para estes nomes conhecidos:
                       Vendedoras: ${reps.map(r => r.name).join(', ')}
                       Produtos: ${products.map(p => `${p.name} (Cod:${p.code})`).join(', ')}
                       
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
                date: { type: Type.STRING },
                client: { type: Type.STRING },
                productName: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                value: { type: Type.NUMBER },
                repName: { type: Type.STRING },
                category: { type: Type.STRING }
              }
            }
          }
        }
      });

      const rawData = JSON.parse(response.text || '[]');
      
      // Inteligência de Matching
      const mapped = rawData.map((item: any) => {
        const matchedRep = reps.find(r => r.name.toLowerCase().includes(item.repName?.toLowerCase() || ''));
        const matchedProd = products.find(p => 
          p.name.toLowerCase().includes(item.productName?.toLowerCase() || '') ||
          (p.code && item.productName?.toLowerCase().includes(p.code.toLowerCase()))
        );

        return {
          id: generateId(),
          date: item.date || new Date().toISOString(),
          client: item.client || 'Cliente',
          productName: item.productName || 'Desconhecido',
          quantity: item.quantity || 1,
          value: item.value || 0,
          repName: item.repName || '',
          category: Object.values(Category).includes(item.category as Category) ? item.category as Category : Category.BRINCOS,
          matchedProductId: matchedProd?.id,
          matchedRepId: matchedRep?.id
        };
      });

      setExtractedSales(mapped);
      setStep('review');
    } catch (error) {
      console.error(error);
      alert('Erro ao processar imagem. Verifique a iluminação e tente novamente.');
      setStep('upload');
    }
  };

  const handleConfirm = () => {
    const finalSales: Sale[] = extractedSales.map(es => ({
      id: generateId(),
      date: es.date,
      representativeId: es.matchedRepId || (reps[0]?.id || ''),
      productId: es.matchedProductId || '',
      client: es.client,
      category: es.category,
      quantity: es.quantity,
      value: es.value,
      status: 'Vendida' as SaleStatus,
      image: currentImage || undefined
    }));

    onImport(finalSales);
    reset();
    onClose();
  };

  const handleWhatsApp = () => {
    const total = extractedSales.reduce((acc, s) => acc + (s.value * (s.quantity || 1)), 0);
    let message = `*Resumo da Maleta - HUB SOBERANO*\n\n`;
    
    extractedSales.forEach(s => {
      message += `• ${s.productName}\n`;
      message += `  Qtd: ${s.quantity || 1} | Un: ${formatCurrency(s.value)}\n`;
    });
    
    message += `\n*TOTAL: ${formatCurrency(total)}*`;
    
    const encoded = encodeURIComponent(message);
    const firstRepId = extractedSales.find(s => s.matchedRepId)?.matchedRepId;
    const rep = reps.find(r => r.id === firstRepId);
    const phone = rep?.phone.replace(/\D/g, '') || '';
    
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-xl">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 leading-none">Digitalizar Vendas</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Inteligência Artificial Vision</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 'upload' && (
            <div className="text-center space-y-8 py-10">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="text-xl font-black text-zinc-900 mb-2">Planilha Física?</h3>
                <p className="text-zinc-500 font-medium text-sm">A IA vai ler suas anotações manuais e converter em vendas digitais automaticamente.</p>
              </div>
              
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                <button 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="bg-emerald-600 text-white font-black py-6 rounded-[24px] shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  TIRAR FOTO AGORA
                </button>
                <button 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="bg-zinc-100 text-zinc-600 font-black py-4 rounded-[24px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all"
                >
                  ESCOLHER DA GALERIA
                </button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*" className="hidden" />
            </div>
          )}

          {step === 'processing' && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 border-[6px] border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
              </div>
              <h3 className="text-xl font-black text-zinc-800 uppercase tracking-tight">Processando sua imagem</h3>
              <p className="text-zinc-500 font-medium">Extraindo dados, preços e vendedoras...</p>
              {currentImage && <img src={currentImage} className="mt-10 h-48 rounded-[32px] object-cover border-4 border-zinc-100 shadow-xl opacity-50 grayscale" />}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-100">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <p className="text-emerald-800 text-sm font-black uppercase leading-tight">Encontramos {extractedSales.length} registros de venda. Revise abaixo:</p>
              </div>

              <div className="space-y-3">
                {extractedSales.map((sale, idx) => (
                  <div key={sale.id} className="p-5 bg-white border-2 border-zinc-100 rounded-3xl hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <input 
                        className="bg-zinc-50 border-none p-1 font-black text-zinc-800 focus:ring-0 w-2/3 rounded-lg"
                        value={sale.client}
                        onChange={e => {
                          const news = [...extractedSales];
                          news[idx].client = e.target.value;
                          setExtractedSales(news);
                        }}
                      />
                      <button 
                        onClick={() => setExtractedSales(prev => prev.filter(s => s.id !== sale.id))}
                        className="text-zinc-300 hover:text-rose-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Vendedora</span>
                        <select 
                          className="w-full bg-zinc-50 border-none p-2 rounded-xl text-xs font-bold"
                          value={sale.matchedRepId || ''}
                          onChange={e => {
                            const news = [...extractedSales];
                            news[idx].matchedRepId = e.target.value;
                            setExtractedSales(news);
                          }}
                        >
                          <option value="">Manual: {sale.repName}</option>
                          {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Qtd</span>
                          <input 
                            className="w-full bg-zinc-50 border-none p-2 rounded-xl text-xs font-black text-zinc-800"
                            type="number"
                            value={sale.quantity}
                            onChange={e => {
                              const news = [...extractedSales];
                              news[idx].quantity = parseInt(e.target.value) || 0;
                              setExtractedSales(news);
                            }}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Valor Un.</span>
                          <input 
                            className="w-full bg-emerald-50 border-none p-2 rounded-xl text-xs font-black text-emerald-700"
                            type="number"
                            value={sale.value}
                            onChange={e => {
                              const news = [...extractedSales];
                              news[idx].value = parseFloat(e.target.value) || 0;
                              setExtractedSales(news);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Produto Detectado</span>
                      <select 
                        className="w-full bg-zinc-50 border-none p-2 rounded-xl text-xs font-medium"
                        value={sale.matchedProductId || ''}
                        onChange={e => {
                          const news = [...extractedSales];
                          news[idx].matchedProductId = e.target.value;
                          setExtractedSales(news);
                        }}
                      >
                        <option value="">{sale.productName}</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="p-8 border-t border-zinc-100 bg-zinc-50/50 flex flex-col gap-4">
            <div className="flex gap-4">
              <button 
                onClick={reset}
                className="flex-1 bg-white border border-zinc-200 text-zinc-600 font-black py-4 rounded-[24px] hover:bg-zinc-100 transition-all"
              >
                FOTOGRAFAR NOVAMENTE
              </button>
              <button 
                onClick={handleWhatsApp}
                className="flex-1 bg-emerald-100 text-emerald-700 font-black py-4 rounded-[24px] flex items-center justify-center gap-2 hover:bg-emerald-200 transition-all"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                ENVIAR RESUMO
              </button>
            </div>
            <button 
              onClick={handleConfirm}
              className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
            >
              SALVAR TODAS VENDAS
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkSaleOCRModal;
