
import React, { useState, useEffect, useRef } from 'react';
import { Category, Movement, MovementType, Representative, Product } from '../types';
import { generateId, fileToBase64 } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mov: Movement) => void;
  reps: Representative[];
  products: Product[];
  initialType?: MovementType;
  initialRepId?: string;
  autoOpenScanner?: boolean;
}

const MovementModal: React.FC<MovementModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  reps, 
  products,
  initialType = 'Vendido',
  initialRepId,
  autoOpenScanner = false
}) => {
  const [repId, setRepId] = useState('');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<MovementType>(initialType);
  const [quantity, setQuantity] = useState(1);
  const [unitValue, setUnitValue] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      if (initialRepId) setRepId(initialRepId);
      else if (reps.length > 0 && !repId) setRepId(reps[0].id);
      
      setProductId('');
      setUnitValue('');
      setQuantity(1);
      setScanPreview(null);

      // Shortcut para digitalizar imediatamente se solicitado
      if (autoOpenScanner) {
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 100);
      }
    }
  }, [isOpen, initialType, initialRepId, reps, autoOpenScanner]);

  if (!isOpen) return null;

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) setUnitValue(prod.price.toString());
  };

  const handleSmartIdentify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || products.length === 0) return;

    setIsScanning(true);
    setScanPreview(URL.createObjectURL(file));

    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const simplifiedCatalog = products.map(p => ({ id: p.id, nome: p.name, codigo: p.code, preco: p.price }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: `Identifique este acessório no catálogo: ${JSON.stringify(simplifiedCatalog)}. Retorne JSON: {"matchId": "id" ou null}. Contexto da ação: ${type}` }
          ]
        }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchId: { type: Type.STRING, nullable: true }
            }
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.matchId) handleProductChange(result.matchId);
      else alert('Não identificado automaticamente. Selecione na lista.');
    } catch (error) {
      console.error(error);
      alert('Erro na conexão com a IA.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repId || !productId) return alert('Preencha vendedora e produto');

    onSave({
      id: generateId(),
      date: new Date().toISOString(),
      representativeId: repId,
      productId,
      type,
      quantity,
      value: parseFloat(unitValue) || 0,
      image: scanPreview || undefined
    });
    setScanPreview(null);
    onClose();
  };

  const showCamera = type === 'Vendido' || type === 'Reposição' || type === 'Entregue';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
          <div>
            <h2 className="text-xl font-black text-zinc-900 leading-none">Movimentação</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1 italic">{type}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {showCamera && (
            <div className="relative group">
              {scanPreview ? (
                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-emerald-500 mb-2">
                  <img src={scanPreview} className="w-full h-full object-cover" alt="Preview" />
                  {isScanning && (
                    <div className="absolute inset-0 bg-emerald-600/40 flex items-center justify-center text-white">
                      <div className="animate-spin h-8 w-8 border-4 border-white/30 border-t-white rounded-full" />
                    </div>
                  )}
                  <button type="button" onClick={() => setScanPreview(null)} className="absolute top-2 right-2 bg-white p-1 rounded-full text-rose-500 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-4 border-dashed border-emerald-100 bg-emerald-50/30 rounded-3xl flex flex-col items-center gap-2 hover:bg-emerald-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <span className="font-black text-emerald-800 text-[10px] uppercase tracking-widest">Digitalizar Peça</span>
                </button>
              )}
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleSmartIdentify} accept="image/*" capture="environment" className="hidden" />

          <div>
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Ação</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Entregue', 'Vendido', 'Devolvido', 'Reposição'] as MovementType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${type === t ? 'bg-zinc-800 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Vendedora</label>
              <select value={repId} onChange={e => setRepId(e.target.value)} required className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 transition-all">
                {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Produto no Catálogo</label>
              <select value={productId} onChange={e => handleProductChange(e.target.value)} required className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-sm outline-none focus:border-emerald-500 transition-all">
                <option value="">Selecione...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code || 'Sem Cod.'})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Qtd</label>
                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Valor Unit. (R$)</label>
                <input type="text" value={unitValue} onChange={e => setUnitValue(e.target.value.replace(/[^0-9.]/g, ''))} className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 mt-4 active:scale-95 transition-all text-sm uppercase tracking-widest">
            Confirmar {type}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MovementModal;
