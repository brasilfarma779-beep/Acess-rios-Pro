
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Product } from '../types';
import { fileToBase64, generateId, resizeImage } from '../utils';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: Product[]) => void;
}

const OCRModal: React.FC<OCRModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<Product[]>([]);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setIsProcessing(true);

    try {
      const base64Data = await resizeImage(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: `Você é um scanner de precisão para joalheria. 
                       Analise a foto da etiqueta ou da peça de semijoia. 
                       Extraia os dados técnicos da peça:
                       
                       - name: Nome amigável (Ex: Brinco Argola G)
                       - code: SKU ou Código que aparece na etiqueta (Ex: BG-01)
                       - price: O valor em R$ (apenas números, Ex: 89.90)
                       - category: Selecione a mais adequada entre: [Brincos, Conjuntos, Duplas e Trios, Pulseiras e Colares, Anéis]
                       - stock: Se não houver informação, use 10 por padrão.
                       
                       Retorne um ARRAY JSON. Se houver mais de uma peça na foto, liste todas.
                       Responda apenas com o JSON.` }
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
                name: { type: Type.STRING },
                code: { type: Type.STRING },
                price: { type: Type.NUMBER },
                stock: { type: Type.NUMBER },
                category: { type: Type.STRING }
              },
              required: ["name", "price", "category"]
            }
          }
        }
      });

      const extractedData = JSON.parse(response.text || '[]');
      const products: Product[] = extractedData.map((item: any) => ({
        id: generateId(),
        name: item.name || 'Semijoia Importada',
        code: item.code || `SKU-${generateId().toUpperCase().substring(0,4)}`,
        price: item.price || 0,
        stock: item.stock || 10,
        category: Object.values(Category).includes(item.category as Category) ? item.category as Category : Category.BRINCOS
      }));

      setExtractedProducts(products);
      setStep('review');
    } catch (error) {
      console.error(error);
      alert('A IA não conseguiu ler nitidamente. Tente tirar a foto com mais luz ou selecione um item por vez.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    onImport(extractedProducts);
    setPreviewUrl(null);
    setStep('upload');
    setExtractedProducts([]);
    onClose();
    alert(`${extractedProducts.length} itens salvos no catálogo!`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/90 backdrop-blur-xl">
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 leading-none italic uppercase tracking-tighter">Scanner IA vision</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-2 italic">Cadastro via Foto</p>
          </div>
          <button onClick={onClose} className="p-3 text-zinc-400 hover:text-rose-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {step === 'upload' ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-black text-zinc-900 mb-2 italic uppercase tracking-tighter">Scanner IA vision</h2>
              <p className="text-zinc-500 mb-10 font-medium px-4">Aponte para as etiquetas das peças ou para o código de barras para cadastrar no estoque instantaneamente.</p>

              {isProcessing ? (
                <div className="py-12 flex flex-col items-center">
                  <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
                  <p className="text-emerald-600 font-black animate-pulse uppercase tracking-widest text-xs">A IA está lendo as etiquetas...</p>
                  {previewUrl && <img src={previewUrl} className="mt-8 h-40 rounded-3xl object-cover border-4 border-zinc-50 shadow-xl opacity-50" />}
                </div>
              ) : (
                <div className="space-y-4">
                  <button 
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                      }
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-900 font-black py-6 rounded-[28px] shadow-xl transition-all text-xl flex items-center justify-center gap-4 active:scale-95"
                  >
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    ABRIR CÂMERA
                  </button>
                  <button 
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute('capture');
                        fileInputRef.current.click();
                      }
                    }}
                    className="w-full bg-zinc-100 text-zinc-600 font-black py-4 rounded-[28px] flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all"
                  >
                    ESCOLHER DA GALERIA
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-100">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <p className="text-emerald-800 text-sm font-black uppercase leading-tight">Revise os itens encontrados:</p>
              </div>

              <div className="space-y-3">
                {extractedProducts.map((prod, idx) => (
                  <div key={prod.id} className="p-5 bg-white border-2 border-zinc-100 rounded-3xl">
                    <div className="flex justify-between items-start mb-4">
                      <input 
                        className="bg-zinc-50 border-none p-1 font-black text-zinc-800 focus:ring-0 w-full rounded-lg"
                        value={prod.name}
                        onChange={e => {
                          const newp = [...extractedProducts];
                          newp[idx].name = e.target.value;
                          setExtractedProducts(newp);
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Código</span>
                        <input 
                          className="w-full bg-zinc-50 border-none p-2 rounded-xl text-xs font-bold uppercase"
                          value={prod.code}
                          onChange={e => {
                            const newp = [...extractedProducts];
                            newp[idx].code = e.target.value;
                            setExtractedProducts(newp);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Estoque</span>
                          <input 
                            className="w-full bg-zinc-50 border-none p-2 rounded-xl text-xs font-black text-zinc-800"
                            type="number"
                            value={prod.stock}
                            onChange={e => {
                              const newp = [...extractedProducts];
                              newp[idx].stock = parseInt(e.target.value) || 0;
                              setExtractedProducts(newp);
                            }}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-zinc-400 uppercase ml-1">Preço</span>
                          <input 
                            className="w-full bg-emerald-50 border-none p-2 rounded-xl text-xs font-black text-emerald-700"
                            type="number"
                            value={prod.price}
                            onChange={e => {
                              const newp = [...extractedProducts];
                              newp[idx].price = parseFloat(e.target.value) || 0;
                              setExtractedProducts(newp);
                            }}
                          />
                        </div>
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
              className="w-full bg-emerald-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
            >
              CADASTRAR TODOS NO CATÁLOGO
            </button>
            <button 
              onClick={() => { setStep('upload'); setExtractedProducts([]); }}
              className="w-full bg-white border border-zinc-200 text-zinc-400 font-black py-4 rounded-[24px] text-[10px] uppercase tracking-widest"
            >
              Tirar Outra Foto
            </button>
          </div>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>
    </div>
  );
};

export default OCRModal;
