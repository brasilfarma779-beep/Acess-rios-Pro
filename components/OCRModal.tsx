
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Category, Product } from '../types';
import { fileToBase64, generateId } from '../utils';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: Product[]) => void;
}

const OCRModal: React.FC<OCRModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setIsProcessing(true);

    try {
      const base64Data = await fileToBase64(file);
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

      onImport(products);
      setPreviewUrl(null);
      onClose();
      alert(`${products.length} itens identificados e salvos no catálogo!`);
    } catch (error) {
      console.error(error);
      alert('A IA não conseguiu ler nitidamente. Tente tirar a foto com mais luz ou selecione um item por vez.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/90 backdrop-blur-xl">
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-10 text-center">
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
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-900 font-black py-6 rounded-[28px] shadow-xl transition-all text-xl flex items-center justify-center gap-4 active:scale-95"
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                ABRIR CÂMERA
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-zinc-100 text-zinc-400 font-black py-4 rounded-[28px] uppercase text-[10px] tracking-widest hover:bg-zinc-200"
              >
                Cancelar
              </button>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
            capture="environment"
          />
        </div>
      </div>
    </div>
  );
};

export default OCRModal;
