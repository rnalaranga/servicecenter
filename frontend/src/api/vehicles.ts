import { api } from './client';

export interface Vehicle {
  id: number;
  customerId: number;
  code: string;
  registration: string;
  make: string;
  model: string;
  variant: string | null;
  year: number | null;
  colour: string | null;
  fuelType: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC' | 'OTHER' | null;
  transmission: 'MANUAL' | 'AUTOMATIC' | 'CVT' | 'OTHER' | null;
  engineNumber: string | null;
  vin: string | null;
  mileage: number | null;
  notes: string | null;
  isActive: boolean;
  
  // Enriched fields
  customerName?: string;
  jobCount?: number;
  lastService?: string;
}

export const getVehicles = async (): Promise<Vehicle[]> => {
  const { data } = await api.get('/vehicles');
  return data;
};

export const getVehicleById = async (id: string): Promise<Vehicle> => {
  const { data } = await api.get(`/vehicles/${id}`);
  return data;
};

export const getVehiclesByCustomerId = async (customerId: string): Promise<Vehicle[]> => {
  const { data } = await api.get(`/vehicles/customer/${customerId}`);
  return data;
};

export const createVehicle = async (vehicle: Omit<Vehicle, 'id' | 'code' | 'customerName' | 'jobCount' | 'lastService'>) => {
  const { data } = await api.post('/vehicles', vehicle);
  return data;
};

export const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
  const { data } = await api.put(`/vehicles/${id}`, vehicle);
  return data;
};
