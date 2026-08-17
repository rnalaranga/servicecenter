import { api } from './client';

export interface ServiceCategory {
  id: number;
  name: string;
}

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
  category?: ServiceCategory;
}

export const getServices = async (): Promise<Service[]> => {
  const { data } = await api.get('/services');
  return data;
};

export const getServiceById = async (id: string): Promise<Service> => {
  const { data } = await api.get(`/services/${id}`);
  return data;
};

export const createService = async (service: Partial<Service>) => {
  const { data } = await api.post('/services', service);
  return data;
};

export const updateService = async (id: string, service: Partial<Service>) => {
  const { data } = await api.put(`/services/${id}`, service);
  return data;
};

export const getServiceCategories = async (): Promise<ServiceCategory[]> => {
  const { data } = await api.get('/services/categories');
  return data;
};
