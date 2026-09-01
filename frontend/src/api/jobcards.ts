import { api } from './client';
import type { Customer } from './customers';
import type { Vehicle } from './vehicles';

export interface Service {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sellingPrice: number;
  estimatedCost: number;
  estimatedDuration: number | null;
  categoryId: number | null;
  isActive: boolean;
}

export interface JobCardService {
  id: number;
  jobCardId: number;
  serviceId: number;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  estimatedCost: number;
  sortOrder: number;
  service?: Service;
}

export interface JobCard {
  id: number;
  jobNumber: string;
  customerId: number;
  vehicleId: number;
  date: string;
  expectedCompletion: string | null;
  odometer: number | null;
  complaint: string | null;
  inspectionNotes: string | null;
  internalNotes: string | null;
  customerNotes: string | null;
  technicianId: number | null;
  priority: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  totalCost: number;
  completedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  customer?: Customer;
  vehicle?: Vehicle;
  services?: JobCardService[];
  invoices?: any[];
  purchases?: any[];
}

export const getJobCards = async (vehicleId?: string): Promise<JobCard[]> => {
  const url = vehicleId ? `/job-cards?vehicleId=${vehicleId}` : '/job-cards';
  const { data } = await api.get(url);
  return data;
};

export const getJobCardById = async (id: string): Promise<JobCard> => {
  const { data } = await api.get(`/job-cards/${id}`);
  return data;
};

export const createJobCard = async (jobCard: Partial<JobCard>) => {
  const { data } = await api.post('/job-cards', jobCard);
  return data;
};

export const updateJobCard = async (id: string, jobCard: Partial<JobCard>) => {
  const { data } = await api.put(`/job-cards/${id}`, jobCard);
  return data;
};

export const addServiceToJobCard = async (id: string, serviceId: string, quantity: number = 1) => {
  const { data } = await api.post(`/job-cards/${id}/services`, { serviceId, quantity });
  return data;
};

export const removeServiceFromJobCard = async (id: string, jobCardServiceId: string) => {
  await api.delete(`/job-cards/${id}/services/${jobCardServiceId}`);
};

export const getServices = async (): Promise<Service[]> => {
  const { data } = await api.get('/services');
  return data;
};
