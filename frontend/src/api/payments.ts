import { api } from './client';
import type { Customer } from './customers';

export interface Payment {
  id: number;
  paymentNumber: string;
  customerId: number;
  invoiceId?: number | null;
  date: string;
  amount: number | string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  createdById?: number | null;
  createdAt: string;

  customer?: Customer;
}

export const getPayments = async (): Promise<Payment[]> => {
  const { data } = await api.get('/payments');
  return data;
};

export const getPaymentById = async (id: string): Promise<Payment> => {
  const { data } = await api.get(`/payments/${id}`);
  return data;
};

export const createPayment = async (payload: { customerId: number, amount: number, method: string, type: 'RECEIPT' | 'REFUND', reference?: string, notes?: string }): Promise<Payment> => {
  const { data } = await api.post('/payments', payload);
  return data;
};
