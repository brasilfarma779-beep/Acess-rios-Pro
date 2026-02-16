
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string;
  colorClass: string;
  icon?: React.ReactNode;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, colorClass, icon }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{label}</span>
        {icon && <div className={`${colorClass.replace('text-', 'bg-').replace('600', '100')} p-2 rounded-full text-current`}>{icon}</div>}
      </div>
      <div className={`text-2xl md:text-3xl font-bold ${colorClass}`}>
        {value}
      </div>
    </div>
  );
};

export default StatsCard;
