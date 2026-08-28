import { api } from './client';

export interface CustomerBalance {
  id: number;
  code: string;
  name: string;
  mobile: string;
  balance: number;
}

export interface CustomerLedgerEntry {
  id: number;
  customerId: number;
  date: string;
  type: string;
  refType?: string | null;
  refNumber?: string | null;
  description?: string | null;
  debit: number | string;
  credit: number | string;
  balance: number | string;
  invoice?: { invoiceNumber: string };
  payment?: { paymentNumber: string };
}

export interface CustomerStatementResponse {
  customer: any;
  ledger: CustomerLedgerEntry[];
}

export const getCustomerBalances = async (): Promise<CustomerBalance[]> => {
  const { data } = await api.get('/customer-ledger');
  return data;
};

export const getCustomerStatement = async (customerId: string | number): Promise<CustomerStatementResponse> => {
  const { data } = await api.get(`/customer-ledger/${customerId}`);
  return data;
};
