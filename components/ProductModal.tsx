
import React, { useState, useEffect, useRef } from 'react';
import { Product, Category } from '../types';
import { generateId, resizeImage, validateProductImage } from '../utils';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prod: Product) => void;
  editingProduct?: Product | null;
  onDelete?: (prodId: string) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, editingProduct, onDelete }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<Category>(Category.BRINCOS);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setCode(editingProduct.code || '');
      setCategory(editingProduct.category);
      setPrice(editingProduct.price.toString().replace('.', ','));
      setStock(editingProduct.stock.toString());
      setImage(editingProduct.image || null);
    } else {
      setName(''); 
      setCode(''); 
      setCategory(Category.BRINCOS); 
      setPrice(''); 
      setStock('0');
      setImage(null);
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      await validateProductImage(file);
      const base64 = await resizeImage(file);
      setImage(`data:image/jpeg;base64,${base64}`);
    } catch (error) {
      alert(error);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrice = parseFloat(price.replace(',', '.')) || 0;
    const cleanStock = parseInt(stock) || 0;
    
    if (!name.trim()) return alert('Insira o nome do produto.');
    if (cleanPrice <= 0) return alert('O preço deve ser maior que zero.');

    onSave({
      id: editingProduct?.id || generateId(),
      name,
      code,
      category,
      price: cleanPrice,
      stock: cleanStock,
      image: image || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <h2 className="text-xl font-black text-zinc-900 italic uppercase leading-none">{editingProduct ? 'Editar Item' : 'Novo Item'}</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Configuração de Catálogo</p>
          </div>
          <button onClick={onClose} className="p-3 text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="relative group">
            {image ? (
              <div className="relative w-full aspect-square rounded-[32px] overflow-hidden border-4 border-zinc-50 shadow-inner">
                <img src={image} className="w-full h-full object-cover" alt="Produto" />
                <button 
                  type="button" 
                  onClick={() => setImage(null)} 
                  className="absolute top-4 right-4 p-2 bg-white/90 text-rose-500 rounded-xl shadow-lg hover:bg-white transition-all"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    fileInputRef.current?.setAttribute('capture', 'environment');
                    fileInputRef.current?.click();
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
                    fileInputRef.current?.removeAttribute('capture');
                    fileInputRef.current?.click();
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
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhoto} 
              accept="image/*" 
              className="hidden" 
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-[32px]">
                <div className="w-8 h-8 border-4 border-zinc-900/10 border-t-zinc-900 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic">Nome da Mercadoria *</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-zinc-800 focus:border-emerald-500 outline-none transition-all" 
              placeholder="Ex: Kit Maleta Premium" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic">Código / SKU</label>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-bold text-zinc-700 outline-none focus:border-emerald-500 transition-all uppercase" 
                placeholder="BP-01" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic">Estoque Base</label>
              <input 
                type="number" 
                value={stock} 
                onChange={e => setStock(e.target.value)} 
                className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-zinc-900 outline-none focus:border-emerald-500 transition-all" 
                placeholder="0" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic">Categoria</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value as Category)} 
                className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-black text-zinc-700 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              >
                {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic">Preço de Venda</label>
              <input 
                type="text" 
                inputMode="decimal" 
                value={price} 
                onChange={e => setPrice(e.target.value.replace(/[^0-9,.]/g, ''))} 
                required 
                className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-700 outline-none focus:border-emerald-500 transition-all" 
                placeholder="0,00" 
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <button type="submit" className="w-full bg-zinc-900 hover:bg-black text-white font-black py-5 rounded-[24px] shadow-xl active:scale-95 transition-all text-xs uppercase tracking-[0.2em]">
              {editingProduct ? 'Salvar Alterações' : 'Cadastrar Mercadoria'}
            </button>
            
            {editingProduct && onDelete && (
              <button 
                type="button" 
                onClick={() => onDelete(editingProduct.id)}
                className="w-full bg-rose-50 text-rose-500 font-black py-4 rounded-[24px] hover:bg-rose-100 transition-all text-[10px] uppercase tracking-widest"
              >
                Remover do Catálogo
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
