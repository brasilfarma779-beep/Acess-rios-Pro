
export enum Category {
  BRINCOS = 'Brincos',
  CONJUNTOS = 'Conjuntos',
  DUPLAS_TRIOS = 'Duplas e Trios',
  PULSEIRAS_COLARES = 'Pulseiras e Colares',
  ANEIS = 'Anéis'
}

export type SaleStatus = 'Vendida' | 'Não Vendida';

export interface Representative {
  id: string;
  name: string;
  phone: string;
  city: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  code: string;
  price: number;
  stock: number; // Novo: Controle de quantidade de mercadoria
}

export interface Sale {
  id: string;
  date: string;
  representativeId: string;
  productId: string;
  client: string;
  category: Category;
  value: number;
  status: SaleStatus;
}

export interface Summary {
  totalSold: number;
  commission: number;
  totalToReceive: number;
}

export interface RepSummary extends Summary {
  repName: string;
  repId: string;
  commissionRate: number;
}
