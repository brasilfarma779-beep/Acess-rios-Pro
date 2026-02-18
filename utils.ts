
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
    let soldValue = 0;
    let commissionValueAdjustment = 0;
    let additionalValue = 0;
    
    let qtyDelivered = 0;
    let qtySold = 0;
    let qtyReturned = 0;

    repMovements.forEach(m => {
      const val = m.value * m.quantity;
      
      if (m.type === 'Ajuste') {
        if (m.adjustmentTarget === 'sold') soldValue += val;
        if (m.adjustmentTarget === 'commission') commissionValueAdjustment += val;
        if (m.adjustmentTarget === 'total') totalDelivered += val;
        if (m.adjustmentTarget === 'additional') {
          totalDelivered += val;
          additionalValue += val;
        }
      } else {
        if (m.type === 'Entregue') {
          totalDelivered += val;
          qtyDelivered += m.quantity;
        } else if (m.type === 'Reposição') {
          totalDelivered += val;
          additionalValue += val;
          qtyDelivered += m.quantity;
        } else if (m.type === 'Vendido') {
          soldValue += val;
          qtySold += m.quantity;
        } else if (m.type === 'Devolvido') {
          qtyReturned += m.quantity;
        }
      }
    });

    const currentStockQty = qtyDelivered - qtySold - qtyReturned;
    const rate = calculateCommission(soldValue);
    const baseCommission = soldValue * rate;
    const finalCommissionValue = baseCommission + commissionValueAdjustment;
    const ownerValue = soldValue - finalCommissionValue;

    return {
      repId: rep.id,
      repName: rep.name,
      totalDelivered,
      totalSold: soldValue,
      totalReturned: qtyReturned,
      currentStockQty,
      soldValue,
      commissionRate: rate * 100,
      commissionValue: finalCommissionValue,
      ownerValue,
      additionalValue,
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

export const parsePastedProducts = (text: string) => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    // Tenta quebrar por TAB, Ponto e Vírgula ou Espaços Múltiplos
    const parts = line.split(/[\t;]/);
    
    if (parts.length >= 2) {
      const name = parts[0]?.trim() || 'Novo Produto';
      const category = parts.length > 3 ? parts[1]?.trim() : '';
      const priceStr = (parts.length > 3 ? parts[2] : parts[1])?.trim()
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.') || '0';
      const qtyStr = (parts.length > 3 ? parts[3] : parts[2])?.trim() || '1';

      return {
        id: generateId(),
        name,
        category,
        price: parseFloat(priceStr) || 0,
        quantity: parseInt(qtyStr) || 1
      };
    } else {
      // Tenta um rastro simples por espaço se for apenas "Produto Preço"
      const lastSpaceIndex = line.lastIndexOf(' ');
      if (lastSpaceIndex !== -1) {
        const name = line.substring(0, lastSpaceIndex).trim();
        const priceStr = line.substring(lastSpaceIndex).trim().replace(',', '.');
        return {
          id: generateId(),
          name,
          category: '',
          price: parseFloat(priceStr) || 0,
          quantity: 1
        };
      }
    }

    return {
      id: generateId(),
      name: line.trim() || 'Novo Produto',
      category: '',
      price: 0,
      quantity: 1
    };
  });
};
