import { FinancialRecord, TransactionType, Status } from '../types';

// Helper to parse "R$ 1.200,50" or "1.200,50" -> 1200.5
const parseCurrency = (val: string): number => {
  if (!val) return 0;
  let clean = val.replace(/[R$\s]/g, '').trim();
  
  if (!clean) return 0;

  if (clean.includes(',') && !clean.includes('.')) {
    clean = clean.replace(',', '.');
  } else if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const MONTH_MAP: Record<string, number> = {
  'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3, 'maio': 4, 'junho': 5,
  'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
};

// Helper to parse "08/11/2025" -> "2025-11-08" OR "Novembro" -> "2025-11-01"
const parseDateOrMonth = (raw: string): string => {
  if (!raw) return new Date().toISOString().split('T')[0];
  const clean = raw.trim();

  // 1. Try DD/MM/YYYY
  const dateMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const [_, day, month, year] = dateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 2. Try Month Name (e.g. "Novembro") - Defaulting to 2025 based on user context
  const lowerMonth = clean.toLowerCase();
  if (MONTH_MAP.hasOwnProperty(lowerMonth)) {
    const monthIndex = MONTH_MAP[lowerMonth];
    const year = 2025; // Default year as per user data context
    // Return YYYY-MM-DD (1st of the month)
    return `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-01`;
  }

  // 3. Fallback to ISO check
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean;
  
  return new Date().toISOString().split('T')[0];
};

export const parseCSV = (csvText: string): FinancialRecord[] => {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
  const records: FinancialRecord[] = [];

  const idx = (possibleNames: string[]) => headers.findIndex(h => possibleNames.some(name => h.includes(name)));

  // Map columns
  const iDate = idx(['data entrega', 'data', 'date']);
  const iMonth = idx(['mês venda', 'mes venda', 'mês', 'mes']);
  const iCustomer = idx(['nome cliente', 'cliente', 'customer']);
  const iOrder = idx(['nº pedido', 'pedido', 'id']);
  const iSource = idx(['fonte', 'source']); 
  
  // Financials
  const iCost = idx(['valor gasto', 'custo']);
  const iRevenue = idx(['valor cobrado', 'valor venda']);
  const iReceived = idx(['total recebido', 'pago']);
  
  // Partners
  const iRoyaltyIsabel = idx(['royalties - isabel', 'isabel']);
  const iRoyaltyAlessandra = idx(['royalties - alessandra', 'alessandra']);

  const isSpecificSheet = iRevenue !== -1 || iCost !== -1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Regex to split by comma but ignore commas inside quotes
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());

    if (cols.length < 2) continue;

    if (isSpecificSheet) {
      // Determine date: use Date column if exists, otherwise try Month column
      let date = '';
      if (iDate !== -1 && cols[iDate]) {
        date = parseDateOrMonth(cols[iDate]);
      } else if (iMonth !== -1 && cols[iMonth]) {
        date = parseDateOrMonth(cols[iMonth]);
      } else {
        date = new Date().toISOString().split('T')[0];
      }

      const customer = iCustomer !== -1 ? cols[iCustomer] : 'Cliente Desconhecido';
      const orderId = iOrder !== -1 ? cols[iOrder] : '';
      const source = iSource !== -1 ? cols[iSource] : 'Geral';
      
      const revenueVal = iRevenue !== -1 ? parseCurrency(cols[iRevenue]) : 0;
      const costVal = iCost !== -1 ? parseCurrency(cols[iCost]) : 0;
      const receivedVal = iReceived !== -1 ? parseCurrency(cols[iReceived]) : 0;
      
      const royaltyIsabel = iRoyaltyIsabel !== -1 ? parseCurrency(cols[iRoyaltyIsabel]) : 0;
      const royaltyAlessandra = iRoyaltyAlessandra !== -1 ? parseCurrency(cols[iRoyaltyAlessandra]) : 0;

      // Revenue Record
      if (revenueVal > 0) {
        let status = Status.PAID;
        // If received is significantly less than revenue, it's pending
        if (receivedVal < revenueVal - 0.1) { 
             status = Status.PENDING; 
        }

        records.push({
          id: `rev-${i}-${orderId}`,
          date,
          description: `Venda - ${customer} (Pedido ${orderId})`,
          category: source || 'Vendas',
          value: revenueVal,
          type: TransactionType.REVENUE,
          status,
          royaltiesIsabel: royaltyIsabel,
          royaltiesAlessandra: royaltyAlessandra
        });
      }

      // Expense Record
      if (costVal > 0) {
        records.push({
          id: `exp-${i}-${orderId}`,
          date,
          description: `Custo do Pedido ${orderId} - ${customer}`,
          category: 'Custo de Venda',
          value: costVal,
          type: TransactionType.EXPENSE,
          status: Status.PAID
        });
      }

    } else {
      // Fallback
      const valIdx = idx(['valor', 'value', 'amount']);
      if (valIdx === -1) continue;
      
      const val = parseCurrency(cols[valIdx]);
      if (val === 0) continue;

      const type = val < 0 ? TransactionType.EXPENSE : TransactionType.REVENUE;
      
      let date = '';
      if (iDate !== -1 && cols[iDate]) date = parseDateOrMonth(cols[iDate]);
      else if (iMonth !== -1 && cols[iMonth]) date = parseDateOrMonth(cols[iMonth]);
      else date = new Date().toISOString().split('T')[0];

      records.push({
        id: `gen-${i}`,
        date,
        description: iCustomer !== -1 ? cols[iCustomer] : 'Importado',
        category: iSource !== -1 ? cols[iSource] : 'Geral',
        value: Math.abs(val),
        type,
        status: Status.PAID
      });
    }
  }

  return records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};