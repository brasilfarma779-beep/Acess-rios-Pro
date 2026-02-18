
import { Movement, Representative, Product, MaletaSummary, Category, Sale, SaleStatus } from './types.ts';

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

export const calculateCommissionRate = (totalSoldValue: number): number => {
  return totalSoldValue >= 5000 ? 0.50 : 0.30;
};

export const calculateMaletaSummaries = (movements: Movement[], reps: Representative[]): MaletaSummary[] => {
  return reps.map(rep => {
    const repMovements = movements.filter(m => m.representativeId === rep.id);
    
    let totalDeliveredValue = 0;
    let soldValue = 0;
    let commissionValueAdjustment = 0;
    let additionalValue = 0;
    
    let qtyDelivered = 0;
    let qtySold = 0;
    let qtyReturned = 0;

    repMovements.forEach(m => {
      const lineValue = m.value * m.quantity;
      
      if (m.type === 'Ajuste') {
        if (m.adjustmentTarget === 'sold') soldValue += lineValue;
        if (m.adjustmentTarget === 'commission') commissionValueAdjustment += lineValue;
        if (m.adjustmentTarget === 'total') totalDeliveredValue += lineValue;
        if (m.adjustmentTarget === 'additional') additionalValue += lineValue;
      } else {
        if (m.type === 'Entregue' || m.type === 'Reposição') {
          totalDeliveredValue += lineValue;
          qtyDelivered += m.quantity;
        } else if (m.type === 'Vendido') {
          soldValue += lineValue;
          qtySold += m.quantity;
        } else if (m.type === 'Devolvido') {
          qtyReturned += m.quantity;
        }
      }
    });

    const currentStockQty = qtyDelivered - qtySold - qtyReturned;
    const rate = calculateCommissionRate(soldValue);
    const finalCommission = (soldValue * rate) + commissionValueAdjustment;
    const ownerValue = soldValue - finalCommission;

    return {
      repId: rep.id,
      repName: rep.name,
      totalDelivered: totalDeliveredValue,
      totalSold: qtySold,
      totalReturned: qtyReturned,
      currentStockQty,
      soldValue,
      commissionRate: rate * 100,
      commissionValue: finalCommission,
      ownerValue,
      additionalValue,
      isClosed: !rep.active,
      status: rep.status || 'Em Campo'
    };
  });
};

export const parsePastedProducts = (text: string): Product[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    const moneyRegex = /(?:R\$?\s*)?(\d+(?:\.\d+)?(?:,\d+)?)\b/g;
    const matches = Array.from(line.matchAll(moneyRegex));
    
    let name = line.trim();
    let price = 0;
    let quantity = 10;

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const priceStr = lastMatch[1].replace(/\./g, '').replace(',', '.');
      price = parseFloat(priceStr) || 0;
      name = line.replace(lastMatch[0], '').trim();
    }

    return {
      id: generateId(),
      name: name || 'Produto Sem Nome',
      category: Category.BRINCOS,
      code: `SKU-${generateId().toUpperCase().substring(0,3)}`,
      price,
      stock: quantity
    };
  });
};

// Added missing parsePastedData function to handle sales text import for ImportModal component.
export const parsePastedData = (text: string, representativeId: string): Sale[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    const moneyRegex = /(?:R\$?\s*)?(\d+(?:\.\d+)?(?:,\d+)?)\b/g;
    const matches = Array.from(line.matchAll(moneyRegex));
    
    let client = line.trim();
    let value = 0;

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const priceStr = lastMatch[1].replace(/\./g, '').replace(',', '.');
      value = parseFloat(priceStr) || 0;
      client = line.replace(lastMatch[0], '').trim();
    }

    return {
      id: generateId(),
      date: new Date().toISOString(),
      representativeId,
      productId: '', 
      client: client || 'Cliente Avulso',
      category: Category.BRINCOS,
      value,
      status: 'Vendida'
    };
  });
};

export const exportFullData = () => {
  const data = {
    reps: JSON.parse(localStorage.getItem('hub_v5_reps') || '[]'),
    prods: JSON.parse(localStorage.getItem('hub_v5_prods') || '[]'),
    movs: JSON.parse(localStorage.getItem('hub_v5_movs') || '[]'),
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_soberana_gestao_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
  a.click();
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
    reader.onerror = reject;
  });
};
