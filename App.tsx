import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { LayoutDashboard, Upload, FileSpreadsheet, Sparkles, Filter, TrendingUp, TrendingDown, DollarSign, Calendar, Users, Share2, Printer } from 'lucide-react';

import { FinancialRecord, TransactionType, Status, DashboardMetrics } from './types';
import { INITIAL_DATA } from './utils/mockData';
import { formatCurrency, formatPercentage, formatDate } from './utils/formatters';
import { parseCSV } from './utils/csvParser';
import { StatCard } from './components/StatCard';
import { AIChat } from './components/AIChat';

// Helper to get full month name from date string
const getMonthFromDate = (dateStr: string) => {
  const date = new Date(dateStr);
  // Using UTC to avoid timezone shifts jumping months
  const utcDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(utcDate);
};

// Helper to sort months chronologically
const sortMonths = (months: string[]) => {
  const monthOrder = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  return months.sort((a, b) => {
    const idxA = monthOrder[a.toLowerCase() as keyof typeof monthOrder] ?? 0;
    const idxB = monthOrder[b.toLowerCase() as keyof typeof monthOrder] ?? 0;
    return idxA - idxB;
  });
};

function App() {
  const [data, setData] = useState<FinancialRecord[]>(INITIAL_DATA);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- Calculations ---
  
  // Extract unique months from data for the filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    data.forEach(d => {
      // Capitalize first letter
      const m = getMonthFromDate(d.date);
      const formatted = m.charAt(0).toUpperCase() + m.slice(1);
      months.add(formatted);
    });
    return sortMonths(Array.from(months));
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedMonth === 'todos') return data;
    return data.filter(d => {
      const m = getMonthFromDate(d.date);
      return m.toLowerCase() === selectedMonth.toLowerCase();
    });
  }, [data, selectedMonth]);

  const metrics: DashboardMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalExpense = 0;
    let pendingReceivables = 0;
    let pendingPayables = 0;
    let totalRoyaltiesIsabel = 0;
    let totalRoyaltiesAlessandra = 0;

    filteredData.forEach(r => {
      if (r.type === TransactionType.REVENUE) {
        totalRevenue += r.value;
        if (r.status === Status.PENDING) pendingReceivables += r.value;
        
        // Sum royalties (only exist on revenue records)
        totalRoyaltiesIsabel += r.royaltiesIsabel || 0;
        totalRoyaltiesAlessandra += r.royaltiesAlessandra || 0;

      } else {
        totalExpense += r.value;
        if (r.status === Status.PENDING) pendingPayables += r.value;
      }
    });

    const netProfit = totalRevenue - totalExpense;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Calculate Previous Month Profit for Trend
    let previousMonthProfit = 0;
    if (selectedMonth !== 'todos') {
        const currentIdx = availableMonths.indexOf(selectedMonth);
        if (currentIdx > 0) {
            const prevMonthName = availableMonths[currentIdx - 1];
            const prevMonthData = data.filter(d => getMonthFromDate(d.date).toLowerCase() === prevMonthName.toLowerCase());
            
            const prevRev = prevMonthData.filter(d => d.type === TransactionType.REVENUE).reduce((sum, r) => sum + r.value, 0);
            const prevExp = prevMonthData.filter(d => d.type === TransactionType.EXPENSE).reduce((sum, r) => sum + r.value, 0);
            previousMonthProfit = prevRev - prevExp;
        }
    }

    return { 
      totalRevenue, 
      totalExpense, 
      netProfit, 
      margin, 
      pendingReceivables, 
      pendingPayables,
      totalRoyaltiesIsabel,
      totalRoyaltiesAlessandra,
      previousMonthProfit
    };
  }, [filteredData, data, selectedMonth, availableMonths]);

  // Net Profit Trend Percentage
  const profitTrend = useMemo(() => {
      if (selectedMonth === 'todos' || metrics.previousMonthProfit === 0) return null;
      const diff = metrics.netProfit - (metrics.previousMonthProfit || 0);
      const pct = (diff / Math.abs(metrics.previousMonthProfit || 1)) * 100;
      return pct;
  }, [metrics, selectedMonth]);

  const chartData = useMemo(() => {
    // Group by date for line/bar charts
    const grouped: Record<string, { date: string; receita: number; despesa: number; lucro: number }> = {};
    
    filteredData.forEach(d => {
      const dateKey = d.date; 
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, receita: 0, despesa: 0, lucro: 0 };
      }
      if (d.type === TransactionType.REVENUE) grouped[dateKey].receita += d.value;
      else grouped[dateKey].despesa += d.value;
    });

    return Object.values(grouped)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(g => ({ ...g, lucro: g.receita - g.despesa, displayDate: formatDate(g.date).slice(0, 5) }));
  }, [filteredData]);

  const sourceData = useMemo(() => {
    const grouped: Record<string, number> = {};
    // Filter for Revenue only to show Customer Sources
    filteredData.filter(d => d.type === TransactionType.REVENUE).forEach(d => {
      // Use category as Source (mapped in parser)
      const source = d.category || 'Indefinido';
      grouped[source] = (grouped[source] || 0) + d.value;
    });
    return Object.keys(grouped).map(k => ({ name: k, value: grouped[k] })).sort((a,b) => b.value - a.value);
  }, [filteredData]);

  // --- Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setData(parsed);
        // Reset filter to 'todos'
        setSelectedMonth('todos');
        setUploadError(null);
      } else {
        setUploadError("Não foi possível ler dados válidos do arquivo CSV. Verifique o formato.");
      }
    };
    reader.readAsText(file);
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

  return (
    <div className="min-h-screen pb-20 print:pb-0 print:bg-white">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 print:border-none print:relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-lg print:hidden">
                 <LayoutDashboard className="text-white h-5 w-5" />
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight">SócioVisão</span>
              <span className="hidden print:inline-block text-sm text-slate-500 ml-4 border-l pl-4 border-slate-300">
                Relatório Gerencial - {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
            
            <div className="flex items-center gap-4 no-print">
               <button 
                 onClick={() => window.print()}
                 className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                 title="Imprimir ou Salvar como PDF"
               >
                 <Printer size={20} />
                 <span className="hidden sm:inline font-medium">Exportar PDF</span>
               </button>

               <label className="cursor-pointer group flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                  <Upload size={16} className="text-slate-500 group-hover:text-slate-700" />
                  <span className="hidden sm:inline">Importar CSV</span>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
               </label>
               <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-sm font-medium shadow-md shadow-indigo-200 transition-all hover:scale-105"
               >
                 <Sparkles size={16} />
                 <span className="hidden sm:inline">Análise IA</span>
               </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome & Context */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Situação Geral</h1>
            <p className="text-slate-500 mt-1 print:hidden">Visão consolidada financeira e operacinal.</p>
            <p className="hidden print:block text-slate-500 mt-1">Período de Análise: <span className="font-semibold text-slate-800">{selectedMonth}</span></p>
            {uploadError && <p className="text-red-500 text-sm mt-2 no-print">{uploadError}</p>}
          </div>
          
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm overflow-x-auto max-w-full no-print">
            <Calendar className="text-slate-400 ml-2" size={16} />
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button 
              onClick={() => setSelectedMonth('todos')}
              className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedMonth === 'todos' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Todos
            </button>
            {availableMonths.map(month => (
              <button 
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedMonth === month ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {month}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 break-inside-avoid">
          <StatCard 
            title="Receita Total" 
            value={formatCurrency(metrics.totalRevenue)} 
            color="blue"
            trendDirection="up"
          />
          <StatCard 
            title="Despesas" 
            value={formatCurrency(metrics.totalExpense)} 
            color="red"
            trendDirection="down" 
          />
          <StatCard 
            title="Lucro Líquido" 
            value={formatCurrency(metrics.netProfit)} 
            color="green"
            trend={profitTrend !== null ? `${profitTrend > 0 ? '+' : ''}${formatPercentage(profitTrend)}` : undefined}
            trendDirection={profitTrend !== null ? (profitTrend > 0 ? 'up' : 'down') : 'neutral'}
          />
           <StatCard 
            title="A Receber (Pendente)" 
            value={formatCurrency(metrics.pendingReceivables)} 
            color="slate"
          />
        </div>

        {/* Partners Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 break-inside-avoid">
            <StatCard 
                title="Royalties - Isabel"
                value={formatCurrency(metrics.totalRoyaltiesIsabel)}
                color="slate"
                icon={<Users size={20} />}
            />
            <StatCard 
                title="Royalties - Alessandra"
                value={formatCurrency(metrics.totalRoyaltiesAlessandra)}
                color="slate"
                icon={<Users size={20} />}
            />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-2">
          {/* Main Trend Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm break-inside-avoid">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Fluxo de Caixa ({selectedMonth})</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    tickFormatter={(val) => `R$${val/1000}k`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" />
                  <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesa)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown (Source) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm break-inside-avoid">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Fonte de Entrada (Clientes)</h3>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto scrollbar-thin pr-2">
              {sourceData.length > 0 ? sourceData.map((entry, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600 truncate max-w-[120px]">{entry.name}</span>
                  </div>
                  <span className="font-medium text-slate-800">{formatCurrency(entry.value)}</span>
                </div>
              )) : (
                <p className="text-sm text-slate-400 text-center py-4">Sem dados para este período</p>
              )}
            </div>
          </div>
        </div>

        {/* Data Grid / Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden break-inside-avoid">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="text-lg font-semibold text-slate-800">Transações Detalhadas</h3>
             <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium no-print">
               {filteredData.length} registros
             </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Mês</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Categoria/Fonte</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length > 0 ? filteredData.slice().reverse().map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 capitalize">{getMonthFromDate(record.date)}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{record.description}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {record.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                         ${record.status === Status.PAID ? 'bg-emerald-100 text-emerald-800' : 
                           record.status === Status.PENDING ? 'bg-amber-100 text-amber-800' : 
                           'bg-rose-100 text-rose-800'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${record.type === TransactionType.REVENUE ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {record.type === TransactionType.REVENUE ? '+' : '-'}{formatCurrency(record.value)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Nenhum registro encontrado para {selectedMonth}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Floating Chat - Hidden in Print */}
      <div className="no-print">
        <AIChat 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          data={filteredData}
          metrics={metrics}
        />
      </div>
    </div>
  );
}

export default App;