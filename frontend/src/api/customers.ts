import { api } from './client';

export interface Customer {
  id: number;
  code: string;
  name: string;
  companyName: string | null;
  mobile: string;
  secondaryMobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  nicTaxId: string | null;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  creditLimit: number;
  openingBalance: number;
  notes: string | null;
  isActive: boolean;
  
  // Enriched fields
  vehicles?: any;
  jobCards?: any[];
  invoices?: any[];
  payments?: any[];
  ledger?: any[];
  outstanding?: number;
  totalSales?: number;
  totalPaid?: number;
  lastVisit?: string;
  createdAt?: string;
}

export const getCustomers = async (): Promise<Customer[]> => {
  const { data } = await api.get('/customers');
  return data;
};

export const getCustomerById = async (id: string): Promise<Customer> => {
  const { data } = await api.get(`/customers/${id}`);
  return data;
};

export const createCustomer = async (customer: Omit<Customer, 'id' | 'code' | 'vehicles' | 'outstanding' | 'totalSales' | 'totalPaid'>) => {
  const { data } = await api.post('/customers', customer);
  return data;
};

export const updateCustomer = async (id: string, customer: Partial<Customer>) => {
  const { data } = await api.put(`/customers/${id}`, customer);
  return data;
};

export const deleteCustomer = async (id: string | number): Promise<{ message: string }> => {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
};
