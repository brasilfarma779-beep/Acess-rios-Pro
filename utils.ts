
import { Sale, Summary, Category, Representative, RepSummary, SaleStatus, Product } from './types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const calculateCommissionRate = (total: number): number => {
  return total >= 5000 ? 0.5 : 0.3;
};

export const calculateRepSummaries = (sales: Sale[], reps: Representative[]): RepSummary[] => {
  return reps.map(rep => {
    const repSales = sales.filter(s => s.representativeId === rep.id && s.status === 'Vendida');
    const totalSold = repSales.reduce((acc, s) => acc + s.value, 0);
    const rate = calculateCommissionRate(totalSold);
    const commission = totalSold * rate;
    
    return {
      repId: rep.id,
      repName: rep.name,
      totalSold,
      commission,
      commissionRate: rate * 100,
      totalToReceive: totalSold - commission
    };
  });
};

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const parsePastedData = (text: string, representativeId: string): Sale[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    const parts = line.split(/[,;\t]/).map(p => p.trim());
    const client = parts[0] || 'Cliente Importado';
    const categoryStr = parts[1];
    const valueStr = parts[2];

    const value = parseFloat((valueStr || '0').replace(',', '.'));
    
    let category = Category.BRINCOS;
    if (categoryStr) {
      const found = Object.values(Category).find(c => c.toLowerCase() === categoryStr.toLowerCase());
      if (found) category = found;
    }

    return {
      id: generateId(),
      date: new Date().toISOString(),
      representativeId,
      productId: '',
      client,
      category,
      value: isNaN(value) ? 0 : value,
      status: 'Vendida' as SaleStatus
    };
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) resolve(base64);
      else reject('Erro ao converter arquivo');
    };
    reader.onerror = error => reject(error);
  });
};
