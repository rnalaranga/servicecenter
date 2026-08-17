import { api } from './client';
import type { Vendor } from './vendors';
import type { Purchase } from './purchases';

export interface VendorPayment {
  id: number;
  paymentNumber: string;
  vendorId: number;
  purchaseId?: number | null;
  date: string;
  amount: number | string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;

  vendor?: Vendor;
  purchase?: Purchase;
}

export const getVendorPayments = async (): Promise<VendorPayment[]> => {
  const { data } = await api.get('/vendor-payments');
  return data;
};

export const createVendorPayment = async (payload: Partial<VendorPayment>): Promise<VendorPayment> => {
  const { data } = await api.post('/vendor-payments', payload);
  return data;
};
