
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string;
  colorClass: string;
  icon?: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, colorClass, icon }) => {
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-lg transition-all group overflow-hidden relative">
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all text-zinc-900">
         {icon || <svg className="h-16 w-16" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>}
      </div>
      <div className="relative z-10">
        <span className="text-zinc-400 text-[9px] font-black uppercase tracking-[0.2em] mb-2 block italic">{label}</span>
        <div className={`text-2xl font-black tracking-tighter ${colorClass}`}>
          {value}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
