
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

    const parts = line.split(/[\t;|\-]/);
    if (parts.length >= 2) {
      name = parts[0].trim();
      const pStr = parts[1].trim().replace('R$', '').replace(/\./g, '').replace(',', '.');
      price = parseFloat(pStr) || price;
      if (parts[2]) quantity = parseInt(parts[2].trim()) || quantity;
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

// Fixed missing parsePastedData for ImportModal.tsx
export const parsePastedData = (text: string, repId: string): Sale[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  return lines.map(line => {
    const parts = line.split(/[\t;|,]/);
    const client = parts[0]?.trim() || 'Cliente';
    const categoryStr = parts[1]?.trim() || '';
    const valueStr = parts[2]?.trim().replace('R$', '').replace(/\./g, '').replace(',', '.') || '0';
    
    let category = Category.BRINCOS;
    // Tenta encontrar uma categoria válida
    const validCategory = Object.values(Category).find(c => c === categoryStr);
    if (validCategory) {
      category = validCategory as Category;
    }

    return {
      id: generateId(),
      date: new Date().toISOString(),
      representativeId: repId,
      productId: 'manual-import',
      client,
      category,
      value: parseFloat(valueStr) || 0,
      status: 'Vendida' as SaleStatus
    };
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
    reader.onerror = reject;
  });
};
