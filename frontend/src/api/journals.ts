import { api } from './client';
import type { Account } from './accounts';

export interface JournalLine {
  id?: number;
  journalEntryId?: number;
  accountId: number;
  description?: string | null;
  debit: number | string;
  credit: number | string;
  account?: Account;
}

export interface JournalEntry {
  id: number;
  entryNumber: string;
  date: string;
  reference?: string | null;
  description: string;
  status: 'POSTED' | 'DRAFT';
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: number; fullName: string; username: string };
  lines: JournalLine[];
}

export interface CreateJournalPayload {
  date: string;
  reference?: string;
  description: string;
  status?: 'POSTED' | 'DRAFT';
  lines: {
    accountId: number;
    description?: string;
    debit: number;
    credit: number;
  }[];
}

export const getJournalEntries = async (params?: { status?: string; search?: string }): Promise<JournalEntry[]> => {
  const { data } = await api.get('/journals', { params });
  return data;
};

export const getJournalEntry = async (id: number | string): Promise<JournalEntry> => {
  const { data } = await api.get(`/journals/${id}`);
  return data;
};

export const createJournalEntry = async (payload: CreateJournalPayload): Promise<JournalEntry> => {
  const { data } = await api.post('/journals', payload);
  return data;
};

export const deleteJournalEntry = async (id: number | string): Promise<{ message: string }> => {
  const { data } = await api.delete(`/journals/${id}`);
  return data;
};
