export const formatCurrency = (value: number): string => {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  if (isNaN(value)) return '0%';
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  
  try {
    // Check if dateString is already ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [y, m, d] = dateString.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        if (isNaN(date.getTime())) return dateString;
        return new Intl.DateTimeFormat('pt-BR').format(date);
    }

    // Try standard parsing
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // Fallback: if it looks like a BR date 08/11/2025 but wasn't caught before
        const parts = dateString.split('/');
        if (parts.length === 3) {
             return dateString; // Just return it as is if we can't format it
        }
        return '-';
    }
    
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch (e) {
    console.warn("Date formatting error", e);
    return '-';
  }
};