import { api } from './client';

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  expenseNumber: string;
  date: string;
  categoryId?: number | null;
  description: string;
  amount: number | string;
  method: string;
  payee?: string | null;
  reference?: string | null;
  status: string;
  notes?: string | null;
  category?: ExpenseCategory | null;
}

export const getExpenses = async (): Promise<Expense[]> => {
  const { data } = await api.get('/expenses');
  return data;
};

export const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const { data } = await api.get('/expenses/categories');
  return data;
};

export const createExpenseCategory = async (payload: { name: string }): Promise<ExpenseCategory> => {
  const { data } = await api.post('/expenses/categories', payload);
  return data;
};

export const createExpense = async (payload: Partial<Expense>): Promise<Expense> => {
  const { data } = await api.post('/expenses', payload);
  return data;
};
