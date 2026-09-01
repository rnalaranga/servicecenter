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
  purchaseCost: number | string;
  sellingPrice: number | string;
  minStock: number | string;
  isActive: boolean;
  currentStock?: number; // Fetched from stockLevels
  avgCost?: number | string;
  reorderLevel?: number | string;
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

export const deleteProductCategory = async (id: number) => {
  await api.delete(`/products/categories/${id}`);
};

export const createProductCategory = async (data: { name: string }) => {
  const res = await api.post('/products/categories', data);
  return res.data;
};

export const updateProductCategory = async (id: number, data: { name: string }) => {
  const res = await api.put(`/products/categories/${id}`, data);
  return res.data;
};
