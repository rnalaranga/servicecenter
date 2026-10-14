import { api } from './client';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  description?: string | null;
  balance: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    journalLines: number;
  };
  journalLines?: any[];
}

export const getAccounts = async (params?: { type?: string; search?: string }): Promise<Account[]> => {
  const { data } = await api.get('/accounts', { params });
  return data;
};

export const getAccount = async (id: number | string): Promise<Account> => {
  const { data } = await api.get(`/accounts/${id}`);
  return data;
};

export const createAccount = async (payload: Partial<Account>): Promise<Account> => {
  const { data } = await api.post('/accounts', payload);
  return data;
};

export const updateAccount = async (id: number | string, payload: Partial<Account>): Promise<Account> => {
  const { data } = await api.put(`/accounts/${id}`, payload);
  return data;
};

export const deleteAccount = async (id: number | string): Promise<{ message: string; account?: Account }> => {
  const { data } = await api.delete(`/accounts/${id}`);
  return data;
};
