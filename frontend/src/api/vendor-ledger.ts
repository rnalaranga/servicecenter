import { api } from './client';

export interface VendorBalance {
  id: number;
  code: string;
  name: string;
  companyName?: string | null;
  mobile?: string | null;
  balance: number;
}

export interface VendorLedgerEntry {
  id: number;
  vendorId: number;
  date: string;
  type: string;
  refType?: string | null;
  refNumber?: string | null;
  description?: string | null;
  debit: number | string;
  credit: number | string;
  balance: number | string;
}

export interface VendorStatementResponse {
  vendor: any;
  ledger: VendorLedgerEntry[];
}

export const getVendorBalances = async (): Promise<VendorBalance[]> => {
  const { data } = await api.get('/vendor-ledger');
  return data;
};

export const getVendorStatement = async (vendorId: string | number): Promise<VendorStatementResponse> => {
  const { data } = await api.get(`/vendor-ledger/${vendorId}`);
  return data;
};
