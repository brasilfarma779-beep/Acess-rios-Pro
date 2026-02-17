
import React, { useState, useEffect } from 'react';
import { Representative, RepStatus } from '../types';
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toISOString().split('T')[0];
  });
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState<RepStatus>('Em Campo');

  useEffect(() => {
    if (editingRep) {
      setName(editingRep.name);
      setPhone(editingRep.phone);
      setCity(editingRep.city);
      setStartDate(editingRep.startDate);
      setEndDate(editingRep.endDate);
      setActive(editingRep.active);
      setStatus(editingRep.status || 'Em Campo');
    } else {
      setName('');
      setPhone('');
      setCity('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setActive(true);
      setStatus('Em Campo');
    }
  }, [editingRep, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
          <h2 className="text-xl font-black text-zinc-900">{editingRep ? 'Editar Vendedora' : 'Nova Vendedora'}</h2>
          <button onClick={onClose} className="p-2 text-zinc-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({ id: editingRep?.id || generateId(), name, phone, city, startDate, endDate, active, status });
          onClose();
        }} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Nome Completo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl focus:border-emerald-500 transition-all font-black" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status da Maleta</label>
            <div className="grid grid-cols-2 gap-2">
               <button type="button" onClick={() => setStatus('Em Campo')} className={`p-3 rounded-xl text-[10px] font-black uppercase transition-all ${status === 'Em Campo' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>Em Campo</button>
               <button type="button" onClick={() => setStatus('Na Base')} className={`p-3 rounded-xl text-[10px] font-black uppercase transition-all ${status === 'Na Base' ? 'bg-zinc-800 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400'}`}>Na Base</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Fim Previsto</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-4 bg-zinc-50 border-2 border-zinc-100 rounded-2xl font-bold" />
            </div>
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-lg transition-all text-lg mt-4 uppercase">Salvar Cadastro</button>
        </form>
      </div>
    </div>
  );
};

export default RepresentativeModal;
