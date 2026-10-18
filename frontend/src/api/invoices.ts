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
  terms?: string | null;
  bankDetails?: string | null;
  isQuotation?: boolean;
  
  customer?: Customer;
  vehicle?: any;
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
  customerId: number;
  vehicleId?: number | null;
  notes?: string;
  terms?: string;
  bankDetails?: string;
  isQuotation?: boolean;
  globalDiscount?: number;
  paymentAmount?: number;
  paymentMethod?: string;
  items: { description: string; quantity: number; unitPrice: number; discount?: number }[];
}): Promise<Invoice> => {
  const { data } = await api.post('/invoices', payload);
  return data;
};

export const updateInvoice = async (id: string | number, payload: {
  terms?: string;
  bankDetails?: string;
  notes?: string;
  vehicleId?: number | null;
}): Promise<Invoice> => {
  const { data } = await api.put(`/invoices/${id}`, payload);
  return data;
};

export const convertQuotationToInvoice = async (id: string | number): Promise<{ message: string; invoice: Invoice }> => {
  const { data } = await api.post(`/invoices/${id}/convert-to-invoice`);
  return data;
};

export const recordPayment = async (payload: { invoiceId: number; amount: number; method: string; reference?: string }) => {
  const { data } = await api.post('/invoices/payment', payload);
  return data;
};

export const deleteInvoice = async (id: number | string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.delete(`/invoices/${id}`);
  return data;
};
