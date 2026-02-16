
import React, { useState, useEffect } from 'react';
import { Representative } from '../types';
import { generateId } from '../utils';

interface RepresentativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rep: Representative) => void;
  editingRep?: Representative | null;
}

const RepresentativeModal: React.FC<RepresentativeModalProps> = ({ isOpen, onClose, onSave, editingRep }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (editingRep) {
      setName(editingRep.name);
      setPhone(editingRep.phone);
      setCity(editingRep.city);
      setActive(editingRep.active);
    } else {
      setName('');
      setPhone('');
      setCity('');
      setActive(true);
    }
  }, [editingRep, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert('O nome é obrigatório');

    onSave({
      id: editingRep?.id || generateId(),
      name,
      phone,
      city,
      active
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
          <h2 className="text-xl font-bold text-zinc-800">{editingRep ? 'Editar Vendedora' : 'Nova Vendedora'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Maria Souza" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Telefone</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cidade</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500" placeholder="Ex: São Paulo" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 cursor-pointer" onClick={() => setActive(!active)}>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${active ? 'bg-emerald-500' : 'bg-zinc-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${active ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
            <span className="font-bold text-zinc-700">Vendedora Ativa</span>
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-2xl shadow-lg transition-all text-lg mt-4">SALVAR CADASTRO</button>
        </form>
      </div>
    </div>
  );
};

export default RepresentativeModal;
