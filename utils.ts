
import { Movement, Representative, Product, MaletaSummary, MovementType, Sale, SaleStatus, Category } from './types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const calculateCommission = (totalSoldValue: number): number => {
  return totalSoldValue >= 5000 ? 0.50 : 0.30;
};

export const isMonday = (dateString: string): boolean => {
  return new Date(dateString).getDay() === 1;
};

export const getDayName = (dayIndex: number): string => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[dayIndex];
};

export const calculateMaletaSummaries = (movements: Movement[], reps: Representative[]): MaletaSummary[] => {
  return reps.map(rep => {
    const repMovements = movements.filter(m => m.representativeId === rep.id);
    
    let totalDelivered = 0;
    let totalSold = 0;
    let totalReturned = 0;
    let soldValue = 0;
    let qtyDelivered = 0;
    let qtySold = 0;
    let qtyReturned = 0;

    repMovements.forEach(m => {
      const val = m.value * m.quantity;
      if (m.type === 'Entregue' || m.type === 'Reposição') {
        totalDelivered += val;
        qtyDelivered += m.quantity;
      } else if (m.type === 'Vendido') {
        totalSold += val;
        soldValue += val;
        qtySold += m.quantity;
      } else if (m.type === 'Devolvido') {
        totalReturned += val;
        qtyReturned += m.quantity;
      }
    });

    const currentStockQty = qtyDelivered - qtySold - qtyReturned;
    const rate = calculateCommission(soldValue);
    const commissionValue = soldValue * rate;
    const ownerValue = soldValue - commissionValue;

    return {
      repId: rep.id,
      repName: rep.name,
      totalDelivered,
      totalSold,
      totalReturned,
      currentStockQty,
      soldValue,
      commissionRate: rate * 100,
      commissionValue,
      ownerValue,
      isClosed: !rep.active,
      status: rep.status || (rep.active ? 'Em Campo' : 'Na Base')
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

export const parsePastedData = (text: string, repId: string): Sale[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    const parts = line.split(/[\t;]/);
    const possibleName = parts[0]?.trim() || 'Importado';
    const possibleValueStr = parts[parts.length - 1]?.trim()
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.') || '0';
    const possibleValue = parseFloat(possibleValueStr) || 0;

    return {
      id: generateId(),
      date: new Date().toISOString(),
      representativeId: repId,
      productId: '',
      client: possibleName,
      category: Category.BRINCOS,
      value: possibleValue,
      status: 'Vendida' as SaleStatus
    };
  });
};
