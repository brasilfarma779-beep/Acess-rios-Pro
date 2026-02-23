
import React, { useState, useEffect, useRef } from 'react';
import { Category, Movement, MovementType, Representative, Product } from '../types';
// Fixed: Added missing formatCurrency to imports
import { generateId, fileToBase64, formatCurrency, resizeImage, validateProductImage } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mov: Movement) => void;
  reps: Representative[];
  products: Product[];
  editingMovement?: Movement | null;
  initialType?: MovementType;
  initialRepId?: string;
}

const MovementModal: React.FC<MovementModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  reps, 
  products,
  editingMovement = null,
  initialType = 'Vendido',
  initialRepId
}) => {
  const [repId, setRepId] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<MovementType>(initialType);
  const [quantity, setQuantity] = useState(1);
  const [unitValue, setUnitValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingMovement) {
        setRepId(editingMovement.representativeId);
        setProductId(editingMovement.productId);
        setType(editingMovement.type);
        setQuantity(editingMovement.quantity);
        setUnitValue(editingMovement.value.toString());
        setDate(editingMovement.date.split('T')[0]);
        setScanPreview(editingMovement.image || null);
      } else {
        setType(initialType);
        if (initialRepId) setRepId(initialRepId);
        else if (reps.length > 0) setRepId(reps[0].id);
        setProductId('');
        setUnitValue('');
        setQuantity(1);
        setDate(new Date().toISOString().split('T')[0]);
        setScanPreview(null);
        setSuggestions([]);
      }
    }
  }, [isOpen, editingMovement, initialType, initialRepId, reps]);

  if (!isOpen) return null;

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) setUnitValue(prod.price.toString());
    setSuggestions([]);
  };

  const handleSmartIdentify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (products.length === 0) return alert('Cadastre mercadorias no catálogo primeiro.');

    setIsScanning(true);
    setSuggestions([]);
    
    try {
      await validateProductImage(file);
      const base64Data = await resizeImage(file);
      setScanPreview(`data:image/jpeg;base64,${base64Data}`);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const simplifiedCatalog = products.map(p => ({
        id: p.id,
        nome: p.name,
        codigo: p.code,
        preco: p.price
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: `Você é um especialista em logística de semijoias.
                       Analise a imagem deste item que está sendo processado como ${type}.
                       Identifique qual produto do catálogo abaixo corresponde à imagem.

                       INSTRUÇÕES:
                       1. Analise o design, cor, pedras e formato do acessório.
                       2. Procure no catálogo o item que melhor descreve visualmente o que você vê.
                       3. Considere o código do produto se houver alguma etiqueta visível.

                       Catálogo: ${JSON.stringify(simplifiedCatalog)}
                       
                       Retorne um JSON estrito com:
                       - matchId: string (ID se tiver certeza absoluta)
                       - suggestionsIds: array (até 4 IDs similares se houver dúvida)
                       - reason: string (explicação da identificação)
                       
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
      
      if (result.matchId) {
        handleProductChange(result.matchId);
      } else if (result.suggestionsIds?.length > 0) {
        setSuggestions(products.filter(p => result.suggestionsIds.includes(p.id)));
      } else {
        alert('Não identifiquei este item no catálogo.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na identificação inteligente.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repId || !productId) return alert('Preencha vendedora e produto');

    onSave({
      id: editingMovement?.id || generateId(),
      date: new Date(date).toISOString(),
      representativeId: repId,
      productId,
      type,
      quantity,
      value: parseFloat(unitValue) || 0,
      image: scanPreview || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 leading-none italic uppercase tracking-tighter">{editingMovement ? 'Editar Ação' : 'Lançar Agora'}</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2 italic">{type}</p>
          </div>
          <button onClick={onClose} className="p-3 text-zinc-400 hover:text-rose-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          <div className="relative group mb-2">
            {scanPreview ? (
              <div className="relative w-full aspect-square rounded-[32px] overflow-hidden border-4 border-zinc-50 shadow-inner">
                <img src={scanPreview} className="w-full h-full object-cover" />
                {isScanning && (
                  <div className="absolute inset-0 bg-emerald-600/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
                    <span className="font-black text-[10px] uppercase tracking-widest">IA Analisando...</span>
                  </div>
                )}
                <button type="button" onClick={() => setScanPreview(null)} className="absolute top-4 right-4 p-2 bg-white/90 text-rose-500 rounded-xl shadow-lg">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }} 
                  className="py-8 border-4 border-dashed border-emerald-50 bg-emerald-50/30 rounded-[32px] flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Câmera</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }} 
                  className="py-8 border-4 border-dashed border-zinc-100 bg-zinc-50/30 rounded-[32px] flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-zinc-400 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                  </div>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Galeria</span>
                </button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleSmartIdentify} accept="image/*" className="hidden" />
          </div>

          {suggestions.length > 0 && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
               <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Sugeridos pela IA:</p>
               {suggestions.map(p => (
                 <button key={p.id} type="button" onClick={() => handleProductChange(p.id)} className="w-full flex justify-between p-3 bg-white rounded-xl border border-amber-200 text-left hover:border-emerald-500 transition-all">
                    <span className="text-xs font-black text-zinc-800">{p.name}</span>
                    {/* Fixed: formatCurrency is now imported */}
                    <span className="text-xs font-black text-emerald-600">{formatCurrency(p.price)}</span>
                 </button>
               ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {(['Vendido', 'Reposição', 'Entregue', 'Devolvido'] as MovementType[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${type === t ? 'bg-zinc-900 text-white shadow-xl' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}>{t}</button>
            ))}
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Vendedora</label>
              <select value={repId} onChange={e => setRepId(e.target.value)} required className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-xs outline-none focus:border-zinc-900 transition-all">
                {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Produto</label>
              <select value={productId} onChange={e => handleProductChange(e.target.value)} required className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-xs outline-none focus:border-zinc-900 transition-all">
                <option value="">Selecione ou use a câmera...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code || 'S/C'})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Quantidade</label>
                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-xs outline-none focus:border-zinc-900" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 italic">Valor Un. (R$)</label>
                <input type="text" value={unitValue} onChange={e => setUnitValue(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 text-xs outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-zinc-900 text-white font-black py-5 rounded-[24px] shadow-2xl mt-4 active:scale-95 transition-all text-xs uppercase tracking-widest">Finalizar Ação</button>
        </form>
      </div>
    </div>
  );
};

export default MovementModal;
