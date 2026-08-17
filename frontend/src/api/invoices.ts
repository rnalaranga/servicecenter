import { api } from './client';
import type { Customer } from './customers';

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxAmount: number;
  total: number;
}

export interface CustomerPayment {
  id: number;
  paymentNumber: string;
  date: string;
  amount: number;
  method: string;
  reference: string | null;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  vehicleId: number | null;
  date: string;
  dueDate: string | null;
  status: string; // UNPAID, PARTIAL, PAID
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string | null;
  
  customer?: Customer;
  items?: InvoiceItem[];
  payments?: CustomerPayment[];
  jobCards?: { jobCard: any }[];
}

export const getInvoices = async (): Promise<Invoice[]> => {
  const { data } = await api.get('/invoices');
  return data;
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const { data } = await api.get(`/invoices/${id}`);
  return data;
};

export const generateInvoiceFromJobCard = async (jobCardId: string): Promise<Invoice> => {
  const { data } = await api.post('/invoices/from-job-card', { jobCardId });
  return data;
};

export const createDirectInvoice = async (payload: { 
  customerId: number, 
  notes?: string, 
  globalDiscount?: number,
  paymentAmount?: number,
  paymentMethod?: string,
  items: { description: string, quantity: number, unitPrice: number, discount?: number }[] 
}): Promise<Invoice> => {
  const { data } = await api.post('/invoices', payload);
  return data;
};

export const recordPayment = async (payload: { invoiceId: number; amount: number; method: string; reference?: string }) => {
  const { data } = await api.post('/invoices/payment', payload);
  return data;
};
