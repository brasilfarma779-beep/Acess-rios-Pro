
export enum Category {
  BRINCOS = 'Brincos',
  CONJUNTOS = 'Conjuntos',
  DUPLAS_TRIOS = 'Duplas e Trios',
  PULSEIRAS_COLARES = 'Pulseiras e Colares',
  ANEIS = 'Anéis'
}

export type MovementType = 'Entregue' | 'Vendido' | 'Devolvido' | 'Reposição' | 'Ajuste';

export type AdjustmentTarget = 'sold' | 'commission' | 'total' | 'additional';

export type SaleStatus = 'Vendida' | 'Não Vendida' | 'Cancelada';

export type RepStatus = 'Em Campo' | 'Na Base';

export interface Representative {
  id: string;
  name: string;
  phone: string;
  city: string;
  startDate: string;
  endDate: string;
  active: boolean;
  status: RepStatus;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  code: string;
  price: number;
  stock: number;
  image?: string;
}

export interface Sale {
  id: string;
  date: string;
  representativeId: string;
  productId: string;
  client: string;
  category: Category;
  quantity?: number;
  value: number;
  status: SaleStatus;
  image?: string;
}

export interface Movement {
  id: string;
  date: string;
  representativeId: string;
  productId: string;
  type: MovementType;
  quantity: number;
  value: number; 
  image?: string;
  adjustmentTarget?: AdjustmentTarget;
}

export interface MaletaSummary {
  repId: string;
  repName: string;
  repPhone: string;
  totalDelivered: number; 
  totalSold: number;
  totalReturned: number;
  currentStockQty: number;
  soldValue: number;
  commissionRate: number;
  commissionValue: number;
  ownerValue: number;
  additionalValue: number;
  isClosed: boolean;
  status: RepStatus;
}
