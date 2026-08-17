import { api } from './client';
import type { Product } from './products';

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  location?: string | null;
  isActive: boolean;
}

export interface StockLevel {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number | string;
  
  product?: Product;
  warehouse?: Warehouse;
}

export interface StockTransaction {
  id: number;
  txnNumber: string;
  productId: number;
  warehouseId: number;
  type: 'IN' | 'OUT';
  quantity: number | string;
  unitCost: number | string;
  totalCost: number | string;
  refType?: string | null;
  refId?: number | null;
  refNumber?: string | null;
  notes?: string | null;
  createdAt: string;

  product?: Product;
  warehouse?: Warehouse;
}

export const getStockLevels = async (): Promise<StockLevel[]> => {
  const { data } = await api.get('/stock');
  return data;
};

export const getStockMovements = async (): Promise<StockTransaction[]> => {
  const { data } = await api.get('/stock/movements');
  return data;
};

export const adjustStock = async (payload: { productId: number, type: 'IN' | 'OUT', quantity: number, unitCost?: number, notes?: string }) => {
  const { data } = await api.post('/stock/adjust', payload);
  return data;
};
