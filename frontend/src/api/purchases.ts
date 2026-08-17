import { api } from './client';
import type { Vendor } from './vendors';
import type { Product } from './products';

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId?: number | null;
  description?: string | null;
  quantity: number | string;
  unitCost: number | string;
  discount: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  total: number | string;

  product?: Product;
}

export interface Purchase {
  id: number;
  purchaseNumber: string;
  vendorId: number;
  warehouseId?: number | null;
  jobCardId?: number | null;
  isExternal?: boolean;
  date: string;
  dueDate?: string | null;
  status: 'DRAFT' | 'COMPLETED';
  subtotal: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  total: number | string;
  amountPaid: number | string;
  balance: number | string;
  jobCardId?: number | null;
  isExternal: boolean;
  notes?: string | null;
  createdAt: string;

  vendor?: Vendor;
  items?: PurchaseItem[];
}

export const getPurchases = async (): Promise<Purchase[]> => {
  const { data } = await api.get('/purchases');
  return data;
};

export const getPurchase = async (id: number | string): Promise<Purchase> => {
  const { data } = await api.get(`/purchases/${id}`);
  return data;
};

export const createPurchase = async (payload: any): Promise<Purchase> => {
  const { data } = await api.post('/purchases', payload);
  return data;
};
