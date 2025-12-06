import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  trend, 
  trendDirection = 'neutral',
  color = 'slate'
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200'
  };

  const iconColorClasses = {
     blue: 'text-blue-600 bg-blue-100',
     green: 'text-emerald-600 bg-emerald-100',
     red: 'text-rose-600 bg-rose-100',
     slate: 'text-slate-600 bg-slate-100'
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorClasses[color].replace('bg-', 'bg-white ').replace('text-', 'text-slate-800 ')} shadow-sm transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${iconColorClasses[color]}`}>
            {color === 'green' ? <ArrowUpRight size={20} /> : color === 'red' ? <ArrowDownRight size={20} /> : <DollarSign size={20} />}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`font-medium ${trendDirection === 'up' ? 'text-emerald-600' : trendDirection === 'down' ? 'text-rose-600' : 'text-slate-500'}`}>
            {trend}
          </span>
          <span className="text-slate-400 ml-2">vs. mês anterior</span>
        </div>
      )}
    </div>
  );
};