import { api } from './client';
import type { Product } from './products';

export interface Vendor {
  id: number;
  code: string;
  name: string;
  companyName?: string | null;
  contactPerson?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  openingBalance: number | string;
  creditTerms?: number | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;

  products?: Product[];
  purchases?: any[];
  vendorPayments?: any[];
  ledger?: any[];
  balance?: number;
  totalPurchases?: number;
  totalPaid?: number;
  currentBalance?: number;
}

export const getVendors = async (): Promise<Vendor[]> => {
  const { data } = await api.get('/vendors');
  return data;
};

export const getVendor = async (id: number | string): Promise<Vendor> => {
  const { data } = await api.get(`/vendors/${id}`);
  return data;
};

export const createVendor = async (payload: Partial<Vendor>): Promise<Vendor> => {
  const { data } = await api.post('/vendors', payload);
  return data;
};

export const updateVendor = async (id: number | string, payload: Partial<Vendor>): Promise<Vendor> => {
  const { data } = await api.put(`/vendors/${id}`, payload);
  return data;
};

export const deleteVendor = async (id: number | string): Promise<{ message: string; vendor?: Vendor }> => {
  const { data } = await api.delete(`/vendors/${id}`);
  return data;
};
