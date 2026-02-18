
import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { generateId } from '../utils';

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

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setCode(editingProduct.code || '');
      setCategory(editingProduct.category);
      setPrice(editingProduct.price.toString().replace('.', ','));
      setStock(editingProduct.stock.toString());
    } else {
      setName(''); 
      setCode(''); 
      setCategory(Category.BRINCOS); 
      setPrice(''); 
      setStock('0');
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

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
      stock: cleanStock
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
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
