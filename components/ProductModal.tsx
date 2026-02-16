
import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { generateId } from '../utils';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prod: Product) => void;
  editingProduct?: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, editingProduct }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<Category>(Category.BRINCOS);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setCode(editingProduct.code);
      setCategory(editingProduct.category);
      setPrice(editingProduct.price.toString().replace('.', ','));
      setStock(editingProduct.stock.toString());
    } else {
      setName(''); setCode(''); setCategory(Category.BRINCOS); setPrice(''); setStock('0');
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrice = parseFloat(price.replace(',', '.'));
    const cleanStock = parseInt(stock) || 0;
    
    if (isNaN(cleanPrice)) return alert('Preço inválido');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
          <h2 className="text-xl font-bold text-zinc-800">{editingProduct ? 'Editar Mercadoria' : 'Nova Mercadoria'}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome da Mercadoria *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Brinco de Pérola G" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Código</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl" placeholder="Ex: BP-01" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Qtd. em Estoque</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl font-bold" placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value as Category)} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
                {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Preço de Venda (R$)</label>
              <input type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9,.]/g, ''))} required className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl font-black text-emerald-700" placeholder="0,00" />
            </div>
          </div>
          
          <button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-900 text-white font-black py-5 rounded-2xl shadow-lg transition-all text-lg mt-2">
            SALVAR MERCADORIA
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
