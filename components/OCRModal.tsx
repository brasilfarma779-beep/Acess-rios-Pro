
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
              { text: `Aja como um Desenvolvedor Senior Front-end. 
                       Estou te enviando prints/fotos de uma lista de estoque real (PDF) ou rascunho de fechamento (caderno).
                       Eu preciso popular meu banco de dados com esses produtos reais.
                       
                       TAREFA 1: Extração de Dados (OCR)
                       Analise as imagens e extraia TODOS os itens linha por linha.
                       Identifique: 
                       - Nome do Produto (Ex: 'Bracelete Cravejado')
                       - Preço/Valor (Ex: 'R$ 149,90' vira 149.90)
                       - Categoria (Brinco, Pulseira, Colar, Anel, Conjuntos, etc.)
                       - Código (Se houver código impresso ao lado)
                       
                       Retorne um array JSON pronto para importar. 
                       Formato: [{"name": string, "code": string, "price": number, "stock": number, "category": string}]
                       
                       As categorias permitidas são: ${Object.values(Category).join(', ')}.
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
        name: item.name || 'Produto Importado',
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
      alert('Erro ao processar imagem. Verifique se os dados estão bem nítidos e tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-10 text-center">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-black text-zinc-900 mb-2 italic">Módulo IA Vision</h2>
          <p className="text-zinc-500 mb-10 font-medium">Use a câmera para digitalizar PDFs de estoque ou rascunhos de cadernos de fechamento.</p>

          {isProcessing ? (
            <div className="py-12 flex flex-col items-center">
              <div className="w-20 h-20 border-[6px] border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
              <p className="text-emerald-600 font-black animate-pulse uppercase tracking-[0.2em] text-xs">A IA está decifrando os dados...</p>
              {previewUrl && <img src={previewUrl} className="mt-10 h-48 rounded-[32px] object-cover border-4 border-zinc-50 shadow-xl opacity-50 grayscale" />}
            </div>
          ) : (
            <div className="space-y-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 rounded-[28px] shadow-2xl shadow-emerald-100 transition-all text-xl flex items-center justify-center gap-4 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                DIGITALIZAR AGORA
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-zinc-100 text-zinc-400 font-black py-4 rounded-[28px] uppercase text-[10px] tracking-widest"
              >
                Voltar ao sistema
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
