
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
              { text: `Extraia os dados desta planilha de mercadorias/acessórios. 
                       Retorne um array JSON de objetos contendo:
                       - name (string: nome do produto)
                       - code (string: código se houver, ou vazio)
                       - price (number: valor numérico)
                       - stock (number: quantidade se houver, ou 0)
                       - category (string: deve ser um destes: ${Object.values(Category).join(', ')})
                       Tente mapear a categoria mais próxima baseada no nome se não estiver explícito.
                       Retorne APENAS o JSON puro.` }
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
        name: item.name || 'Produto s/ Nome',
        code: item.code || '',
        price: item.price || 0,
        stock: item.stock || 0,
        category: Object.values(Category).includes(item.category as Category) ? item.category as Category : Category.BRINCOS
      }));

      onImport(products);
      setPreviewUrl(null);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao processar imagem. Tente uma foto mais nítida.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-black text-zinc-900 mb-2">Digitalizar Planilha</h2>
          <p className="text-zinc-500 mb-8 font-medium">Tire uma foto ou envie a imagem da sua planilha manual e a IA fará o cadastro automático.</p>

          {isProcessing ? (
            <div className="py-12 flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
              <p className="text-emerald-600 font-black animate-pulse uppercase tracking-widest text-sm">Lendo sua planilha...</p>
              {previewUrl && <img src={previewUrl} className="mt-8 h-40 rounded-2xl object-cover opacity-50 grayscale" />}
            </div>
          ) : (
            <div className="space-y-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 rounded-3xl shadow-xl shadow-emerald-200 transition-all text-xl flex items-center justify-center gap-3 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                ESCOLHER FOTO
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 font-bold py-4 rounded-3xl transition-all"
              >
                CANCELAR
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
