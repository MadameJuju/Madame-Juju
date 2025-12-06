export enum TransactionType {
  REVENUE = 'Receita',
  EXPENSE = 'Despesa',
}

export enum Status {
  PAID = 'Pago',
  PENDING = 'Pendente',
  OVERDUE = 'Atrasado',
}

export interface FinancialRecord {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  value: number;
  type: TransactionType;
  status: Status;
  royaltiesIsabel?: number;
  royaltiesAlessandra?: number;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  margin: number;
  pendingReceivables: number;
  pendingPayables: number;
  totalRoyaltiesIsabel: number;
  totalRoyaltiesAlessandra: number;
  previousMonthProfit?: number; // For trend comparison
}

export interface ChartDataPoint {
  name: string;
  receita: number;
  despesa: number;
  lucro: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}