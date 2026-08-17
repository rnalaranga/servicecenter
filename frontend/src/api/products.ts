import { api } from './client';

export interface ProductCategory {
  id: number;
  name: string;
}

export interface ProductUnit {
  id: number;
  name: string;
  symbol: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  categoryId: number | null;
  unitId: number | null;
  purchaseCost: number;
  sellingPrice: number;
  minStock: number;
  isActive: boolean;
  currentStock?: number; // Fetched from stockLevels
  category?: ProductCategory;
  unit?: ProductUnit;
}

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get('/products');
  return data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const { data } = await api.get(`/products/${id}`);
  return data;
};

export const createProduct = async (product: Partial<Product>) => {
  const { data } = await api.post('/products', product);
  return data;
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  const { data } = await api.put(`/products/${id}`, product);
  return data;
};

export const getProductCategories = async (): Promise<ProductCategory[]> => {
  const { data } = await api.get('/products/categories');
  return data;
};

export const getProductUnits = async (): Promise<ProductUnit[]> => {
  const { data } = await api.get('/products/units');
  return data;
};
